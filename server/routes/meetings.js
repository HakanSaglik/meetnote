import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db, { initDatabase } from '../database/init.js';
import { format } from 'date-fns';

const router = express.Router();

// Initialize database on first import
initDatabase().catch(console.error);

// GET /api/meetings - Get all meetings
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', tags = '' } = req.query;
    const offset = (page - 1) * limit;

    await db.read();
    let meetings = db.data.meetings || [];

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      meetings = meetings.filter(meeting => 
        meeting.topic.toLowerCase().includes(searchLower) ||
        meeting.decision.toLowerCase().includes(searchLower) ||
        (meeting.notes && meeting.notes.toLowerCase().includes(searchLower))
      );
    }

    // Apply tags filter
    if (tags) {
      const tagsLower = tags.toLowerCase();
      meetings = meetings.filter(meeting => 
        meeting.tags && meeting.tags.toLowerCase().includes(tagsLower)
      );
    }

    // Sort by date descending
    meetings.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Add revision info
    const meetingsWithRevisions = meetings.map(meeting => {
      const revisedFrom = meeting.revised_from_id ? 
        meetings.find(m => m.id === meeting.revised_from_id) : null;
      
      return {
        ...meeting,
        revised_from_topic: revisedFrom?.topic || null,
        revised_from_date: revisedFrom?.date || null
      };
    });

    // Apply pagination
    const total = meetingsWithRevisions.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedMeetings = meetingsWithRevisions.slice(offset, offset + parseInt(limit));

    res.json({
      meetings: paginatedMeetings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages
      }
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

// GET /api/meetings/:id - Get single meeting
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await db.read();
    const meetings = db.data.meetings || [];
    
    const meeting = meetings.find(m => m.uuid === id || m.id.toString() === id);

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Get revision info
    const revisedFrom = meeting.revised_from_id ? 
      meetings.find(m => m.id === meeting.revised_from_id) : null;
    
    // Get revisions of this meeting
    const revisions = meetings.filter(m => m.revised_from_id === meeting.id);

    const meetingWithRevisions = {
      ...meeting,
      revised_from_topic: revisedFrom?.topic || null,
      revised_from_date: revisedFrom?.date || null,
      revisions: revisions.map(r => ({
        uuid: r.uuid,
        date: r.date,
        topic: r.topic,
        decision: r.decision,
        notes: r.notes,
        tags: r.tags,
        created_at: r.created_at
      }))
    };

    res.json(meetingWithRevisions);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch meeting' });
  }
});

// POST /api/meetings - Create new meeting
router.post('/', async (req, res) => {
  try {
    const { date, topic, decision, notes, tags, revised_from_id, images, documents, links } = req.body;

    if (!date || !topic || !decision) {
      return res.status(400).json({ 
        error: 'Date, topic, and decision are required' 
      });
    }

    await db.read();
    const meetings = db.data.meetings || [];
    
    // Get next ID
    const nextId = meetings.length > 0 ? Math.max(...meetings.map(m => m.id)) + 1 : 1;

    const newMeeting = {
      id: nextId,
      uuid: uuidv4(),
      date,
      topic,
      decision,
      notes: notes || '',
      tags: tags || '',
      images: images || [],
      documents: documents || [],
      links: links || [],
      revised_from_id: revised_from_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      task_analyzed: false
    };

    db.data.meetings.push(newMeeting);
    await db.write();

    // Trigger automatic task analysis for the new meeting
    try {
      console.log(`🔄 Triggering automatic task analysis for new meeting: ${newMeeting.topic}`);
      
      // Import AI provider manager and task storage
      const { AIProviderManager } = await import('../services/aiProvider.js');
      const { taskStorage } = await import('./ai.js');
      
      // Prepare meeting with revision info for analysis
      const meetingWithRevisions = {
        ...newMeeting,
        revised_from_topic: null,
        revised_from_date: null,
        revised_from_decision: null
      };
      
      if (newMeeting.revised_from_id) {
        const revisedFrom = meetings.find(m => m.id === newMeeting.revised_from_id);
        if (revisedFrom) {
          meetingWithRevisions.revised_from_topic = revisedFrom.topic;
          meetingWithRevisions.revised_from_date = revisedFrom.date;
          meetingWithRevisions.revised_from_decision = revisedFrom.decision;
        }
      }
      
      // Analyze tasks for this single meeting
      const aiResult = await AIProviderManager.executeWithFallback(
        (provider) => provider.extractImportantTasks([meetingWithRevisions])
      );
      
      if (aiResult && aiResult.tasks && Array.isArray(aiResult.tasks) && aiResult.tasks.length > 0) {
        // Add unique IDs to AI tasks with better uniqueness guarantee
        let taskCounter = 0;
        const tasksWithIds = aiResult.tasks.map(task => {
          if (!task.id) {
            const timestamp = Date.now();
            const randomSuffix = Math.random().toString(36).substr(2, 9);
            const counter = (taskCounter++).toString().padStart(3, '0');
            task.id = `ai-task-${timestamp}-${counter}-${randomSuffix}`;
          }
          return task;
        });
        
        // Mark meeting as analyzed
        const meetingIndex = db.data.meetings.findIndex(m => m.id === newMeeting.id);
        if (meetingIndex !== -1) {
          db.data.meetings[meetingIndex].task_analyzed = true;
          db.data.meetings[meetingIndex].task_analyzed_at = new Date().toISOString();
          await db.write();
        }
        
        // Add new tasks to global taskStorage
        const existingTaskTitles = taskStorage.map(task => task.title);
        const uniqueNewTasks = tasksWithIds.filter(task => !existingTaskTitles.includes(task.title));
        
        // Ensure all unique new tasks have IDs
        uniqueNewTasks.forEach((task, index) => {
          if (!task.id) {
            const timestamp = Date.now();
            const randomSuffix = Math.random().toString(36).substr(2, 9);
            const counter = index.toString().padStart(3, '0');
            task.id = `ai-task-${timestamp}-${counter}-${randomSuffix}`;
          }
        });
        
        taskStorage.push(...uniqueNewTasks);
        
        if (uniqueNewTasks.length > 0) {
          // Load current tasks from file, add new ones, and save back
          const fs = await import('fs');
          const path = await import('path');
          const { fileURLToPath } = await import('url');
          const __filename = fileURLToPath(import.meta.url);
          const __dirname = path.dirname(__filename);
          const tasksFilePath = path.join(__dirname, '../database/tasks.json');
          
          try {
            // Load current tasks from file
            let currentTasks = [];
            if (fs.existsSync(tasksFilePath)) {
              const tasksData = fs.readFileSync(tasksFilePath, 'utf8');
              currentTasks = JSON.parse(tasksData);
            }
            
            // Add new tasks to current tasks
            currentTasks.push(...uniqueNewTasks);
            
            // Save updated tasks back to file
            fs.writeFileSync(tasksFilePath, JSON.stringify(currentTasks, null, 2));
            console.log(`📝 Added ${uniqueNewTasks.length} new tasks to file storage. Total: ${currentTasks.length}`);
            console.log('💾 Tasks saved to file successfully');
          } catch (saveError) {
            console.error('❌ Error saving tasks to file:', saveError);
          }
        }
        
        console.log(`✅ Automatic task analysis completed for meeting: ${newMeeting.topic}. Found ${aiResult.tasks.length} tasks, added ${uniqueNewTasks.length} new tasks.`);
      }
    } catch (analysisError) {
      console.warn('⚠️ Automatic task analysis failed for new meeting:', analysisError.message);
      // Don't fail the meeting creation if task analysis fails
    }

    res.status(201).json(newMeeting);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to create meeting' });
  }
});

