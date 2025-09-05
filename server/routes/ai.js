import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../database/init.js';
import { AIProviderManager } from '../services/aiProvider.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Task storage file paths
const tasksFilePath = path.join(__dirname, '../database/tasks.json');
const completedTasksFilePath = path.join(__dirname, '../database/completed_tasks.json');

// Initialize task storage
let taskStorage = [];
let completedTasks = [];

// Load tasks from files
function loadTasks() {
  try {
    if (fs.existsSync(tasksFilePath)) {
      const tasksData = fs.readFileSync(tasksFilePath, 'utf8');
      taskStorage = JSON.parse(tasksData);
      
      // Ensure all tasks have IDs
      let hasChanges = false;
      taskStorage = taskStorage.map((task, index) => {
        if (!task.id) {
          hasChanges = true;
          const newId = `fallback-${index}-${Date.now()}`;
          console.log(`🔧 Adding missing ID to task: "${task.title}" -> ${newId}`);
          return { ...task, id: newId };
        }
        return task;
      });
      
      // Save back to file if we added any IDs
      if (hasChanges) {
        saveTasks();
        console.log('💾 Updated tasks.json with missing IDs');
      }
    }
  } catch (error) {
    console.error('Error loading tasks:', error);
    taskStorage = [];
  }
}

function loadCompletedTasks() {
  try {
    if (fs.existsSync(completedTasksFilePath)) {
      const completedData = fs.readFileSync(completedTasksFilePath, 'utf8');
      completedTasks = JSON.parse(completedData);
    }
  } catch (error) {
    console.error('Error loading completed tasks:', error);
    completedTasks = [];
  }
}

// Save tasks to files
function saveTasks() {
  try {
    fs.writeFileSync(tasksFilePath, JSON.stringify(taskStorage, null, 2));
  } catch (error) {
    console.error('Error saving tasks:', error);
  }
}

function saveCompletedTasks() {
  try {
    fs.writeFileSync(completedTasksFilePath, JSON.stringify(completedTasks, null, 2));
  } catch (error) {
    console.error('Error saving completed tasks:', error);
  }
}

// Load tasks on startup
loadTasks();
loadCompletedTasks();

