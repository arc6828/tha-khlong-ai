import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fetchGeminiSvg } from './gemini';

// โหลดคีย์สำรองจากไฟล์ .env.local แบบดิบโดยตรง หากระบบรันไทม์ไม่ได้โหลดมาให้ (แก้ปัญหาคีย์ตกหล่นในบางโปรเซส)
function loadGeminiKeyDirectly() {
  if (!process.env.GEMINI_API_KEY) {
    try {
      const envPath = path.join(process.cwd(), '.env.local');
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const lines = content.split(/\r?\n/);
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('GEMINI_API_KEY=')) {
            const val = trimmed.substring('GEMINI_API_KEY='.length).trim();
            if (val) {
              process.env.GEMINI_API_KEY = val;
              console.log('Successfully loaded GEMINI_API_KEY directly from .env.local via fallback file parser.');
              break;
            }
          }
        }
      }
    } catch (err) {
      console.warn('Fallback env key loader failed:', err);
    }
  }
}

loadGeminiKeyDirectly();

export interface Requirement {
  id: string;
  text: string;
  author: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  theme: 'default' | 'space' | 'pink' | 'matrix' | 'neon';
  effect: 'none' | 'confetti' | 'snow' | 'bubbles';
  stamps: string[];
  generatedSvg: string; // เก็บโค้ดภาพเวกเตอร์ SVG แยกแต่ละกระดาน
  isCompiling: boolean;  // สถานะคอมไพล์เดี่ยวของกระดานนี้
  startedAt: number | null; // เวลาเริ่มต้นสร้าง
  createdAt: number;     // เวลาที่สร้างสำหรับคิว FIFO
  drawActions: unknown[]; // ส่งกลับอาเรย์ว่างเปล่าเพื่อความเข้ากันได้กับหน้าเว็บ
  processingTime: number; // ระยะเวลาประมวลผล (มิลลิวินาที)
}

export interface AppState {
  requirements: Requirement[]; // ลิสต์ของ Canvas ทั้งหมด
  acceptingSubmissions: boolean;
  geminiApiKey: string; // ส่งค่าว่างกลับเพื่อความเข้ากันได้
}

export interface CanvasRow {
  id: string;
  text: string;
  author: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  theme: string | null;
  effect: string | null;
  generatedSvg: string | null;
  isCompiling: number;
  startedAt: number | null;
  createdAt: number | null;
  processingTime: number | null; // ระยะเวลาประมวลผล (มิลลิวินาที)
}

const DB_DIR = path.join(process.cwd(), 'database');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}
const DB_FILE = path.join(DB_DIR, 'tha_khlong.db');
console.log(`[SQLite Init] Database absolute file path is: ${DB_FILE}`);
const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');

// 1. สร้างตารางข้อมูลเริ่มต้น (canvases & app_settings)
db.exec(`
  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS canvases (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    author TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    theme TEXT DEFAULT 'default',
    effect TEXT DEFAULT 'none',
    generatedSvg TEXT,
    isCompiling INTEGER DEFAULT 0,
    startedAt INTEGER,
    createdAt INTEGER,
    processingTime INTEGER DEFAULT 0
  );
`);

try {
  db.exec('ALTER TABLE canvases ADD COLUMN createdAt INTEGER');
} catch {
  // ละเว้นหากคอลัมน์มีอยู่แล้ว
}

try {
  db.exec('ALTER TABLE canvases ADD COLUMN processingTime INTEGER DEFAULT 0');
} catch {
  // ละเว้นหากคอลัมน์มีอยู่แล้ว
}

// 2. ตั้งค่าตั้งต้นระดับ Global
db.prepare('INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)').run('acceptingSubmissions', 'true');

export const DEFAULT_STAMPS = ['🎨', '🐱', '🐶', '🏠', '🌲', '🌸', '🎈', '❤️'];