// PUT /api/meetings/:id - Update meeting
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, topic, decision, notes, tags, images, documents, links } = req.body;

    if (!date || !topic || !decision) {
      return res.status(400).json({ 
        error: 'Date, topic, and decision are required' 
      });
    }

    await db.read();
    const meetings = db.data.meetings || [];
    
    const meetingIndex = meetings.findIndex(m => m.uuid === id || m.id.toString() === id);

    if (meetingIndex === -1) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Update meeting
    db.data.meetings[meetingIndex] = {
      ...db.data.meetings[meetingIndex],
      date,
      topic,
      decision,
      notes: notes || '',
      tags: tags || '',
      images: images || [],
      documents: documents || [],
      links: links || [],
      updated_at: new Date().toISOString()
    };

    await db.write();

    res.json(db.data.meetings[meetingIndex]);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to update meeting' });
  }
});

// DELETE /api/meetings/:id - Delete meeting
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await db.read();
    const meetings = db.data.meetings || [];
    
    const meetingIndex = meetings.findIndex(m => m.uuid === id || m.id.toString() === id);

    if (meetingIndex === -1) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const meetingToDelete = meetings[meetingIndex];
    console.log(`🗑️ Deleting meeting: ${meetingToDelete.topic} (ID: ${meetingToDelete.id})`);

    // Remove meeting
    db.data.meetings.splice(meetingIndex, 1);
    await db.write();

    // Remove related tasks from task storage
    try {
      // Import cleanup function from ai.js route
      const { cleanupTasksForDeletedMeeting } = await import('./ai.js');
      
      // Clean up tasks related to the deleted meeting
      const cleanupResult = cleanupTasksForDeletedMeeting(meetingToDelete);
      
      if (cleanupResult.success) {
        console.log(`✅ Successfully cleaned up ${cleanupResult.removedTasks} active tasks and ${cleanupResult.removedCompletedTasks} completed tasks`);
      } else {
        console.warn('⚠️ Task cleanup partially failed:', cleanupResult.error);
      }
      
    } catch (cleanupError) {
      console.warn('⚠️ Task cleanup failed for deleted meeting:', cleanupError.message);
      // Don't fail the meeting deletion if task cleanup fails
    }

    res.json({ 
      message: 'Meeting deleted successfully',
      deletedMeeting: {
        id: meetingToDelete.id,
        topic: meetingToDelete.topic,
        date: meetingToDelete.date
      }
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to delete meeting' });
  }
});

// GET /api/meetings/compare/:topic - Compare meetings by topic
router.get('/compare/:topic', async (req, res) => {
  try {
    const { topic } = req.params;

    await db.read();
    const meetings = db.data.meetings || [];
    
    const relatedMeetings = meetings.filter(meeting => 
      meeting.topic.toLowerCase().includes(topic.toLowerCase())
    );

    res.json(relatedMeetings);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to compare meetings' });
  }
});

export default router;