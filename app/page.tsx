'use client';

import React, { useState, useEffect } from 'react';
import { CanvasEffects } from '@/components/CanvasEffects';

interface Requirement {
  id: string;
  text: string;
  author: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  theme: 'default' | 'space' | 'pink' | 'matrix' | 'neon';
  effect: 'none' | 'confetti' | 'snow' | 'bubbles';
  stamps: string[];
  generatedSvg: string;
  isCompiling: boolean;
  startedAt: number | null;
  createdAt: number;
  drawActions: unknown[];
  processingTime?: number;
}

interface AppState {
  requirements: Requirement[];
  acceptingSubmissions: boolean;
  geminiApiKey: string;
}



export default function Home() {
  const [state, setState] = useState<AppState | null>(null);
  const [name, setName] = useState('');
  const [newReqText, setNewReqText] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // สเตตกระดานแคนวาสที่เลือกชมขนาดใหญ่ (Lightbox Mode)
  const [activeCanvasId, setActiveCanvasId] = useState<string | null>(null);

  // 1. เชื่อมต่อระบบเรียลไทม์ผ่าน WebSockets
  useEffect(() => {
    // โหลดข้อมูลสเตตเริ่มต้นทันทีเพื่อไม่ให้ค้างหน้าโหลดดิ้ง
    const fetchInitialState = async () => {
      try {
        const res = await fetch('/api/sync');
        if (res.ok) {
          const data: AppState = await res.json();
          setState(data);
        }
      } catch (err) {
        console.error('Error fetching initial state:', err);
      }
    };

    fetchInitialState();

    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isComponentMounted = true;

    const connect = () => {
      if (!isComponentMounted) return;

      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = window.location.protocol === 'https:'
        ? `${wsProtocol}//${window.location.host}/ws`
        : `${wsProtocol}//${window.location.hostname}:3004`;
      
      console.log(`Connecting to WebSocket: ${wsUrl}`);
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const data: AppState = JSON.parse(event.data);
          setState(data);
        } catch (err) {
          console.error('Error parsing AppState from WebSocket:', err);
        }
      };

      ws.onclose = (event) => {
        if (isComponentMounted) {
          console.log('WebSocket connection closed. Retrying in 3 seconds...', event.reason);
          reconnectTimeout = setTimeout(connect, 3000);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket connection error:', err);
      };
    };

    connect();

    return () => {
      isComponentMounted = false;
      if (ws) {
        ws.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  // 2. อัปเดตจับเวลานับถอยหลังภายในเบราว์เซอร์
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 200);
    return () => clearInterval(timer);
  }, []);

  // โหลดชื่อของเด็กจาก localStorage ในการใช้งานครั้งแรก
  useEffect(() => {
    const storedName = localStorage.getItem('student_name');
    if (storedName) {
      setTimeout(() => {
        setName(storedName);
      }, 0);
    }
  }, []);

  // สังเคราะห์เสียงเอฟเฟกต์ Web Audio API
  const playSynthSound = (type: string) => {
    if (typeof window === 'undefined') return;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      const nowNode = ctx.currentTime;

      if (type === 'stamp') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(600, nowNode);
        osc.frequency.exponentialRampToValueAtTime(100, nowNode + 0.15);
        gain.gain.setValueAtTime(0.08, nowNode);
        gain.gain.linearRampToValueAtTime(0.001, nowNode + 0.15);
        osc.start(nowNode);
        osc.stop(nowNode + 0.18);
      } else if (type === 'clear') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(200, nowNode);
        osc.frequency.exponentialRampToValueAtTime(800, nowNode + 0.3);
        gain.gain.setValueAtTime(0.1, nowNode);
        gain.gain.linearRampToValueAtTime(0.001, nowNode + 0.3);
        osc.start(nowNode);
        osc.stop(nowNode + 0.33);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ส่งข้อมูลเพื่อสร้างกระดานใหม่
  const handleCreateCanvasSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !newReqText.trim()) {
      alert('กรุณากรอกชื่อเล่นและหัวข้อที่จะให้ AI วาดรูปด้วยนะจ๊ะ!');
      return;
    }
    
    localStorage.setItem('student_name', name.trim());

    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_requirement',
          payload: { text: newReqText, author: name }
        })
      });
      if (res.ok) {
        const data = await res.json();
        setState(data);
        setNewReqText('');
        setCreateModalOpen(false);
        playSynthSound('stamp');
        
        // เข้าแถวรอคิวสำเร็จ เปิดตัวแรก
        if (data.requirements && data.requirements.length > 0) {
          const sorted = [...data.requirements];
          const newest = sorted[sorted.length - 1];
          // ตั้งค่าให้ออโต้พรีวิวหรือแจ้งเด็กในคิว
          setActiveCanvasId(newest.id);
        }
      } else {
        const err = await res.json();
        alert(err.error || 'ส่งข้อมูลไม่สำเร็จ');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ปรับแต่งตั้งค่าธีมหรือเอฟเฟกต์ของกระดานนี้
  const handleUpdateCanvasSettings = async (targetTheme: string | null, targetEffect: string | null) => {
    if (!activeCanvasId) return;
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_canvas_settings',
          payload: {
            canvasId: activeCanvasId,
            theme: targetTheme || undefined,
            effect: targetEffect || undefined
          }
        })
      });
      if (res.ok) {
        const data = await res.json();
        setState(data);
        playSynthSound('stamp');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // คำสั่งแผงควบคุมคุณครู (Admin Controls)
  const handleAdminControl = async (type: string, canvasId?: string) => {
    playSynthSound('clear');
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'admin_control',
          payload: {
            type,
            canvasId
          }
        })
      });
      if (res.ok) {
        const data = await res.json();
        setState(data);
        if (type === 'delete_canvas' && activeCanvasId === canvasId) {
          setActiveCanvasId(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!state) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#070b19] font-sans">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-purple-300 text-lg tracking-wider animate-pulse">กำลังเข้าสู่ระบบหอศิลป์ภาพวาด AI Tha Khlong...</p>
      </div>
    );
  }

  // หากระดานที่กำลังเปิดพรีวิวขนาดใหญ่
  const activeCanvas = state.requirements.find(c => c.id === activeCanvasId);



  // ปรับเอฟเฟกต์ตามกระดานที่เปิดใช้งาน
  let currentEffect: 'none' | 'confetti' | 'snow' | 'bubbles' = 'none';
  if (activeCanvas) {
    currentEffect = activeCanvas.effect;
  }

  return (
    <div className="min-h-screen flex flex-col transition-all duration-700 relative pb-16 bg-[#0b0f19] theme-space">
      {/* เอฟเฟกต์สภาพแวดล้อม (Confetti / หิมะตก / ฟองอากาศ) */}
      <CanvasEffects effect={currentEffect} />

      {/* ==================== แฮดเดอร์หลัก ==================== */}
      <header className="border-b border-zinc-800 bg-zinc-950/70 backdrop-blur-md px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 via-pink-500 to-cyan-400 flex items-center justify-center font-bold text-white shadow-lg animate-pulse select-none">
            🎨
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 uppercase">
              Tha Khlong AI Art Gallery 🚀
            </h1>
            <p className="text-zinc-400 text-[11px] font-medium">คลังสะสมผลงานการออกแบบแคนวาส AI แยกบอร์ดอิสระของเด็ก ๆ ในห้องเรียน</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800 px-3 py-1.5 rounded-full shadow-inner select-none">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
          <span className="text-zinc-300 text-[10px] font-bold">ห้องแสดงผลงานแยกการ์ด ({state.requirements.length} ชิ้นงาน)</span>
        </div>
      </header>

      {/* ==================== 1. ส่วนแสดงผลตารางคลังภาพ Grid และกล่องสร้างบอร์ดด้านซ้าย ==================== */}
      <main className="max-w-7xl mx-auto w-full p-4 md:p-6 flex-1 flex flex-col lg:flex-row gap-6 items-start">
        
        {/* แผงซ้าย: สั่ง AI และแอดมินคุณครู */}
        <section className="w-full lg:w-80 flex flex-col gap-6 shrink-0">
          
          {/* ฟอร์มสร้างแคนวาส AI บอร์ดใหม่ */}
          <div className="p-6 rounded-3xl border border-zinc-850 bg-zinc-900/40 backdrop-blur-md text-white shadow-lg">
            <h3 className="text-base font-bold mb-3 flex items-center gap-2">
              <span>🤖 สั่งให้ AI วาดรูปชิ้นงานใหม่</span>
            </h3>
            
            {state.acceptingSubmissions ? (
              <form onSubmit={handleCreateCanvasSubmit} className="flex flex-col gap-3">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1 font-semibold">ชื่อเล่นของคุณ:</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="เช่น น้องภูมิ, น้องบีม"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-purple-500 transition-colors"
                    maxLength={20}
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1 font-semibold">ไอเดียภาพเวกเตอร์ (ภาษาไทย):</label>
                  <textarea
                    rows={3}
                    value={newReqText}
                    onChange={(e) => setNewReqText(e.target.value)}
                    placeholder="เช่น ปราสาทอวกาศดาวเสาร์, สวนสัตว์คริสต์มาสในหิมะ, แมวพาสเทลบนปุยเมฆสีชมพู"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-purple-500 transition-colors resize-none"
                    maxLength={85}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-bold text-xs transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                >
                  🚀 ส่งให้ AI วาดภาพแยกบอร์ด
                </button>
              </form>
            ) : (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-center text-xs">
                🔒 ปิดรับคิวเสนอผลงานเพิ่มเติมชั่วคราว
              </div>
            )}
          </div>

          {/* ประวัติคิวการทำงาน (FIFO Queue List) */}
          <div className="p-6 rounded-3xl border border-zinc-850 bg-zinc-900/40 backdrop-blur-md text-white shadow-lg">
            <h3 className="text-sm font-bold mb-3 flex justify-between items-center">
              <span>📋 สถานะแถวคิววาดรูป</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                {state.requirements.filter(r => r.status === 'pending' || r.status === 'processing').length} คิวรอ
              </span>
            </h3>
            <div className="flex flex-col gap-2 max-h-40 overflow-y-auto scrollbar-none">
              {state.requirements.filter(r => r.status === 'pending' || r.status === 'processing').length > 0 ? (
                state.requirements
                  .filter(r => r.status === 'pending' || r.status === 'processing')
                  .map((req, idx) => (
                    <div 
                      key={req.id} 
                      className={`p-2 rounded-lg text-xs flex items-center justify-between gap-2 border ${
                        req.status === 'processing' 
                          ? 'bg-purple-950/40 border-purple-500/30 text-purple-300 animate-pulse' 
                          : 'bg-zinc-950/80 border-zinc-850 text-zinc-400'
                      }`}
                    >
                      <span className="truncate font-medium">
                        {req.status === 'processing' ? '🟢 กำลังวาด: ' : `⏳ คิวที่ #${idx + 1}: `}
                        &quot;{req.text}&quot;
                      </span>
                      <span className="shrink-0 font-bold bg-zinc-900 px-1.5 py-0.5 rounded text-[10px] text-zinc-500">
                        {req.author}
                      </span>
                    </div>
                  ))
              ) : (
                <div className="text-[10px] text-zinc-500 italic text-center py-2">
                  ไม่มีคิวประมวลผลค้างอยู่
                </div>
              )}
            </div>
          </div>

        </section>

        {/* แผงขวา: ตารางผลงาน Grid แฟลตบอร์ด */}
        <section className="flex-1 w-full">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* บล็อกสร้างชิ้นงานแบบด่วน (Quick Creation Card) */}
            <div 
              onClick={() => {
                setCreateModalOpen(true);
                playSynthSound('stamp');
              }}
              className="group aspect-[4/3] rounded-3xl border-2 border-dashed border-zinc-800 hover:border-purple-500/60 bg-zinc-950/20 hover:bg-purple-950/5 flex flex-col justify-center items-center gap-3 cursor-pointer transition-all duration-300 shadow-md"
            >
              <div className="w-11 h-11 rounded-full bg-zinc-900 group-hover:bg-purple-600/20 group-hover:text-purple-400 flex items-center justify-center font-bold text-lg text-zinc-500 transition-all">
                ＋
              </div>
              <div className="text-center">
                <div className="text-xs font-bold text-zinc-400 group-hover:text-purple-300 transition-all">สร้างกระดาน AI ใบใหม่</div>
                <div className="text-[9px] text-zinc-600 mt-1">ส่ง Prompt และรอแถวคิววาดรูปภาพ</div>
              </div>
            </div>

            {/* แสดงการ์ดผลงานของแต่ละบอร์ด */}
            {[...state.requirements]
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((req) => {
              // คำนวณเปอร์เซ็นต์สำหรับ Live compiler แบบการ์ดเดี่ยว
              let percent = 100;
              if (req.isCompiling && req.startedAt) {
                const elapsed = now - req.startedAt;
                percent = Math.min(100, Math.floor((elapsed / 5000) * 100));
              }

              return (
                <div 
                  key={req.id}
                  className="bg-zinc-950/50 backdrop-blur-sm rounded-3xl border border-zinc-800 hover:border-zinc-700 transition-all duration-300 overflow-hidden flex flex-col shadow-lg hover:shadow-2xl relative group"
                >
                  
                  {/* มินิพรีวิวภาพ SVG */}
                  <div className="w-full aspect-[4/3] bg-zinc-900 border-b border-zinc-800/80 flex items-center justify-center overflow-hidden relative select-none pointer-events-none">
                    
                    {/* แทรก SVG ขนาดจำลอง scale */}
                    <div className="w-[800px] h-[600px] scale-[0.35] origin-center shrink-0 pointer-events-none relative">
                      {req.generatedSvg && (
                        <div 
                          className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden [&>svg]:w-full [&>svg]:h-full [&>svg]:absolute [&>svg]:inset-0" 
                          dangerouslySetInnerHTML={{ __html: req.generatedSvg }}
                        />
                      )}
                    </div>

                    {/* ถ้าไม่มีรูปวาดแสดงพื้นหลังโลโก้จางๆ */}
                    {!req.generatedSvg && (
                      <div className="absolute inset-0 flex items-center justify-center text-zinc-700 text-3xl font-bold">
                        🎨
                      </div>
                    )}

                    {/* ⏳ บล็อกต่อแถวรอคิวสำหรับบอร์ดที่มีสถานะ pending */}
                    {req.status === 'pending' && (
                      <div className="absolute inset-0 bg-[#070b19]/95 z-20 flex flex-col justify-center items-center p-4 text-center">
                        <span className="text-3xl animate-bounce mb-3 select-none">⏳</span>
                        <h4 className="text-xs font-bold text-white mb-1">ต่อแถวรอคิว AI วาดภาพ</h4>
                        <span className="text-[10px] text-purple-400 font-semibold mb-2 bg-purple-950/50 px-3 py-1 rounded-full border border-purple-800/40">
                          ลำดับคิวในห้องเรียน: #{state.requirements.filter(r => r.status === 'pending').findIndex(r => r.id === req.id) + 1}
                        </span>
                        <span className="text-[8px] text-zinc-500 max-w-[180px] truncate">
                          &quot;{req.text}&quot;
                        </span>
                      </div>
                    )}

                    {/* ❌ บล็อกเมื่อเกิดข้อผิดพลาดสำหรับบอร์ดที่มีสถานะ failed */}
                    {req.status === 'failed' && (
                      <div className="absolute inset-0 bg-red-950/95 z-20 flex flex-col justify-center items-center p-4 text-center">
                        <span className="text-3xl animate-pulse mb-3 select-none">❌</span>
                        <h4 className="text-xs font-bold text-red-200 mb-1">การสร้างภาพล้มเหลว</h4>
                        <span className="text-[9px] text-red-400 font-semibold mb-2 bg-red-950/50 px-3 py-1 rounded-full border border-red-800/40">
                          Gemini API Error
                        </span>
                        <span className="text-[8px] text-zinc-300 max-w-[180px] truncate mb-2">
                          &quot;{req.text}&quot;
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAdminControl('delete_canvas', req.id);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-red-800 hover:bg-red-700 text-white text-[9px] font-bold transition-colors cursor-pointer pointer-events-auto"
                        >
                          ลบการ์ดนี้
                        </button>
                      </div>
                    )}

                    {/* ตัวคอมไพล์โค้ดของการ์ดใบนี้ (เมื่อถึงคิวรันและเริ่มประมวลผล) */}
                    {req.status === 'processing' && req.isCompiling && (
                      <div className="absolute inset-0 bg-black/95 z-20 flex flex-col justify-center items-center p-3 text-center">
                        <div className="scanner-line !h-1" />
                        <div className="relative w-12 h-12 flex items-center justify-center mb-3">
                          <div className="absolute inset-0 rounded-full border-4 border-purple-500/20" />
                          <div className="absolute inset-0 rounded-full border-4 border-t-purple-500 animate-spin" />
                          <span className="text-[10px] font-mono text-white font-bold">{percent}%</span>
                        </div>
                        <h4 className="text-xs font-bold text-white mb-0.5">Google AI Coding...</h4>
                        <span className="text-[8px] text-green-400 font-mono animate-pulse bg-green-950/50 px-2 py-0.5 rounded max-w-[180px] truncate">
                          {req.text}
                        </span>
                      </div>
                    )}

                    {/* ปุ่มเปิดแก้ไขด่วนเมื่อเอาเม้าส์ไปชี้การ์ด (เฉพาะกระดานที่วาดเสร็จสมบูรณ์แล้ว) */}
                    {req.status === 'completed' && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 flex items-center justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveCanvasId(req.id);
                            playSynthSound('stamp');
                          }}
                          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg active:scale-95 transition-transform flex items-center gap-1 cursor-pointer pointer-events-auto"
                        >
                          🔍 เปิดชมภาพขนาดใหญ่
                        </button>
                      </div>
                    )}

                  </div>

                  {/* รายละเอียดด้านล่างของการ์ด */}
                  <div className="p-4 flex flex-col justify-between flex-1 gap-2.5">
                    <div>
                      <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">ภาพวาดโดย AI</div>
                      <h3 className="text-sm font-bold text-white line-clamp-2 mt-1 min-h-[2.5rem]" title={req.text}>
                        &quot;{req.text}&quot;
                      </h3>
                    </div>

                    <div className="flex justify-between items-center text-xs text-zinc-400 pt-2 border-t border-zinc-900">
                      <span>โดย: <strong className="text-cyan-400">{req.author}</strong></span>
                      <div className="flex items-center gap-1.5">
                        {req.processingTime && req.processingTime > 0 ? (
                          <span className="text-[9px] text-zinc-600 font-mono" title={`เวลาประมวลผล AI: ${(req.processingTime / 1000).toFixed(1)} วินาที`}>
                            {(req.processingTime / 1000).toFixed(1)}s
                          </span>
                        ) : null}
                        <span className="bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-zinc-500 text-[9px] font-bold uppercase">
                          {req.theme}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              );
            })}

          </div>
        </section>

      </main>

      {/* ==================== 2. ห้องพรีวิวพรีเมียมขนาดใหญ่ (Lightbox Studio View) ==================== */}
      {activeCanvasId && activeCanvas && (
        <div className="fixed inset-0 bg-[#040914]/97 z-50 flex flex-col p-4 md:p-6 overflow-y-auto">
          
          {/* ส่วนข้อมูลและปุ่มย้อนกลับด้านบน */}
          <div className="max-w-6xl mx-auto w-full flex justify-between items-center p-4 bg-zinc-900/60 backdrop-blur rounded-2xl border border-zinc-850 gap-4 mb-6 shadow-md shrink-0">
            <div>
              <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">กำลังเปิดชมผลงานศิลปะ AI</div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>🎨 &quot;{activeCanvas.text}&quot;</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  ผู้ออกแบบ: {activeCanvas.author}
                </span>
              </h2>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  setActiveCanvasId(null);
                  playSynthSound('clear');
                }}
                className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-colors border border-zinc-700"
              >
                ✕ ปิดหน้าจอชมภาพ
              </button>
            </div>
          </div>

          {/* ส่วนเนื้อหาหลักในหน้าพรีวิว */}
          <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch flex-1">
            
            {/* ฝั่งซ้าย: แถบตั้งค่าธีมและเอฟเฟกต์ (Customizer Panel) */}
            <section className="bg-zinc-900/50 backdrop-blur rounded-3xl border border-zinc-850 p-5 flex flex-col gap-4 shadow-lg lg:col-span-1 shrink-0">
              
              <div>
                <h3 className="text-sm font-bold text-white mb-1">🛠️ เครื่องมือปรับแต่งบอร์ด</h3>
                <p className="text-[10px] text-zinc-500">คุณสามารถปรับแต่งเปลี่ยนธีมและเอฟเฟกต์สภาพแวดล้อมจำลองของกระดานนี้ได้</p>
              </div>

              <hr className="border-zinc-800" />

              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-[10px] text-zinc-400 font-bold block mb-1">เปลี่ยนสไตล์ธีมสี</label>
                  <select
                    value={activeCanvas.theme}
                    onChange={(e) => handleUpdateCanvasSettings(e.target.value, null)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-semibold text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="default">🌳 ธีมธรรมชาติต้นไม้</option>
                    <option value="space">🪐 ธีมห้วงอวกาศลึกลับ</option>
                    <option value="pink">🍬 ธีมขนมชมพูหวาน</option>
                    <option value="matrix">💻 ธีมดิจิตอลสีเขียว</option>
                    <option value="neon">⚡ ธีมไฟนีออนไซเบอร์</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 font-bold block mb-1">เรียกเปิดใช้สภาพแวดล้อม</label>
                  <select
                    value={activeCanvas.effect}
                    onChange={(e) => handleUpdateCanvasSettings(null, e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-semibold text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="none">❌ ไม่มีเอฟเฟกต์</option>
                    <option value="snow">❄️ หิมะตกโปรยปราย</option>
                    <option value="confetti">🎉 ปล่อยกระดาษสีรุ้งฉลอง</option>
                    <option value="bubbles">🫧 ฟองสบู่ลอยฟ้า</option>
                  </select>
                </div>
              </div>

              <hr className="border-zinc-800" />
              
              <div className="p-3.5 bg-zinc-950/60 rounded-2xl border border-zinc-850/60 text-[10px] text-zinc-500 leading-relaxed">
                📢 <strong>นโยบายความปลอดภัย API:</strong><br />
                Gemini API Key ได้รับการดูแลอย่างเข้มงวดผ่านไฟล์ตั้งค่าเซิร์ฟเวอร์ระบบ ห้ามไม่ให้กรอกหรือกู้คืนคีย์ผ่านหน้ากระดานสาธารณะเพื่อความปลอดภัยสูงสุด
              </div>

              <button 
                onClick={() => handleAdminControl('delete_canvas', activeCanvas.id)}
                className="w-full mt-auto py-2.5 rounded-xl bg-red-950/80 hover:bg-red-900/80 text-red-300 font-bold text-xs transition-colors border border-red-900/30 active:scale-95"
              >
                🗑️ ลบภาพวาดนี้ทิ้ง
              </button>

            </section>

            {/* ฝั่งขวา: พรีวิว SVG ขนาดใหญ่ใหญ่เต็มตา */}
            <section className="lg:col-span-3 flex flex-col items-center justify-center bg-zinc-950/40 border border-zinc-850 rounded-3xl p-4 shadow-lg relative min-h-[460px]">
              
              <div 
                className="w-full max-w-[800px] aspect-[4/3] rounded-2xl overflow-hidden relative border border-zinc-800 bg-white shadow-2xl select-none"
                style={{
                  backgroundColor: 
                    activeCanvas.theme === 'space' ? '#030310' :
                    activeCanvas.theme === 'pink' ? '#fdf2f8' :
                    activeCanvas.theme === 'matrix' ? '#000000' :
                    activeCanvas.theme === 'neon' ? '#0b081a' : '#f0fdf4'
                }}
              >
                {/* อิมเมจเวกเตอร์ SVG ดิบจาก Gemini */}
                {activeCanvas.generatedSvg && (
                  <div 
                    className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden [&>svg]:w-full [&>svg]:h-full [&>svg]:absolute [&>svg]:inset-0 pointer-events-none" 
                    dangerouslySetInnerHTML={{ __html: activeCanvas.generatedSvg }}
                  />
                )}
                
                {/* รหัสประจำบอร์ดสำหรับตรวจสอบ */}
                <div className="absolute bottom-3 right-4 z-20 pointer-events-none font-mono text-[9px] bg-black/60 text-zinc-400 px-2 py-0.5 rounded border border-zinc-800">
                  Tha Khlong Board ID #{activeCanvas.id}
                </div>
              </div>

            </section>

          </div>

        </div>
      )}

      {/* ==================== 3. หน้าต่าง Modal กรอกข้อมูลบอร์ดชิ้นใหม่ ==================== */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#0b0f19] border border-zinc-800 rounded-3xl max-w-md w-full p-6 relative shadow-2xl">
            <button
              onClick={() => {
                setCreateModalOpen(false);
                playSynthSound('clear');
              }}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white font-bold text-sm"
            >
              ✕
            </button>

            <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <span>🤖 สั่งสร้างผลงานศิลปะ AI</span>
            </h3>

            <form onSubmit={handleCreateCanvasSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1 font-semibold">ชื่อเล่นของคุณ:</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น น้องภูมิ, น้องบีม"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-purple-500 transition-colors"
                  maxLength={20}
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 block mb-1 font-semibold">ไอเดียภาพเวกเตอร์ (ภาษาไทย):</label>
                <textarea
                  rows={3}
                  value={newReqText}
                  onChange={(e) => setNewReqText(e.target.value)}
                  placeholder="เช่น ดาวหางพุ่งชนปราสาทสีม่วง, ป่าคริสต์มาสขั้วโลกมีหิมะโปรย, แมวน้อยนอนบนปุยเมฆ"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-purple-500 transition-colors resize-none"
                  maxLength={85}
                  required
                />
              </div>

              <div className="text-[10px] text-zinc-500 leading-relaxed italic">
                * ภาพจะเริ่มจัดเรียงเข้าสู่คิวรอ (FIFO Queue) และสังเคราะห์ภาพด้วย Google Gemini 2.5 Flash ทีละชิ้นงานอย่างปลอดภัย
              </div>

              <div className="grid grid-cols-2 gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCreateModalOpen(false);
                    playSynthSound('clear');
                  }}
                  className="py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 font-bold text-xs transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-bold text-xs transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                >
                  🚀 เจนรูปกระดานเลย!
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== 4. แผงควบคุมสำหรับคุณครู / ครูผู้ช่วยสอน (Teacher Admin Console) ==================== */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 border-t border-zinc-800 px-6 py-3 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] shadow-lg">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setAdminOpen(!adminOpen);
              playSynthSound('stamp');
            }}
            className="flex items-center gap-1.5 font-bold text-zinc-400 hover:text-white transition-colors bg-zinc-900 hover:bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-850"
          >
            ⚙️ <span>{adminOpen ? 'ปิดแผงควบคุมครู' : 'เปิดแผงควบคุมคุณครู'}</span>
          </button>
        </div>

        {adminOpen && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleAdminControl('add_mock_requirements')}
              className="bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg font-bold transition-all active:scale-95 text-white shadow"
            >
              📥 โหลดบอร์ดจำลอง (5 ใบรอคิว)
            </button>
            <button
              onClick={() => handleAdminControl('toggle_submissions')}
              className={`${state.acceptingSubmissions ? 'bg-rose-600 hover:bg-rose-500' : 'bg-green-600 hover:bg-green-500'} px-3 py-1.5 rounded-lg font-bold transition-all active:scale-95 text-white shadow`}
            >
              {state.acceptingSubmissions ? '🔒 ปิดสร้างกระดานเพิ่ม' : '🔓 เปิดสร้างกระดานเพิ่ม'}
            </button>
            <button
              onClick={() => handleAdminControl('clear_queue')}
              className="bg-red-700 hover:bg-red-600 px-3 py-1.5 rounded-lg font-bold transition-all active:scale-95 text-white shadow"
            >
              ❌ ลบทุกกระดานทิ้ง
            </button>
            <button
              onClick={() => handleAdminControl('reset')}
              className="bg-zinc-700 hover:bg-zinc-600 px-3 py-1.5 rounded-lg font-bold transition-all active:scale-95 text-white shadow"
            >
              🔄 รีเซ็ตระบบเริ่มต้น
            </button>
          </div>
        )}

        <div className="text-zinc-500 font-medium">
          Tha Khlong AI Art Gallery &copy; 2026. Powered by Google Gemini in Environment.
        </div>
      </footer>
    </div>
  );
}