const DEFAULT_WELCOME_SVG = `<svg viewBox="0 0 800 600" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="welGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e1b4b" />
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(#welGrad)"/>
  <circle cx="400" cy="220" r="90" fill="#a855f7" opacity="0.15"/>
  <circle cx="400" cy="220" r="70" fill="#ec4899" opacity="0.1"/>
  <text x="400" y="240" font-family="sans-serif" font-size="70" fill="#ffffff" text-anchor="middle" font-weight="bold">🎨</text>
  <text x="400" y="350" font-family="sans-serif" font-size="28" fill="#e5e7eb" text-anchor="middle" font-weight="bold">Tha Khlong AI Gallery 🚀</text>
  <text x="400" y="390" font-family="sans-serif" font-size="16" fill="#a855f7" text-anchor="middle" font-weight="bold">เสนอหัวข้อไอเดียเพื่อสร้างสรรค์งานศิลปะ AI และเปิดชมเต็มจอ!</text>
</svg>`;

// ดึงข้อมูลสถานะ AppState ทั้งหมดจาก SQLite
export function readState(): AppState {
  try {
    // อ่านการตั้งค่าส่วนกลาง
    const settingsRows = db.prepare('SELECT key, value FROM app_settings').all() as { key: string; value: string }[];
    const settings: Record<string, string> = {};
    settingsRows.forEach(row => {
      settings[row.key] = row.value;
    });

    const acceptingSubmissions = settings['acceptingSubmissions'] !== 'false';

    // อ่านรายการกระดานแคนวาสทั้งหมด เรียงลำดับตามเวลาสร้างเพื่อความถูกต้องของคิว FIFO
    const canvasesRows = db.prepare('SELECT * FROM canvases ORDER BY createdAt ASC').all() as CanvasRow[];
    const requirements = canvasesRows.map(row => ({
      id: row.id,
      text: row.text,
      author: row.author,
      status: row.status as 'pending' | 'processing' | 'completed' | 'failed',
      theme: (row.theme || 'default') as 'default' | 'space' | 'pink' | 'matrix' | 'neon',
      effect: (row.effect || 'none') as 'none' | 'confetti' | 'snow' | 'bubbles',
      stamps: DEFAULT_STAMPS,
      generatedSvg: row.generatedSvg || DEFAULT_WELCOME_SVG,
      isCompiling: row.isCompiling === 1,
      startedAt: row.startedAt,
      createdAt: row.createdAt || Date.now(),
      drawActions: [], // ลบฟังก์ชันวาดเขียนทับออกหมดแล้ว ส่งกลับอาเรย์ว่างเปล่า
      processingTime: row.processingTime || 0
    }));

    return {
      requirements,
      acceptingSubmissions,
      geminiApiKey: '' // คีย์ถูกรักษาความปลอดภัยผ่านทางไฟล์สิ่งแวดล้อมเท่านั้น
    };
  } catch (error) {
    console.error('Error reading state from SQLite:', error);
    return {
      requirements: [],
      acceptingSubmissions: true,
      geminiApiKey: ''
    };
  }
}