// POST /api/ai/ask - Ask question to AI
router.post('/ask', async (req, res) => {
  try {
    const { question, provider } = req.body;

    if (!question || question.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Question is required' 
      });
    }

    // Check if any AI provider has API keys configured
    const hasAnyApiKeys = ['gemini', 'openai', 'claude'].some(providerName => 
      AIProviderManager.hasValidApiKeys(providerName)
    );

    if (!hasAnyApiKeys) {
      return res.status(400).json({ 
        error: 'AI servisi kullanmak için önce ayarlar sayfasından API anahtarı eklemeniz gerekiyor.',
        needsApiKey: true
      });
    }

    // Get all meetings for context
    await db.read();
    const allMeetings = db.data.meetings || [];
    
    const meetings = allMeetings.map(meeting => {
      const revisedFrom = meeting.revised_from_id ? 
        allMeetings.find(m => m.id === meeting.revised_from_id) : null;
      
      return {
        ...meeting,
        revised_from_topic: revisedFrom?.topic || null,
        revised_from_date: revisedFrom?.date || null,
        revised_from_decision: revisedFrom?.decision || null
      };
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    if (meetings.length === 0) {
      return res.json({
        answer: 'Henüz hiç toplantı kaydı bulunmuyor. Lütfen önce bazı toplantı notları ekleyin.',
        relatedMeetings: [],
        hasRevisions: false
      });
    }

    // Use AI to analyze and answer with fallback
    const response = await AIProviderManager.executeWithFallback(
      async (provider) => await provider.askQuestion(question, meetings),
      provider
    );

    res.json(response);

  } catch (error) {
    console.error('AI ask error:', error);
    
    // Provide helpful error messages based on error type
    let errorMessage = 'AI servisi şu anda kullanılamıyor.';
    
    if (error.message.includes('API key')) {
      errorMessage = 'AI API anahtarı yapılandırılmamış. Lütfen .env dosyasını kontrol edin.';
    } else if (error.message.includes('quota') || error.message.includes('limit')) {
      errorMessage = 'AI servis limiti aşıldı. Lütfen daha sonra tekrar deneyin.';
    } else if (error.message.includes('network') || error.message.includes('timeout')) {
      errorMessage = 'AI servisine bağlanılamıyor. İnternet bağlantınızı kontrol edin.';
    }

    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/ai/providers - Get available AI providers
router.get('/providers', (req, res) => {
  const providers = AIProviderManager.getAvailableProviders();
  const defaultProvider = process.env.DEFAULT_AI_PROVIDER || 'gemini';

  res.json({
    providers,
    default: defaultProvider,
    configured: providers.filter(p => p.configured)
  });
});

// POST /api/ai/analyze - Analyze meeting notes for important tasks
router.post('/analyze', async (req, res) => {
  try {
    const { meetingId, provider } = req.body;

    if (!meetingId) {
      return res.status(400).json({ 
        error: 'Meeting ID is required' 
      });
    }

    // Check if any AI provider has API keys configured
    const hasAnyApiKeys = ['gemini', 'openai', 'claude'].some(providerName => 
      AIProviderManager.hasValidApiKeys(providerName)
    );

    if (!hasAnyApiKeys) {
      return res.status(400).json({ 
        error: 'AI servisi kullanmak için önce ayarlar sayfasından API anahtarı eklemeniz gerekiyor.',
        needsApiKey: true
      });
    }

    // Get the specific meeting
    await db.read();
    const meeting = db.data.meetings?.find(m => m.uuid === meetingId);
    
    if (!meeting) {
      return res.status(404).json({ 
        error: 'Meeting not found' 
      });
    }

    // Use AI to analyze the meeting with fallback
    console.log(`🔍 Starting AI analysis for meeting: ${meeting.topic}`);
    const analysis = await AIProviderManager.executeWithFallback(
      async (provider) => {
        console.log(`📡 Using provider: ${provider.constructor.name}`);
        const result = await provider.analyzeMeeting(meeting);
        console.log(`✅ Analysis completed. Tasks found: ${result?.tasks?.length || 0}`);
        console.log(`📋 Analysis result:`, JSON.stringify(result, null, 2));
        return result;
      },
      provider
    );

    // If tasks were found, add them to taskStorage
    if (analysis && analysis.tasks && Array.isArray(analysis.tasks) && analysis.tasks.length > 0) {
      console.log(`🔄 Adding ${analysis.tasks.length} new tasks from meeting analysis to task storage`);
      
      // Add unique IDs to tasks if they don't have them
      const tasksWithIds = analysis.tasks.map((task, index) => {
        if (!task.id) {
          const timestamp = Date.now();
          const randomSuffix = Math.random().toString(36).substr(2, 9);
          const counter = index.toString().padStart(3, '0');
          task.id = `analyze-${timestamp}-${counter}-${randomSuffix}`;
        }
        
        // Add meeting context to task
        return {
          ...task,
          meetingDate: meeting.date,
          meetingTopic: meeting.topic,
          source: 'ai-analysis',
          createdAt: new Date().toISOString()
        };
      });
      
      // Add new tasks to taskStorage (avoid duplicates by checking existing IDs)
      const existingTaskIds = taskStorage.map(t => t.id);
      const newTasks = tasksWithIds.filter(task => !existingTaskIds.includes(task.id));
      
      if (newTasks.length > 0) {
        taskStorage.push(...newTasks);
        saveTasks();
        console.log(`✅ Successfully added ${newTasks.length} new tasks to storage`);
        
        // Update analysis response to include the actual added tasks
        analysis.addedToTaskList = true;
        analysis.addedTasksCount = newTasks.length;
      } else {
        console.log('ℹ️ No new tasks to add (all tasks already exist)');
        analysis.addedToTaskList = false;
        analysis.addedTasksCount = 0;
      }
    } else {
      console.log('ℹ️ No tasks found in analysis result');
      analysis.addedToTaskList = false;
      analysis.addedTasksCount = 0;
    }

    res.json(analysis);

  } catch (error) {
    console.error('AI analyze error:', error);
    
    let errorMessage = 'AI analizi şu anda kullanılamıyor.';
    
    if (error.message.includes('API key')) {
      errorMessage = 'AI API anahtarı yapılandırılmamış. Lütfen .env dosyasını kontrol edin.';
    } else if (error.message.includes('quota') || error.message.includes('limit')) {
      errorMessage = 'AI servis limiti aşıldı. Lütfen daha sonra tekrar deneyin.';
    } else if (error.message.includes('network') || error.message.includes('timeout')) {
      errorMessage = 'AI servisine bağlanılamıyor. İnternet bağlantınızı kontrol edin.';
    }

    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/ai/important-tasks - Get all important tasks from meetings
router.get('/important-tasks', async (req, res) => {
  try {
    const { provider } = req.query;

    // Check if any AI provider has API keys configured
    const hasAnyApiKeys = ['gemini', 'openai', 'claude'].some(providerName => 
      AIProviderManager.hasValidApiKeys(providerName)
    );

    if (!hasAnyApiKeys) {
      return res.status(400).json({ 
        error: 'AI servisi kullanmak için önce ayarlar sayfasından API anahtarı eklemeniz gerekiyor.',
        needsApiKey: true
      });
    }

    // Get all meetings
    await db.read();
    const allMeetings = db.data.meetings || [];
    
    if (allMeetings.length === 0) {
      return res.json({
        tasks: [],
        totalMeetings: 0,
        summary: 'Henüz hiç toplantı kaydı bulunmuyor.',
        analyzedAt: new Date().toISOString()
      });
    }

    // Filter out meetings that have already been analyzed for tasks
    // Only analyze meetings that don't have the 'task_analyzed' flag or it's false
    const unanalyzedMeetings = allMeetings.filter(meeting => !meeting.task_analyzed);
    
    console.log(`📊 Total meetings: ${allMeetings.length}, Unanalyzed: ${unanalyzedMeetings.length}`);
    
    // If taskStorage is empty, analyze ALL meetings to populate it initially
    // If taskStorage has content but there are unanalyzed meetings, analyze only new ones
    // If no unanalyzed meetings and taskStorage has content, return existing tasks
    
    let meetingsToAnalyze;
    let isInitialLoad = false;
    
    if (taskStorage.length === 0) {
      // Initial load: analyze all meetings to populate taskStorage
      meetingsToAnalyze = allMeetings;
      isInitialLoad = true;
      console.log('🔄 Initial load: analyzing all meetings to populate task storage');
    } else if (unanalyzedMeetings.length > 0) {
      // There are new meetings to analyze
      meetingsToAnalyze = unanalyzedMeetings;
      console.log(`🆕 Analyzing ${unanalyzedMeetings.length} new meetings`);
    } else {
      // No new meetings, return existing tasks (filter out completed ones)
      console.log('✅ All meetings already analyzed, returning existing tasks');
      const completedTaskIds = completedTasks.map(task => task.id);
      const activeTasks = taskStorage.filter(task => !completedTaskIds.includes(task.id));
      
      return res.json({
        tasks: activeTasks,
        totalMeetings: allMeetings.length,
        summary: `Tüm ${allMeetings.length} toplantı zaten analiz edilmiş. Mevcut ${activeTasks.length} aktif görev döndürülüyor.`,
        analyzedAt: new Date().toISOString(),
        method: 'cached'
      });
    }
    
    // Add revision info to meetings to analyze
    const meetingsWithRevisions = meetingsToAnalyze.map(meeting => {
      const revisedFrom = meeting.revised_from_id ? 
        allMeetings.find(m => m.id === meeting.revised_from_id) : null;
      
      return {
        ...meeting,
        revised_from_topic: revisedFrom?.topic || null,
        revised_from_date: revisedFrom?.date || null,
        revised_from_decision: revisedFrom?.decision || null
      };
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
    
    console.log('🔍 Analyzing meetings:', meetingsWithRevisions.map(m => ({ id: m.id, topic: m.topic, date: m.date })));

    // Try AI-powered task extraction first
    let aiTasks = [];
    try {
      console.log('🤖 Attempting AI-powered task extraction...');
      const aiResult = await AIProviderManager.executeWithFallback(
        (provider) => provider.extractImportantTasks(meetingsWithRevisions),
        provider
      );
      
      if (aiResult && aiResult.tasks && Array.isArray(aiResult.tasks)) {
        // Add unique IDs to AI tasks with better uniqueness guarantee
        let taskCounter = 0;
        aiTasks = aiResult.tasks.map(task => {
          if (!task.id) {
            const timestamp = Date.now();
            const randomSuffix = Math.random().toString(36).substr(2, 9);
            const counter = (taskCounter++).toString().padStart(3, '0');
            task.id = `ai-task-${timestamp}-${counter}-${randomSuffix}`;
          }
          return task;
        });
        console.log(`✅ AI extracted ${aiTasks.length} tasks successfully`);
        
        // Return AI results if successful
        const finalResult = {
          tasks: aiTasks.slice(0, 8), // Limit to top 8
          totalMeetings: meetingsWithRevisions.length,
          summary: `AI analizi ile ${meetingsWithRevisions.length} toplantıdan ${aiTasks.length} kritik görev çıkarıldı.`,
          analyzedAt: new Date().toISOString(),
          method: 'ai'
        };
        
        // Mark analyzed meetings as task_analyzed (only if not initial load)
        if (!isInitialLoad) {
          const analyzedMeetingIds = meetingsWithRevisions.map(m => m.id);
          for (const meetingId of analyzedMeetingIds) {
            const meetingIndex = db.data.meetings.findIndex(m => m.id === meetingId);
            if (meetingIndex !== -1) {
              db.data.meetings[meetingIndex].task_analyzed = true;
              db.data.meetings[meetingIndex].task_analyzed_at = new Date().toISOString();
            }
          }
          await db.write();
          console.log(`✅ Marked ${analyzedMeetingIds.length} meetings as analyzed`);
        } else {
          // Mark ALL meetings as analyzed on initial load
          for (const meeting of allMeetings) {
            const meetingIndex = db.data.meetings.findIndex(m => m.id === meeting.id);
            if (meetingIndex !== -1) {
              db.data.meetings[meetingIndex].task_analyzed = true;
              db.data.meetings[meetingIndex].task_analyzed_at = new Date().toISOString();
            }
          }
          await db.write();
          console.log(`✅ Initial load: Marked all ${allMeetings.length} meetings as analyzed`);
        }
        
        // Update taskStorage based on load type
        const newTasks = finalResult.tasks;
        
        if (isInitialLoad) {
          // Initial load: replace taskStorage with all tasks
          taskStorage.length = 0; // Clear existing
          taskStorage.push(...newTasks);
          console.log(`📝 Initial load: Added ${newTasks.length} tasks to storage`);
          // Save to file
          saveTasks();
        } else {
          // Add only new unique tasks
          const existingTaskTitles = taskStorage.map(task => task.title);
          const uniqueNewTasks = newTasks.filter(task => !existingTaskTitles.includes(task.title));
          
          if (uniqueNewTasks.length > 0) {
            taskStorage.push(...uniqueNewTasks);
            console.log(`📝 Added ${uniqueNewTasks.length} new tasks to storage. Total: ${taskStorage.length}`);
            // Save to file
            saveTasks();
          }
        }
        
        // Filter out completed tasks before returning
        const completedTaskIds = completedTasks.map(task => task.id);
        const activeTasks = taskStorage.filter(task => !completedTaskIds.includes(task.id));
        
        // Return current taskStorage with only active tasks
        const currentResult = {
          tasks: activeTasks,
          totalMeetings: allMeetings.length,
          summary: isInitialLoad ? 
            `AI analizi ile ${allMeetings.length} toplantıdan ${activeTasks.length} görev çıkarıldı.` :
            `AI analizi ile ${meetingsWithRevisions.length} yeni toplantıdan ${newTasks.length} yeni görev eklendi. Toplam ${activeTasks.length} aktif görev.`,
          analyzedAt: new Date().toISOString(),
          method: 'ai'
        };
        
        return res.json(currentResult);
      }
    } catch (aiError) {
      console.warn('⚠️ AI task extraction failed, falling back to text analysis:', aiError.message);
    }

    // Enhanced text analysis for important tasks (fallback method)
    console.log('📝 Using enhanced text analysis for task extraction...');
    const allTasks = [];
    
    meetingsWithRevisions.forEach((meeting, meetingIndex) => {
      console.log(`\n🔍 === Analyzing Meeting ${meetingIndex}: ${meeting.topic} ===`);
      console.log('📋 Decision text:', meeting.decision);
      console.log('📅 Meeting date:', meeting.date);
      
      // Split decisions into sentences and analyze each
      const sentences = meeting.decision.split(/[.!?\n]/).filter(sentence => sentence.trim().length > 15);
      console.log(`Found ${sentences.length} sentences to analyze:`);
      sentences.forEach((s, i) => console.log(`  ${i}: ${s.trim()}`));
      
      // Track tasks for this meeting
      const meetingTasks = [];
      
      sentences.forEach((sentence, taskIndex) => {
        const cleanSentence = sentence.trim();
        if (cleanSentence.length < 15) return; // Reduced minimum length
        
        // Enhanced keyword analysis for truly important tasks
        const urgentKeywords = ['acil', 'hemen', 'en kısa', 'derhal', 'ivedi', 'mutlaka', 'şart'];
        const importantKeywords = ['önemli', 'kritik', 'gerekli', 'zorunlu', 'lazım'];
        const actionKeywords = ['yapılacak', 'tamamlanacak', 'hazırlanacak', 'düzenlenecek', 'organize edilecek', 'planlanacak'];
        const deadlineKeywords = ['tarihine kadar', 'son tarih', 'deadline', 'bitiş', 'teslim'];
        const responsibilityKeywords = ['sorumlu', 'görevli', 'atanmış', 'yetkilendirilmiş'];
        const assignmentKeywords = ['dağılım', 'atama', 'görevlendirme', 'planlama', 'düzenleme'];
        const teacherKeywords = ['hoca', 'öğretmen', 'girecek', 'olacak', 'çalıştıracak'];
        const routineKeywords = ['ders', 'sınıf', 'müfredat', 'eğitim', 'kurs'];
        
        const lowerSentence = cleanSentence.toLowerCase();
        
        // Calculate importance score with more balanced weighting
        let importanceScore = 1; // Base score
        let foundKeywords = [];
        
        // Check for urgent keywords (highest priority)
        const foundUrgent = urgentKeywords.filter(keyword => lowerSentence.includes(keyword));
        if (foundUrgent.length > 0) {
          importanceScore += foundUrgent.length * 4;
          foundKeywords.push(...foundUrgent.map(k => `urgent:${k}`));
        }
        
        // Check for deadline keywords (high priority)
        const foundDeadline = deadlineKeywords.filter(keyword => lowerSentence.includes(keyword));
        if (foundDeadline.length > 0) {
          importanceScore += foundDeadline.length * 3;
          foundKeywords.push(...foundDeadline.map(k => `deadline:${k}`));
        }
        
        // Check for important keywords (medium-high priority)
        const foundImportant = importantKeywords.filter(keyword => lowerSentence.includes(keyword));
        if (foundImportant.length > 0) {
          importanceScore += foundImportant.length * 2;
          foundKeywords.push(...foundImportant.map(k => `important:${k}`));
        }
        
        // Check for responsibility assignment (medium priority)
        const foundResponsibility = responsibilityKeywords.filter(keyword => lowerSentence.includes(keyword));
        if (foundResponsibility.length > 0) {
          importanceScore += foundResponsibility.length * 2;
          foundKeywords.push(...foundResponsibility.map(k => `responsibility:${k}`));
        }
        
        // Check for assignment keywords (medium priority)
        const foundAssignment = assignmentKeywords.filter(keyword => lowerSentence.includes(keyword));
        if (foundAssignment.length > 0) {
          importanceScore += foundAssignment.length * 2;
          foundKeywords.push(...foundAssignment.map(k => `assignment:${k}`));
        }
        
        // Check for action keywords (lower priority)
        const foundAction = actionKeywords.filter(keyword => lowerSentence.includes(keyword));
        if (foundAction.length > 0) {
          importanceScore += foundAction.length * 1;
          foundKeywords.push(...foundAction.map(k => `action:${k}`));
        }
        
        // Check for teacher assignments (lower priority for routine tasks)
        const foundTeacher = teacherKeywords.filter(keyword => lowerSentence.includes(keyword));
        if (foundTeacher.length > 0) {
          importanceScore += foundTeacher.length * 1;
          foundKeywords.push(...foundTeacher.map(k => `teacher:${k}`));
        }
        
        // Reduce score for routine educational tasks
        const foundRoutine = routineKeywords.filter(keyword => lowerSentence.includes(keyword));
        if (foundRoutine.length > 0 && 
            !urgentKeywords.some(keyword => lowerSentence.includes(keyword)) &&
            !deadlineKeywords.some(keyword => lowerSentence.includes(keyword))) {
          importanceScore = Math.max(0, importanceScore - 1);
          foundKeywords.push(...foundRoutine.map(k => `routine:${k}`));
        }
        
        // Check for specific patterns that indicate tasks
        const taskPatterns = [
          /\d+[-.]\s*[A-Za-zÇĞıİÖŞÜçğıöşü]/, // Numbered items
          /[A-Za-zÇĞıİÖŞÜçğıöşü]+\s+(hoca|öğretmen|müdür|sorumlu)/, // Person assignments
          /\b(eğitim|kurs|toplantı|sınav|proje)\b.*\b(düzenle|organize|hazırla|yap)\b/, // Educational tasks
          /\b(rapor|belge|form|liste)\b.*\b(hazırla|teslim|gönder)\b/, // Document tasks
          /\b(müfredat|ders|sınıf)\b.*\b(hoca|öğretmen)\b/, // Curriculum assignments
          /\b(girecek|olacak|çalıştıracak)\b/, // Action verbs
          /\b(TYT|AYT|sınav)\b.*\b(ders|saat)\b/ // Exam related tasks
        ];
        
        if (taskPatterns.some(pattern => pattern.test(lowerSentence))) {
          importanceScore += 1;
        }
        
        // Debug logging for all sentences
        console.log(`\n🎯 ========== TASK SCORING DEBUG ==========`);
        console.log(`📝 TASK: "${cleanSentence}"`);
        console.log(`📊 IMPORTANCE SCORE: ${importanceScore}`);
        console.log(`🔍 FOUND KEYWORDS:`);
        console.log(`   - Urgent: [${foundUrgent.join(', ')}] (+${foundUrgent.length * 4})`);
        console.log(`   - Deadline: [${foundDeadline.join(', ')}] (+${foundDeadline.length * 3})`);
        console.log(`   - Important: [${foundImportant.join(', ')}] (+${foundImportant.length * 2})`);
        console.log(`   - Responsibility: [${foundResponsibility.join(', ')}] (+${foundResponsibility.length * 2})`);
        console.log(`   - Assignment: [${foundAssignment.join(', ')}] (+${foundAssignment.length * 2})`);
        console.log(`   - Action: [${foundAction.join(', ')}] (+${foundAction.length * 1})`);
        console.log(`   - Teacher: [${foundTeacher.join(', ')}] (+${foundTeacher.length * 1})`);
        console.log(`   - Routine: [${foundRoutine.join(', ')}] (-${foundRoutine.length > 0 && !urgentKeywords.some(keyword => lowerSentence.includes(keyword)) && !deadlineKeywords.some(keyword => lowerSentence.includes(keyword)) ? 1 : 0})`);
        console.log(`📈 SCORE CALCULATION: 1 + ${foundUrgent.length * 4} + ${foundDeadline.length * 3} + ${foundImportant.length * 2} + ${foundResponsibility.length * 2} + ${foundAssignment.length * 2} + ${foundAction.length * 1} + ${foundTeacher.length * 1} - ${foundRoutine.length > 0 && !urgentKeywords.some(keyword => lowerSentence.includes(keyword)) && !deadlineKeywords.some(keyword => lowerSentence.includes(keyword)) ? 1 : 0} = ${importanceScore}`);
        
        // Only include tasks with sufficient importance score
        if (importanceScore >= 1) {
          const timestamp = Date.now();
          const randomSuffix = Math.random().toString(36).substr(2, 9);
          const counter = (meetingIndex * 1000 + taskIndex).toString().padStart(4, '0');
          const taskId = `task-${timestamp}-${counter}-${randomSuffix}`;
          
          // More balanced priority assignment with stricter thresholds
          let priority, isUrgent;
          if (importanceScore >= 6) {
            priority = 'high';
            isUrgent = true;
          } else if (importanceScore >= 4) {
            priority = 'medium';
            isUrgent = false;
          } else {
            priority = 'low';
            isUrgent = false;
          }
          
          console.log(`🔥 PRIORITY: ${priority}`);
          console.log(`⚡ IS URGENT: ${isUrgent}`);
          console.log(`✅ TASK INCLUDED`);
          
          // Create a more descriptive title
          let title = cleanSentence.substring(0, 60).trim();
          if (cleanSentence.length > 60) title += '...';
          
          // Remove common prefixes from title
          title = title.replace(/^\d+[-.\ s]*/, '').trim();
          
          allTasks.push({
            id: taskId,
            title: title,
            description: cleanSentence,
            priority: priority,
            isUrgent: isUrgent,
            deadline: null,
            category: 'action',
            meetingDate: meeting.date,
            meetingTopic: meeting.topic,
            importanceScore: importanceScore
          });
        } else {
          console.log(`❌ TASK EXCLUDED (Score too low)`);
        }
        console.log(`==========================================\n`);
      });
    });

    // Sort tasks by importance score and priority
    const sortedTasks = allTasks.sort((a, b) => {
      // First sort by importance score
      if (a.importanceScore !== b.importanceScore) {
        return b.importanceScore - a.importanceScore;
      }
      
      // Then by urgency
      if (a.isUrgent && !b.isUrgent) return -1;
      if (!a.isUrgent && b.isUrgent) return 1;
      
      // Then by priority
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority] || 1;
      const bPriority = priorityOrder[b.priority] || 1;
      
      return bPriority - aPriority;
    }).slice(0, 8); // Limit to top 8 most important tasks

    const finalResult = {
      tasks: sortedTasks,
      totalMeetings: meetingsWithRevisions.length,
      summary: `Metin analizi ile ${meetingsWithRevisions.length} toplantıdan ${sortedTasks.length} kritik görev çıkarıldı.`,
      analyzedAt: new Date().toISOString(),
      method: 'text'
    };

    // Mark analyzed meetings as task_analyzed (only if not initial load)
    if (!isInitialLoad) {
      const analyzedMeetingIds = meetingsWithRevisions.map(m => m.id);
      for (const meetingId of analyzedMeetingIds) {
        const meetingIndex = db.data.meetings.findIndex(m => m.id === meetingId);
        if (meetingIndex !== -1) {
          db.data.meetings[meetingIndex].task_analyzed = true;
          db.data.meetings[meetingIndex].task_analyzed_at = new Date().toISOString();
        }
      }
      await db.write();
      console.log(`✅ Marked ${analyzedMeetingIds.length} meetings as analyzed`);
    } else {
      // Mark ALL meetings as analyzed on initial load
      for (const meeting of allMeetings) {
        const meetingIndex = db.data.meetings.findIndex(m => m.id === meeting.id);
        if (meetingIndex !== -1) {
          db.data.meetings[meetingIndex].task_analyzed = true;
          db.data.meetings[meetingIndex].task_analyzed_at = new Date().toISOString();
        }
      }
      await db.write();
      console.log(`✅ Initial load: Marked all ${allMeetings.length} meetings as analyzed`);
    }
    
    // Update taskStorage based on load type
    const newTasks = sortedTasks;
    
    if (isInitialLoad) {
      // Initial load: replace taskStorage with all tasks
      taskStorage.length = 0; // Clear existing
      taskStorage.push(...newTasks);
      console.log(`📝 Initial load: Added ${newTasks.length} tasks to storage`);
      // Save to file
      saveTasks();
    } else {
      // Add only new unique tasks
      const existingTaskTitles = taskStorage.map(task => task.title);
      const uniqueNewTasks = newTasks.filter(task => !existingTaskTitles.includes(task.title));
      
      if (uniqueNewTasks.length > 0) {
        taskStorage.push(...uniqueNewTasks);
        console.log(`📝 Added ${uniqueNewTasks.length} new tasks to storage. Total: ${taskStorage.length}`);
        // Save to file
        saveTasks();
      }
    }
    
    // Filter out completed tasks before returning
    const completedTaskIds = completedTasks.map(task => task.id);
    const activeTasks = taskStorage.filter(task => !completedTaskIds.includes(task.id));
    
    // Return current taskStorage with only active tasks
    const currentResult = {
      tasks: activeTasks,
      totalMeetings: allMeetings.length,
      summary: isInitialLoad ? 
        `Metin analizi ile ${allMeetings.length} toplantıdan ${activeTasks.length} görev çıkarıldı.` :
        `Metin analizi ile ${meetingsWithRevisions.length} yeni toplantıdan ${newTasks.length} yeni görev eklendi. Toplam ${activeTasks.length} aktif görev.`,
      analyzedAt: new Date().toISOString(),
      method: 'text'
    };
    
    console.log('📤 Enhanced analysis result:', JSON.stringify(currentResult, null, 2));

    res.json(currentResult);

  } catch (error) {
    console.error('AI important tasks error:', error);
    
    let errorMessage = 'Önemli görevler analizi şu anda kullanılamıyor.';
    
    if (error.message && error.message.includes('rate limit')) {
      errorMessage = 'API rate limit aşıldı. Lütfen birkaç dakika sonra tekrar deneyin.';
    } else if (error.message && error.message.includes('API key')) {
      errorMessage = 'AI API anahtarı yapılandırılmamış. Lütfen .env dosyasını kontrol edin.';
    }

    res.status(500).json({ 
      error: errorMessage,
      tasks: [],
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/ai/test - Test AI provider connection
router.post('/test', async (req, res) => {
  try {
    const { provider = process.env.DEFAULT_AI_PROVIDER } = req.body;
    
    const aiProvider = AIProviderManager.getProvider(provider);
    const isWorking = await aiProvider.test();

    res.json({
      provider: provider,
      working: isWorking,
      message: isWorking ? 'AI provider is working correctly' : 'AI provider test failed'
    });

  } catch (error) {
    console.error('AI test error:', error);
    res.status(500).json({
      provider: req.body.provider,
      working: false,
      message: error.message
    });
  }
});

// PUT /api/ai/tasks/:taskId/priority - Update task priority
router.put('/tasks/:taskId/priority', async (req, res) => {
  try {
    console.log('🔄 Priority update request received:', {
      taskId: req.params.taskId,
      body: req.body,
      taskStorageLength: taskStorage.length
    });
    
    const { taskId } = req.params;
    const { priority } = req.body;

    if (!priority || !['high', 'medium', 'low'].includes(priority)) {
      console.log('❌ Invalid priority:', priority);
      return res.status(400).json({ 
        error: 'Valid priority (high, medium, low) is required' 
      });
    }

    // Find and update task in storage
    const taskIndex = taskStorage.findIndex(task => task.id === taskId);
    console.log('🔍 Task search result:', { taskId, taskIndex, foundTask: taskIndex !== -1 });
    
    if (taskIndex === -1) {
      console.log('❌ Task not found. Available tasks:', taskStorage.map(t => ({ id: t.id, title: t.title })));
      return res.status(404).json({ 
        error: 'Task not found' 
      });
    }

    const oldPriority = taskStorage[taskIndex].priority;
    taskStorage[taskIndex].priority = priority;
    
    console.log('✅ Task priority updated:', {
      taskId,
      oldPriority,
      newPriority: priority,
      taskTitle: taskStorage[taskIndex].title
    });
    
    res.json({
      success: true,
      task: taskStorage[taskIndex]
    });

  } catch (error) {
    console.error('❌ Update task priority error:', error);
    res.status(500).json({
      error: 'Failed to update task priority'
    });
  }
});

// GET /api/ai/api-keys - Get saved API keys (masked)
router.get('/api-keys', async (req, res) => {
  try {
    const envPath = path.join(__dirname, '../../.env');
    let envContent = '';
    
    try {
      envContent = fs.readFileSync(envPath, 'utf8');
    } catch (error) {
      return res.json({ apiKeys: {} });
    }

    // Parse existing env variables
    const envLines = envContent.split('\n');
    const apiKeys = {};
    
    const validProviders = ['groq', 'cerebras', 'together', 'openrouter', 'gemini', 'openai', 'claude'];
    
    envLines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          
          // Check if it's an API key
          if (key.includes('API_KEY') && value && value !== '') {
            // Extract provider name from env key (handle numbered keys like GEMINI_API_KEY_3)
            let providerName = key.replace(/_API_KEY.*$/, '').toLowerCase();
            
            if (validProviders.includes(providerName)) {
              // Mask the API key (show first 4 and last 4 characters)
              const maskedKey = value.length > 8 ? 
                `${value.substring(0, 4)}${'*'.repeat(value.length - 8)}${value.substring(value.length - 4)}` :
                '*'.repeat(value.length);
              
              // Extract key number from env key (e.g., GEMINI_API_KEY_2 -> 2)
              const keyMatch = key.match(/_API_KEY_(\d+)$/);
              const keyNumber = keyMatch ? keyMatch[1] : '1';
              const uniqueKey = `${providerName}_${keyNumber}`;
              
              apiKeys[uniqueKey] = {
                key: maskedKey,
                envKey: key,
                addedAt: new Date().toISOString()
              };
            }
          }
        }
      }
    });

    res.json({ 
      success: true,
      apiKeys 
    });
  } catch (error) {
    console.error('Get API keys error:', error);
    res.status(500).json({ 
      error: 'Failed to get API keys',
      details: error.message 
    });
  }
});

// DELETE /api/ai/api-keys/:provider - Delete API key for a provider
router.delete('/api-keys/:provider', async (req, res) => {
  try {
    const { provider } = req.params;

    if (!provider) {
      return res.status(400).json({ 
        error: 'Provider name is required' 
      });
    }

    // Validate provider name
    const validProviders = ['groq', 'cerebras', 'together', 'openrouter', 'gemini', 'openai', 'claude'];
    if (!validProviders.includes(provider.toLowerCase())) {
      return res.status(400).json({ 
        error: 'Invalid provider name' 
      });
    }

    // Read current .env file
    const envPath = path.join(__dirname, '../../.env');
    let envContent = '';
    
    try {
      envContent = fs.readFileSync(envPath, 'utf8');
    } catch (error) {
      return res.status(404).json({ 
        error: '.env file not found' 
      });
    }

    // Convert provider name to env variable format and find any matching keys
    const envVarPrefix = `${provider.toUpperCase()}_API_KEY`;
    
    // Remove all keys for this provider from .env file
    const lines = envContent.split('\n');
    let keyFound = false;
    
    const filteredLines = lines.filter(line => {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith(`${envVarPrefix}=`) || trimmedLine.startsWith(`${envVarPrefix}_`)) {
        keyFound = true;
        return false; // Remove this line
      }
      return true; // Keep this line
    });

    if (!keyFound) {
      return res.status(404).json({ 
        error: `API key not found for this provider` 
      });
    }

    // Write back to .env file
    const newEnvContent = filteredLines.join('\n');
    fs.writeFileSync(envPath, newEnvContent);

    // Remove all matching keys from process.env
    Object.keys(process.env).forEach(key => {
      if (key.startsWith(envVarPrefix)) {
        delete process.env[key];
      }
    });

    res.json({ 
      success: true, 
      message: `${provider} API key deleted successfully` 
    });
  } catch (error) {
    console.error('Delete API key error:', error);
    res.status(500).json({ 
      error: 'Failed to delete API key',
      details: error.message 
    });
  }
});

// POST /api/ai/save-key - Save API key for a provider
router.post('/save-key', async (req, res) => {
  try {
    const { provider, apiKey } = req.body;

    if (!provider || !apiKey) {
      return res.status(400).json({ 
        error: 'Provider and API key are required' 
      });
    }

    // Validate provider name (support multiple keys with _1, _2, etc. suffix)
    const baseProvider = provider.replace(/_\d+$/, ''); // Remove _1, _2, etc.
    const validProviders = ['gemini', 'openai', 'claude'];
    if (!validProviders.includes(baseProvider.toLowerCase())) {
      return res.status(400).json({ 
        error: 'Invalid provider name. Only Gemini, OpenAI and Claude are supported.' 
      });
    }

    // Read current .env file
    const envPath = path.join(__dirname, '../../.env');
    let envContent = '';
    
    try {
      envContent = fs.readFileSync(envPath, 'utf8');
    } catch (error) {
      // If .env doesn't exist, create it
      envContent = '';
    }

    // Parse existing env variables
    const envLines = envContent.split('\n');
    const envVars = {};
    
    envLines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim();
        }
      }
    });

    // Update the API key for the provider
    const envKeyMap = {
      'gemini': 'GEMINI_API_KEY',
      'openai': 'OPENAI_API_KEY',
      'claude': 'CLAUDE_API_KEY'
    };

    // Handle multiple keys (e.g., gemini_1, gemini_2, etc.)
    let envVarName;
    if (provider.includes('_')) {
      const [baseProviderName, keyNumber] = provider.split('_');
      const baseEnvKey = envKeyMap[baseProviderName.toLowerCase()];
      if (keyNumber === '1') {
        envVarName = baseEnvKey; // First key uses base name
      } else {
        envVarName = `${baseEnvKey}_${keyNumber}`; // Additional keys get suffix
      }
    } else {
      envVarName = envKeyMap[provider.toLowerCase()];
    }

    if (!envVarName) {
      return res.status(400).json({ 
        error: 'Environment key not found for provider' 
      });
    }

    envVars[envVarName] = apiKey;

    // Rebuild .env content
    const newEnvContent = Object.entries(envVars)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Write back to .env file
    fs.writeFileSync(envPath, newEnvContent);

    // Update process.env
    process.env[envVarName] = apiKey;

    res.json({ 
      success: true, 
      message: `${provider} API key saved successfully` 
    });
  } catch (error) {
    console.error('Save API key error:', error);
    res.status(500).json({ 
      error: 'Failed to save API key',
      details: error.message 
    });
  }
});

// DELETE /api/ai/delete-key - Delete API key for a provider
router.delete('/delete-key', async (req, res) => {
  try {
    const { provider } = req.body;

    if (!provider) {
      return res.status(400).json({ 
        error: 'Provider is required' 
      });
    }

    // Validate provider name (support multiple keys with _1, _2, etc. suffix)
    const baseProvider = provider.replace(/_\d+$/, ''); // Remove _1, _2, etc.
    const validProviders = ['gemini', 'openai', 'claude'];
    if (!validProviders.includes(baseProvider.toLowerCase())) {
      return res.status(400).json({ 
        error: 'Invalid provider name. Only Gemini, OpenAI and Claude are supported.' 
      });
    }

    // Read current .env file
    const envPath = path.join(__dirname, '../../.env');
    let envContent = '';
    
    try {
      envContent = fs.readFileSync(envPath, 'utf8');
    } catch (error) {
      return res.status(404).json({ 
        error: '.env file not found' 
      });
    }

    // Parse existing env variables
    const envLines = envContent.split('\n');
    const envVars = {};
    
    envLines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim();
        }
      }
    });

    // Determine which env variable to delete
    const envKeyMap = {
      'gemini': 'GEMINI_API_KEY',
      'openai': 'OPENAI_API_KEY',
      'claude': 'CLAUDE_API_KEY'
    };

    let envVarName;
    if (provider.includes('_')) {
      const [baseProviderName, keyNumber] = provider.split('_');
      const baseEnvKey = envKeyMap[baseProviderName.toLowerCase()];
      if (keyNumber === '1') {
        envVarName = baseEnvKey; // First key uses base name
      } else {
        envVarName = `${baseEnvKey}_${keyNumber}`; // Additional keys get suffix
      }
    } else {
      envVarName = envKeyMap[provider.toLowerCase()];
    }

    if (!envVarName || !envVars[envVarName]) {
      return res.status(404).json({ 
        error: 'API key not found for this provider' 
      });
    }

    // Remove the API key
    delete envVars[envVarName];
    delete process.env[envVarName];

    // Rebuild .env content
    const newEnvContent = Object.entries(envVars)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Write back to .env file
    fs.writeFileSync(envPath, newEnvContent);

    res.json({ 
      success: true, 
      message: `${provider} API key deleted successfully` 
    });
  } catch (error) {
    console.error('Delete API key error:', error);
    res.status(500).json({ 
      error: 'Failed to delete API key',
      details: error.message 
    });
  }
});

