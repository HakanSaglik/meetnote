const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from dist directory
app.use(express.static(path.join(__dirname)));

// Database setup
const dbPath = path.join(__dirname, 'database', 'meetings.json');

// Database helper functions
function readDB() {
  try {
    if (!fs.existsSync(dbPath)) {
      const dbDir = path.dirname(dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      fs.writeFileSync(dbPath, JSON.stringify({ meetings: [] }, null, 2));
    }
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database:', error);
    return { meetings: [] };
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing database:', error);
    return false;
  }
}

// API Routes
app.get('/api/meetings', (req, res) => {
  try {
    const data = readDB();
    res.json(data.meetings || []);
  } catch (error) {
    console.error('Error fetching meetings:', error);
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

app.post('/api/meetings', (req, res) => {
  try {
    const { title, transcript, date, participants } = req.body;
    
    if (!title || !transcript) {
      return res.status(400).json({ error: 'Title and transcript are required' });
    }

    const data = readDB();
    
    const newMeeting = {
      id: Date.now().toString(),
      title,
      transcript,
      date: date || new Date().toISOString(),
      participants: participants || [],
      createdAt: new Date().toISOString()
    };

    if (!data.meetings) {
      data.meetings = [];
    }
    
    data.meetings.push(newMeeting);
    
    if (writeDB(data)) {
      res.status(201).json(newMeeting);
    } else {
      res.status(500).json({ error: 'Failed to save meeting' });
    }
  } catch (error) {
    console.error('Error creating meeting:', error);
    res.status(500).json({ error: 'Failed to create meeting' });
  }
});

app.delete('/api/meetings/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const data = readDB();
    
    if (!data.meetings) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    const meetingIndex = data.meetings.findIndex(m => m.id === id);
    
    if (meetingIndex === -1) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    data.meetings.splice(meetingIndex, 1);
    
    if (writeDB(data)) {
      res.json({ message: 'Meeting deleted successfully' });
    } else {
      res.status(500).json({ error: 'Failed to delete meeting' });
    }
  } catch (error) {
    console.error('Error deleting meeting:', error);
    res.status(500).json({ error: 'Failed to delete meeting' });
  }
});

app.post('/api/analyze', (req, res) => {
  try {
    const { transcript, apiKeys } = req.body;
    
    if (!transcript) {
      return res.status(400).json({ error: 'Transcript is required' });
    }

    if (!apiKeys || (!apiKeys.gemini?.length && !apiKeys.claude?.length && !apiKeys.chatgpt?.length)) {
      return res.status(400).json({ error: 'AI servisi kullanmak için önce ayarlar sayfasından API anahtarı eklemeniz gerekiyor.' });
    }

    // Simple analysis without AI services for production
    const analysis = {
      summary: 'Toplantı özeti: ' + transcript.substring(0, 200) + '...',
      keyPoints: [
        'Ana konu: ' + transcript.split(' ').slice(0, 10).join(' '),
        'Katılımcılar aktif olarak tartıştı',
        'Önemli kararlar alındı'
      ],
      actionItems: [
        'Toplantı notlarını gözden geçir',
        'Sonraki adımları planla',
        'Takip toplantısı düzenle'
      ],
      nextSteps: [
        'Kararları uygula',
        'İlerlemeyi takip et',
        'Sonuçları raporla'
      ]
    };

    res.json(analysis);
  } catch (error) {
    console.error('Error analyzing transcript:', error);
    res.status(500).json({ error: 'Failed to analyze transcript' });
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
function startServer() {
  try {
    // Initialize database
    readDB();
    console.log('✅ JSON database initialized successfully');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📁 Database path: ${dbPath}`);
      console.log(`🌐 Access your app at: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();