// เซฟ/ซิงก์ AppState กลับไปยัง SQLite (ทำหน้าที่บันทึกการเพิ่มและลบบอร์ด)
export function writeState(state: AppState): void {
  try {
    // 1. บันทึกตัวรับงาน
    const stmtSetSetting = db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)');
    stmtSetSetting.run('acceptingSubmissions', state.acceptingSubmissions ? 'true' : 'false');

    // 2. ลบไอดีแคนวาสที่ไม่มีอยู่ใน state แล้วออกจากตาราง
    const stateIds = state.requirements.map(r => r.id);
    if (stateIds.length > 0) {
      const placeholders = stateIds.map(() => '?').join(',');
      db.prepare(`DELETE FROM canvases WHERE id NOT IN (${placeholders})`).run(...stateIds);
    } else {
      db.prepare('DELETE FROM canvases').run();
    }

    // 3. บันทึกหรืออัปเดตแคนวาสทั้งหมดลงฐานข้อมูลด้วย SQLite Transaction
    const stmtUpsertCanvas = db.prepare(`
      INSERT OR REPLACE INTO canvases (id, text, author, status, theme, effect, generatedSvg, isCompiling, startedAt, createdAt, processingTime)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const tx = db.transaction((requirements: Requirement[]) => {
      requirements.forEach(req => {
        stmtUpsertCanvas.run(
          req.id,
          req.text,
          req.author,
          req.status,
          req.theme || 'default',
          req.effect || 'none',
          req.generatedSvg || '',
          req.isCompiling ? 1 : 0,
          req.startedAt,
          req.createdAt || Date.now(),
          req.processingTime || 0
        );
      });
    });

    tx(state.requirements);
  } catch (error) {
    console.error('Error writing state to SQLite:', error);
  }
}

export function resetState(): AppState {
  try {
    db.prepare('DELETE FROM canvases').run();
    db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)').run('acceptingSubmissions', 'true');
    return readState();
  } catch (error) {
    console.error('Error resetting database:', error);
    return readState();
  }
}

export function getFallbackSvg(theme: string, promptText: string): string {
  const cleanPrompt = promptText.replace(/"/g, '&quot;');

  if (theme === 'space') {
    return `<svg viewBox="0 0 800 600" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="spaceGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#1e1b4b" />
          <stop offset="100%" stop-color="#090514" />
        </radialGradient>
      </defs>
      <rect width="800" height="600" fill="url(#spaceGlow)"/>
      <g fill="#ffffff" opacity="0.3">
        <circle cx="100" cy="150" r="2"/>
        <circle cx="250" cy="80" r="1.5"/>
        <circle cx="650" cy="120" r="3"/>
        <circle cx="450" cy="480" r="2"/>
        <circle cx="700" cy="400" r="1"/>
      </g>
      <g transform="translate(600, 200)">
        <ellipse cx="0" cy="0" rx="90" ry="20" fill="none" stroke="#a855f7" stroke-width="8" transform="rotate(-15)"/>
        <circle cx="0" cy="0" r="50" fill="#f97316"/>
        <ellipse cx="0" cy="0" rx="90" ry="20" fill="none" stroke="#ec4899" stroke-width="4" transform="rotate(-15)"/>
      </g>
      <g transform="translate(250, 320) rotate(-45)">
        <path d="M 0,-60 L 25,-10 L 25,50 L -25,50 L -25,-10 Z" fill="#e2e8f0"/>
        <path d="M 0,-70 L 25,-10 L -25,-10 Z" fill="#ef4444"/>
        <circle cx="0" cy="0" r="12" fill="#38bdf8" stroke="#cbd5e1" stroke-width="4"/>
        <path d="M -25,20 L -45,50 L -25,50 Z" fill="#f97316"/>
        <path d="M 25,20 L 45,50 L 25,50 Z" fill="#f97316"/>
        <path d="M -15,50 L 0,80 L 15,50 Z" fill="#ff7f00"/>
        <path d="M -5,50 L 0,70 L 5,50 Z" fill="#ffcc00"/>
      </g>
      <text x="400" y="520" font-family="sans-serif" font-size="20" fill="#a855f7" text-anchor="middle" font-weight="bold">ภาพห้วงอวกาศเสมือนวาดโดย AI (Mock)</text>
      <text x="400" y="550" font-family="sans-serif" font-size="14" fill="#64748b" text-anchor="middle">คำสั่ง: "${cleanPrompt}"</text>
    </svg>`;
  }

  if (theme === 'pink') {
    return `<svg viewBox="0 0 800 600" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="600" fill="#fdf2f8"/>
      <path d="M 100,500 A 300,300 0 0,1 700,500" fill="none" stroke="#f472b6" stroke-width="40" opacity="0.3"/>
      <path d="M 130,500 A 270,270 0 0,1 670,500" fill="none" stroke="#fbcfe8" stroke-width="30" opacity="0.4"/>
      <path d="M 160,500 A 240,240 0 0,1 640,500" fill="none" stroke="#fce7f3" stroke-width="20" opacity="0.5"/>
      <circle cx="150" cy="460" r="60" fill="#ffffff" opacity="0.9"/>
      <circle cx="210" cy="480" r="50" fill="#ffffff" opacity="0.9"/>
      <circle cx="650" cy="460" r="60" fill="#ffffff" opacity="0.9"/>
      <circle cx="590" cy="480" r="50" fill="#ffffff" opacity="0.9"/>
      <g transform="translate(400, 240)">
        <rect x="-8" y="0" width="16" height="200" fill="#fcd34d" rx="8"/>
        <circle cx="0" cy="0" r="70" fill="#ec4899"/>
        <path d="M 0,0 A 50,50 0 0,1 50,-20" fill="none" stroke="#f472b6" stroke-width="12" stroke-linecap="round"/>
        <circle cx="0" cy="0" r="15" fill="#ffffff"/>
      </g>
      <text x="400" y="520" font-family="sans-serif" font-size="20" fill="#db2777" text-anchor="middle" font-weight="bold">ภาพดินแดนหวานพาสเทลเสมือนวาดโดย AI (Mock)</text>
      <text x="400" y="550" font-family="sans-serif" font-size="14" fill="#f472b6" text-anchor="middle">คำสั่ง: "${cleanPrompt}"</text>
    </svg>`;
  }

  if (theme === 'matrix') {
    return `<svg viewBox="0 0 800 600" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="600" fill="#000000"/>
      <g stroke="#10b981" stroke-width="0.5" opacity="0.15">
        <path d="M 0,100 L 800,100 M 0,200 L 800,200 M 0,300 L 800,300 M 0,400 L 800,400 M 0,500 L 800,500" />
        <path d="M 100,0 L 100,600 M 200,0 L 200,600 M 300,0 L 300,600 M 400,0 L 400,600 M 500,0 L 500,600 M 600,0 L 600,600 M 700,0 L 700,600" />
      </g>
      <g transform="translate(400, 260)" fill="none" stroke="#10b981" stroke-width="4">
        <rect x="-80" y="-80" width="160" height="120" rx="10" fill="#050505"/>
        <line x1="-80" y1="40" x2="80" y2="40" stroke-width="2"/>
        <circle cx="-35" cy="-20" r="12" fill="#10b981"/>
        <circle cx="35" cy="-20" r="12" fill="#10b981"/>
        <line x1="-15" y1="-20" x2="15" y2="-20" stroke-width="2"/>
        <line x1="0" y1="-80" x2="0" y2="-110"/>
        <circle cx="0" cy="-115" r="8" fill="#10b981"/>
        <text x="0" y="25" font-family="monospace" font-size="10" fill="#10b981" text-anchor="middle">SYSTEM: ONLINE</text>
      </g>
      <text x="400" y="520" font-family="monospace" font-size="20" fill="#10b981" text-anchor="middle" font-weight="bold">ภาพโมเดลหุ่นยนต์ไอทีเสมือนวาดโดย AI (Mock)</text>
      <text x="400" y="550" font-family="monospace" font-size="14" fill="#059669" text-anchor="middle">คำสั่ง: "${cleanPrompt}"</text>
    </svg>`;
  }

  // รูปธรรมชาติ/บ้าน (Default theme fallback)
  return `<svg viewBox="0 0 800 600" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
    <rect width="800" height="600" fill="#f0fdf4"/>
    <circle cx="700" cy="100" r="40" fill="#eab308" opacity="0.8"/>
    <polygon points="-50,600 200,300 450,600" fill="#bbf7d0" opacity="0.7"/>
    <polygon points="350,600 600,250 850,600" fill="#86efac" opacity="0.6"/>
    <g transform="translate(150, 420)">
      <rect x="-10" y="0" width="20" height="80" fill="#78350f"/>
      <polygon points="0,-90 60,-10 -60,-10" fill="#15803d"/>
      <polygon points="0,-120 45,-45 -45,-45" fill="#166534"/>
    </g>
    <g transform="translate(420, 380)">
      <rect x="0" y="40" width="160" height="120" fill="#fed7aa" stroke="#c2410c" stroke-width="4"/>
      <polygon points="-20,40 80,-40 180,40" fill="#ea580c" stroke="#c2410c" stroke-width="4"/>
      <rect x="55" y="90" width="50" height="70" fill="#9a3412"/>
      <circle cx="65" cy="125" r="4" fill="#facc15"/>
      <rect x="15" y="65" width="30" height="30" fill="#38bdf8" stroke="#c2410c" stroke-width="2"/>
      <rect x="115" y="65" width="30" height="30" fill="#38bdf8" stroke="#c2410c" stroke-width="2"/>
    </g>
    <text x="400" y="540" font-family="sans-serif" font-size="20" fill="#166534" text-anchor="middle" font-weight="bold">ภาพธรรมชาติสวนป่าเสมือนวาดโดย AI (Mock)</text>
    <text x="400" y="570" font-family="sans-serif" font-size="14" fill="#15803d" text-anchor="middle">คำสั่ง: "${cleanPrompt}"</text>
  </svg>`;
}

export function matchRequirementKeywords(text: string) {
  const textLower = text.toLowerCase();
  let theme: 'default' | 'space' | 'pink' | 'matrix' | 'neon' = 'default';
  let effect: 'none' | 'confetti' | 'snow' | 'bubbles' = 'none';
  let stamps = DEFAULT_STAMPS;

  if (textLower.includes('อวกาศ') || textLower.includes('space') || textLower.includes('ดาว')) {
    theme = 'space';
    effect = 'snow';
    stamps = ['🚀', '🛸', '🪐', '☄️', '👽', '⭐', '🛰️', '🧑‍🚀'];
  } else if (textLower.includes('ชมพู') || textLower.includes('pink') || textLower.includes('น่ารัก') || textLower.includes('ขนม')) {
    theme = 'pink';
    effect = 'bubbles';
    stamps = ['🌸', '🍬', '🍩', '🍦', '🦄', '🎀', '🧸', '💖'];
  } else if (textLower.includes('แฮกเกอร์') || textLower.includes('matrix') || textLower.includes('เขียว')) {
    theme = 'matrix';
    effect = 'none';
    stamps = ['💻', '💾', '👾', '📡', '🔒', '🔑', '🤖', '⚡'];
  } else if (textLower.includes('นีออน') || textLower.includes('cyber') || textLower.includes('ไซเบอร์') || textLower.includes('ฉลอง')) {
    theme = 'neon';
    effect = 'confetti';
    stamps = ['🎆', '🎈', '🎉', '🌟', '🎸', '🕹️', '👽', '🔥'];
  }

  return { theme, effect, stamps };
}

async function notifyWsServer() {
  try {
    const wsPort = process.env.WS_PORT || '3004';
    await fetch(`http://localhost:${wsPort}/notify`);
  } catch (err) {
    console.error('Failed to notify WebSocket server from db:', err);
  }
}