// POST /api/ai/complete-task - Mark task as completed
router.post('/complete-task', async (req, res) => {
  try {
    const { taskId, task } = req.body;

    if (!taskId || !task) {
      return res.status(400).json({ 
        error: 'Task ID and task data are required' 
      });
    }

    // Add completion timestamp and move to completed tasks
    const completedTask = {
      ...task,
      id: taskId,
      completedAt: new Date().toISOString()
    };

    completedTasks.push(completedTask);

    // Remove from active tasks if it exists
    taskStorage = taskStorage.filter(t => t.id !== taskId);

    // Save to files
    saveTasks();
    saveCompletedTasks();

    res.json({ 
      success: true, 
      message: 'Task marked as completed',
      completedTask 
    });
  } catch (error) {
    console.error('Complete task error:', error);
    res.status(500).json({ 
      error: 'Failed to complete task',
      details: error.message 
    });
  }
});

// GET /api/ai/completed-tasks - Get all completed tasks
router.get('/completed-tasks', async (req, res) => {
  try {
    // Group completed tasks by category and meeting
    const groupedTasks = completedTasks.reduce((acc, task) => {
      const category = task.category || 'Genel';
      const meetingId = task.meetingId || task.meetingDate || 'unknown';
      const meetingTitle = task.meetingTopic || task.meetingTitle || 'Bilinmeyen Toplantı';
      
      if (!acc[category]) {
        acc[category] = {};
      }
      
      if (!acc[category][meetingId]) {
        acc[category][meetingId] = {
          meetingTitle,
          tasks: []
        };
      }
      
      acc[category][meetingId].tasks.push(task);
      
      return acc;
    }, {});

    res.json({
      success: true,
      completedTasks: groupedTasks,
      totalCompleted: completedTasks.length
    });
  } catch (error) {
    console.error('Get completed tasks error:', error);
    res.status(500).json({ 
      error: 'Failed to get completed tasks',
      details: error.message 
    });
  }
});

