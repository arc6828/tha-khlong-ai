import { NextResponse } from 'next/server';
import { 
  readState, 
  resetState, 
  DEFAULT_STAMPS, 
  addCanvas, 
  updateCanvasSettings, 
  deleteCanvas, 
  clearAllCanvases, 
  setSubmissionsAccepted 
} from '@/lib/db';

async function notifyWsServer() {
  try {
    await fetch('http://localhost:3001/notify');
  } catch (err) {
    console.error('Failed to notify WebSocket server:', err);
  }
}

export async function GET() {
  // Next.js HTTP GET เพียงอ่านสถานะปัจจุบันจากฐานข้อมูลส่งกลับไคลเอนต์ (ไม่ต้องเรียกจัดสรรคิวซ้ำซ้อน)
  const state = readState();
  return NextResponse.json(state);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, payload } = body;
    const state = readState();

    // ➕ สร้างแคนวาส/ไอเดียใหม่
    if (action === 'add_requirement') {
      if (!state.acceptingSubmissions) {
        return NextResponse.json({ error: 'ขณะนี้ปิดรับชิ้นงานเพิ่มเติมแล้ว' }, { status: 400 });
      }
      const { text, author } = payload;
      if (!text || !author) {
        return NextResponse.json({ error: 'กรุณากรอกหัวข้อและชื่อผู้สร้าง' }, { status: 400 });
      }

      const newId = Math.random().toString(36).substring(2, 9);
      const newReq = {
        id: newId,
        text: text.trim().substring(0, 80),
        author: author.trim().substring(0, 20),
        status: 'pending' as const,
        theme: 'default' as const,
        effect: 'none' as const,
        stamps: DEFAULT_STAMPS,
        generatedSvg: '',
        isCompiling: false,
        startedAt: null,
        createdAt: Date.now(),
        drawActions: []
      };

      addCanvas(newReq);
      
      await notifyWsServer();
      return NextResponse.json(readState());
    }

    // 🎨 บันทึกเส้นวาดหรือแสตมป์ของกระดานแคนวาสใดแคนวาสหนึ่ง (ระบุ canvasId)
    if (action === 'draw') {
      // ฟังก์ชันเขียนเส้นวาดถูกปิดการใช้งานใน UI แล้ว
      return NextResponse.json(state);
    }

    // ⚙️ อัปเดตธีม/เอฟเฟกต์เฉพาะกระดานแคนวาส (ระบุ canvasId)
    if (action === 'update_canvas_settings') {
      const { canvasId, theme, effect } = payload;
      if (!canvasId) {
        return NextResponse.json({ error: 'ไม่พบ ID กระดานที่ระบุ' }, { status: 400 });
      }

      updateCanvasSettings(canvasId, theme, effect);
      
      await notifyWsServer();
      return NextResponse.json(readState());
    }

    // ⚙️ แผงควบคุมกระดานแคนวาส (ครู/แอดมิน)
    if (action === 'admin_control') {
      const { type, canvasId } = payload;

      if (type === 'reset') {
        const reseted = resetState();
        await notifyWsServer();
        return NextResponse.json(reseted);
      }

      // ล้างเส้นวาดของกระดานใดกระดานหนึ่ง
      if (type === 'clear_canvas') {
        await notifyWsServer();
        return NextResponse.json(state);
      }

      // ลบกระดานใดกระดานหนึ่งทิ้ง
      if (type === 'delete_canvas') {
        if (canvasId) {
          deleteCanvas(canvasId);
          await notifyWsServer();
        }
        return NextResponse.json(readState());
      }

      if (type === 'save_api_key') {
        return NextResponse.json(state);
      }

      if (type === 'toggle_submissions') {
        setSubmissionsAccepted(!state.acceptingSubmissions);
        await notifyWsServer();
        return NextResponse.json(readState());
      }

      if (type === 'clear_queue') {
        clearAllCanvases();
        await notifyWsServer();
        return NextResponse.json(readState());
      }

      // โหลดการ์ดสาธิต 5 ใบ
      if (type === 'add_mock_requirements') {
        const mocks = [
          { text: 'ขอธีมอวกาศจักรวาลลึกลับและแสตมป์ยานบินดาวหาง', author: 'น้องภูมิ' },
          { text: 'ขอตกแต่งกระดานธีมคริสต์มาสและปล่อยหิมะตกบนภาพ', author: 'น้องปิ่น' },
          { text: 'เปลี่ยนกระดานวาดรูปเป็นสีชมพูฟรุ้งฟริ้ง มีสติกเกอร์น่ารัก', author: 'น้องเนย' },
          { text: 'เปลี่ยนเป็นธีมแฮกเกอร์ระบบไอที สีเขียว Matrix', author: 'น้องพีท' },
          { text: 'ปล่อยกระดาษสายรุ้งรันเอฟเฟกต์ฉลองปิดกระดานความดี!', author: 'น้องกิ๊ฟ' }
        ];

        const now = Date.now();
        mocks.forEach((m, index) => {
          const newId = Math.random().toString(36).substring(2, 9);
          addCanvas({
            id: newId,
            text: m.text,
            author: m.author,
            status: 'pending',
            theme: 'default',
            effect: 'none',
            stamps: DEFAULT_STAMPS,
            generatedSvg: '',
            isCompiling: false,
            startedAt: null,
            createdAt: now + index,
            drawActions: []
          });
        });

        await notifyWsServer();
        return NextResponse.json(readState());
      }
    }

    return NextResponse.json({ error: 'ไม่พบคำสั่งทำงาน' }, { status: 400 });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}
