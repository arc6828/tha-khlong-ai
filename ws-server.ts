import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { readState, updateQueueStatus } from './lib/db';

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3004;

// 1. HTTP Server สำหรับรับสัญญาณ Notify ทริกเกอร์จาก Next.js REST API หลังบ้าน
const server = http.createServer((req, res) => {
  // อนุญาต CORS เพื่อความปลอดภัยและลื่นไหลในการส่งข้อมูลภายในเครื่อง
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/notify') {
    updateQueueStatus()
      .then(() => {
        broadcastState();
      })
      .catch((err) => {
        console.error('Error updating queue on notify:', err);
        broadcastState();
      });
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ noServer: true });

// จัดการการอัปเกรดโปรโตคอลจาก HTTP เป็น WebSocket
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// บรอดแคสต์ส่งข้อมูล AppState ชุดล่าสุดไปให้นักเรียนทุกคนที่เชื่อมต่ออยู่
function broadcastState() {
  try {
    const state = readState();
    const payload = JSON.stringify(state);
    let count = 0;
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
        count++;
      }
    });
    console.log(`Broadcasted state to ${count} client(s).`);
  } catch (err) {
    console.error('Error broadcasting state:', err);
  }
}

wss.on('connection', (ws) => {
  console.log('New student client connected to WebSocket server.');
  
  // ส่งข้อมูลแรกเข้าสถานะล่าสุดให้ทันที
  try {
    const state = readState();
    ws.send(JSON.stringify(state));
  } catch (err) {
    console.error('Error sending initial state to client:', err);
  }

  ws.on('error', console.error);
});

// 3. วงรอบนับถอยหลังคิวในฝั่งเซิร์ฟเวอร์ (Background Queue Tic - ทำงานทุกๆ 5 วินาที)
setInterval(async () => {
  try {
    // ฐานข้อมูล SQLite จะถูกซิงก์โดยตรง
    const oldState = readState();
    const newState = await updateQueueStatus();

    // หากพบว่าจำนวนชิ้นงาน หรือสถานะคอมไพล์ของชิ้นงานมีการเปลี่ยนแปลงให้ทำการบรอดแคสต์กระจายทันที
    const oldReqsStr = JSON.stringify(oldState.requirements.map(r => ({ id: r.id, status: r.status, isCompiling: r.isCompiling })));
    const newReqsStr = JSON.stringify(newState.requirements.map(r => ({ id: r.id, status: r.status, isCompiling: r.isCompiling })));

    if (oldReqsStr !== newReqsStr || oldState.acceptingSubmissions !== newState.acceptingSubmissions) {
      console.log('Detected queue status change inside background tick, broadcasting updates...');
      broadcastState();
    }
  } catch (err) {
    console.error('Error in background queue tick process:', err);
  }
}, 5000);

server.listen(port, () => {
  console.log(`WebSocket Companion Server running at http://localhost:${port}`);
});