// Delete completed task
router.delete('/completed-tasks/:taskId', (req, res) => {
  try {
    const { taskId } = req.params;
    
    // Find and remove the task from completedTasks
    const taskIndex = completedTasks.findIndex(task => task.id === taskId);
    
    if (taskIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    // Remove the task
    completedTasks.splice(taskIndex, 1);
    
    // Save to file
    saveCompletedTasks();
    
    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting completed task:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Function to clean up tasks related to a deleted meeting
export function cleanupTasksForDeletedMeeting(deletedMeeting) {
  try {
    console.log(`🧹 Cleaning up tasks for deleted meeting: ${deletedMeeting.topic} (ID: ${deletedMeeting.id})`);
    
    // Remove tasks from taskStorage that belong to the deleted meeting
    const initialTaskCount = taskStorage.length;
    taskStorage = taskStorage.filter(task => {
      // Check if task belongs to the deleted meeting
      const belongsToDeletedMeeting = 
        task.meetingDate === deletedMeeting.date && 
        task.meetingTopic === deletedMeeting.topic;
      
      if (belongsToDeletedMeeting) {
        console.log(`🗑️ Removing task: ${task.title}`);
        return false; // Remove this task
      }
      return true; // Keep this task
    });
    
    // Remove tasks from completedTasks that belong to the deleted meeting
    const initialCompletedCount = completedTasks.length;
    completedTasks = completedTasks.filter(task => {
      const belongsToDeletedMeeting = 
        task.meetingDate === deletedMeeting.date && 
        task.meetingTopic === deletedMeeting.topic;
      
      if (belongsToDeletedMeeting) {
        console.log(`🗑️ Removing completed task: ${task.title}`);
        return false; // Remove this task
      }
      return true; // Keep this task
    });
    
    const removedTasks = initialTaskCount - taskStorage.length;
    const removedCompletedTasks = initialCompletedCount - completedTasks.length;
    
    // Save to files if any tasks were removed
    if (removedTasks > 0 || removedCompletedTasks > 0) {
      saveTasks();
      saveCompletedTasks();
    }
    
    console.log(`✅ Task cleanup completed. Removed ${removedTasks} active tasks and ${removedCompletedTasks} completed tasks.`);
    
    return {
      success: true,
      removedTasks,
      removedCompletedTasks,
      remainingTasks: taskStorage.length,
      remainingCompletedTasks: completedTasks.length
    };
  } catch (error) {
    console.error('❌ Error during task cleanup:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// POST /api/ai/cleanup-tasks-by-topic - Clean up tasks by meeting topic
router.post('/cleanup-tasks-by-topic', async (req, res) => {
  try {
    const { topics } = req.body;

    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return res.status(400).json({ 
        error: 'Topics array is required' 
      });
    }

    console.log(`🧹 Cleaning up tasks for topics: ${topics.join(', ')}`);
    
    // Remove tasks from taskStorage that match the topics
    const initialTaskCount = taskStorage.length;
    taskStorage = taskStorage.filter(task => {
      const matchesTopic = topics.some(topic => 
        task.meetingTopic && task.meetingTopic.toLowerCase().includes(topic.toLowerCase())
      );
      
      if (matchesTopic) {
        console.log(`🗑️ Removing task: ${task.title} from ${task.meetingTopic}`);
        return false; // Remove this task
      }
      return true; // Keep this task
    });
    
    // Remove tasks from completedTasks that match the topics
    const initialCompletedCount = completedTasks.length;
    completedTasks = completedTasks.filter(task => {
      const matchesTopic = topics.some(topic => 
        task.meetingTopic && task.meetingTopic.toLowerCase().includes(topic.toLowerCase())
      );
      
      if (matchesTopic) {
        console.log(`🗑️ Removing completed task: ${task.title} from ${task.meetingTopic}`);
        return false; // Remove this task
      }
      return true; // Keep this task
    });
    
    const removedTasks = initialTaskCount - taskStorage.length;
    const removedCompletedTasks = initialCompletedCount - completedTasks.length;
    
    // Save to files if any tasks were removed
    if (removedTasks > 0 || removedCompletedTasks > 0) {
      saveTasks();
      saveCompletedTasks();
    }
    
    console.log(`✅ Task cleanup completed. Removed ${removedTasks} active tasks and ${removedCompletedTasks} completed tasks.`);
    
    res.json({
      success: true,
      message: `Successfully cleaned up tasks for topics: ${topics.join(', ')}`,
      removedTasks,
      removedCompletedTasks,
      remainingTasks: taskStorage.length,
      remainingCompletedTasks: completedTasks.length
    });
  } catch (error) {
    console.error('❌ Error during task cleanup by topic:', error);
    res.status(500).json({ 
      error: 'Failed to cleanup tasks',
      details: error.message 
    });
  }
});

// Export task storage for external access
export { taskStorage, completedTasks };

export default router;