// อัปเดตคิวประมวลผลกระดานตามลำดับก่อนหลัง (FIFO Queue Scheduler)
export async function updateQueueStatus(): Promise<AppState> {
  const now = Date.now();

  // 1. ค้นหาว่ามีบอร์ดใดกำลังประมวลผลอยู่ (processing) หรือไม่
  const active = db.prepare("SELECT * FROM canvases WHERE status = 'processing' LIMIT 1").get() as CanvasRow | undefined;

  if (active) {
    if (active.isCompiling === 0) {
      db.prepare("UPDATE canvases SET isCompiling = 1 WHERE id = ?").run(active.id);
    }
  } else {
    // 2. ไม่มีกระดานกำลังประมวลผลอยู่ ดึงอันรอคิว (pending) แรกสุดขึ้นมาทำตามลำดับ FIFO
    const nextPending = db.prepare("SELECT * FROM canvases WHERE status = 'pending' ORDER BY createdAt ASC LIMIT 1").get() as CanvasRow | undefined;
    if (nextPending) {
      db.prepare("UPDATE canvases SET status = 'processing', startedAt = ?, isCompiling = 1 WHERE id = ?").run(now, nextPending.id);

      // เรียกใช้งาน AI เจนเนอเรตภาพเฉพาะแคนวาสบอร์ดนี้ (และอัปเดตเป็น completed หรือ failed ทันทีที่ทำงานเสร็จ)
      // รันแบบ background task โดยไม่ await เพื่อหลีกเลี่ยงการบล็อก Event Loop และ WebSocket Notification
      generateCanvasSvg(nextPending.id).catch((err) => {
        console.error('Error in generateCanvasSvg background task:', err);
      });
    }
  }

  return readState();
}

