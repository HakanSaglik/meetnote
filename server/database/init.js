import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, './meetings.json');
const dbDir = path.dirname(dbPath);

// Ensure database directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Create database connection
const adapter = new JSONFile(dbPath);
const db = new Low(adapter, { meetings: [] });
console.log('✅ Connected to LowDB database');

// Initialize database tables
export const initDatabase = async () => {
  try {
    // Read data from JSON file, this will set db.data content
    await db.read();

    // If file.json doesn't exist, db.data will be null
    // Set default data
    if (db.data === null) {
      db.data = { meetings: [] };
    }

    console.log('✅ Database structure ready');

    // Database is ready - no sample data needed

    console.log('✅ Database initialization complete');
    return Promise.resolve();
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    return Promise.reject(error);
  }
};

// Insert sample data
const insertSampleData = async () => {
  const sampleMeetings = [
    {
      id: 1,
      uuid: 'sample-1',
      date: '2024-01-15',
      topic: 'Sınav Tarihleri ve Değerlendirme Kriterleri',
      decision: 'Ara sınav 15 Mart, final sınavı 20 Mayıs tarihlerinde yapılacak. Ara sınav %40, final %60 ağırlığında olacak.',
      notes: 'Öğrencilere en az 2 hafta önceden duyuru yapılacak.',
      tags: 'sınav, tarih, değerlendirme',
      revised_from_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 2,
      uuid: 'sample-2', 
      date: '2024-01-22',
      topic: 'Proje Ödevleri ve Teslim Tarihleri',
      decision: 'Proje ödevleri 3 aşamada teslim edilecek: 1. Aşama 1 Mart, 2. Aşama 15 Mart, Final 1 Mayıs.',
      notes: 'Her aşama için detaylı rubrik hazırlanacak.',
      tags: 'proje, ödev, tarih',
      revised_from_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 3,
      uuid: 'sample-3',
      date: '2024-02-01', 
      topic: 'Devamsızlık Politikası',
      decision: 'Derslerin %70\'ine katılım zorunlu. Mazeretsiz devamsızlık durumunda ek ödev verilecek.',
      notes: 'Mazeret durumları için belge istenir.',
      tags: 'devamsızlık, katılım, politika',
      revised_from_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  db.data.meetings = sampleMeetings;
  await db.write();
  console.log('✅ Sample data inserted');
};

export default db;