// ฟังก์ชันเรียกเจนเนอเรต SVG ของ Canvas นั้นๆ โดยแยก Prompt อิสระเดี่ยวๆ ไม่รวมกัน
export async function generateCanvasSvg(canvasId: string): Promise<void> {
  const canvas = db.prepare("SELECT * FROM canvases WHERE id = ?").get(canvasId) as CanvasRow | undefined;
  if (!canvas) return;

  // นโยบายความปลอดภัยคีย์ API: ดึงตรงจาก process.env เท่านั้น ห้ามกรอกผ่านบอร์ดเว็บหรือเก็บลง DB
  const apiKey = process.env.GEMINI_API_KEY;

  // วิเคราะห์หาธีมและเอฟเฟกต์ตามคีย์เวิร์ด
  const match = matchRequirementKeywords(canvas.text);

  let generatedSvg = '';
  let status: 'completed' | 'failed' = 'completed';

  const startTime = Date.now(); // เริ่มจับเวลาการประมวลผลวาดภาพของ Gemini

  if (apiKey) {
    try {
      console.log(`Calling Gemini API for canvas ${canvasId} with prompt: "${canvas.text}"`);
      generatedSvg = await fetchGeminiSvg(canvas.text, apiKey);
      status = 'completed';
    } catch (err) {
      console.warn('Google Gemini API Call failed, falling back to mock illustration:', err);
      generatedSvg = getFallbackSvg(match.theme, canvas.text);
      status = 'failed';
    }
  } else {
    console.log('No Gemini API Key provided in process.env.GEMINI_API_KEY, using mock SVG fallback');
    generatedSvg = getFallbackSvg(match.theme, canvas.text);
    status = 'failed';
  }

  const processingTime = Date.now() - startTime; // สรุปเวลาประมวลผล (มิลลิวินาที)

  console.log({ "duration(ms)": processingTime, "end": Date.now(), "begin": startTime });

  // อัปเดตรูปภาพ ธีม และเปลี่ยนสถานะเป็น completed หรือ failed และปิด compiles ทันที
  db.prepare(`
    UPDATE canvases 
    SET theme = ?, effect = ?, generatedSvg = ?, status = ?, isCompiling = 0, processingTime = ?
    WHERE id = ?
  `).run(match.theme, match.effect, generatedSvg, status, processingTime, canvasId);

  // แจ้งเตือน WebSocket Server ทันทีหลังจากเขียนสถานะลงฐานข้อมูลเสร็จสิ้น
  await notifyWsServer();
}

// ฟังก์ชันช่วยเหลือในการเขียนบันทึกฐานข้อมูลแบบตรงจุด (Targeted Database Operations) เพื่อแก้ปัญหาการแย่งกันเขียนทับของโปรเซส
export function addCanvas(canvas: Requirement) {
  db.prepare(`
    INSERT INTO canvases (id, text, author, status, theme, effect, generatedSvg, isCompiling, startedAt, createdAt, processingTime)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    canvas.id,
    canvas.text,
    canvas.author,
    canvas.status,
    canvas.theme,
    canvas.effect,
    canvas.generatedSvg,
    canvas.isCompiling ? 1 : 0,
    canvas.startedAt,
    canvas.createdAt,
    canvas.processingTime || 0
  );
}

export function updateCanvasSettings(canvasId: string, theme?: string, effect?: string) {
  if (theme && effect) {
    db.prepare('UPDATE canvases SET theme = ?, effect = ? WHERE id = ?').run(theme, effect, canvasId);
  } else if (theme) {
    db.prepare('UPDATE canvases SET theme = ? WHERE id = ?').run(theme, canvasId);
  } else if (effect) {
    db.prepare('UPDATE canvases SET effect = ? WHERE id = ?').run(effect, canvasId);
  }
}

export function deleteCanvas(canvasId: string) {
  db.prepare('DELETE FROM canvases WHERE id = ?').run(canvasId);
}

export function clearAllCanvases() {
  db.prepare('DELETE FROM canvases').run();
}

export function setSubmissionsAccepted(accepted: boolean) {
  db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)').run('acceptingSubmissions', accepted ? 'true' : 'false');
}
