'use client';

import React, { useEffect } from 'react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-[#040914]/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-[#0b0f19]/95 border border-zinc-800 rounded-3xl max-w-2xl w-full p-6 md:p-8 relative shadow-2xl overflow-y-auto max-h-[90vh] animate-scaleUp text-white"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:text-white flex items-center justify-center font-bold text-zinc-400 text-sm transition-colors cursor-pointer"
          title="ปิดหน้าต่าง"
        >
          ✕
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-xl shadow-lg select-none">
            🎨
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400">
              เกี่ยวกับโปรเจกต์ Tha Khlong AI
            </h2>
            <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mt-0.5">Project Overview & Mission</p>
          </div>
        </div>

        <hr className="border-zinc-800/80 mb-6" />

        {/* Content Details */}
        <div className="space-y-6 text-sm text-zinc-300 leading-relaxed">
          <p>
            <strong>Tha Khlong AI Art Gallery</strong> คือระบบหอศิลป์ดิจิทัลจำลองที่สร้างขึ้นเพื่อให้เด็กนักเรียน
            สามารถมีส่วนร่วมและส่งแนวคิดสร้างสรรค์ผ่านการเขียน <strong className="text-cyan-400">Prompt ภาษาไทย</strong> เพื่อสั่งให้ AI (ปัญญาประดิษฐ์) วาดภาพแบบเวกเตอร์ออกมาจัดแสดงบนบอร์ดอิสระของตนเองได้แบบเรียลไทม์
          </p>

          {/* Key Features list */}
          <div>
            <h3 className="text-white font-bold mb-3 flex items-center gap-2">
              <span>🚀 ฟีเจอร์หลักของระบบ</span>
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-1">
              <li className="flex gap-2.5 items-start bg-zinc-950/40 p-3 rounded-xl border border-zinc-900">
                <span className="text-purple-400 text-sm">🤖</span>
                <div>
                  <h4 className="text-xs font-bold text-white mb-0.5">Google Gemini API</h4>
                  <p className="text-[11px] text-zinc-400">วิเคราะห์คำสั่งภาษาไทยและวาดเขียนภาพออกมาในรูปแบบโค้ด SVG ดิบ</p>
                </div>
              </li>
              <li className="flex gap-2.5 items-start bg-zinc-950/40 p-3 rounded-xl border border-zinc-900">
                <span className="text-pink-400 text-sm">⚡</span>
                <div>
                  <h4 className="text-xs font-bold text-white mb-0.5">FIFO Real-time Queue</h4>
                  <p className="text-[11px] text-zinc-400">ระบบจัดสรรคิวงานแสดงผลแบบเรียลไทม์ (WebSockets) อัปเดตพร้อมกันทั่วห้องเรียน</p>
                </div>
              </li>
              <li className="flex gap-2.5 items-start bg-zinc-950/40 p-3 rounded-xl border border-zinc-900">
                <span className="text-cyan-400 text-sm">✨</span>
                <div>
                  <h4 className="text-xs font-bold text-white mb-0.5">Themes & Ambient Effects</h4>
                  <p className="text-[11px] text-zinc-400">ตัวปรับแต่งธีมสไตล์บอร์ด เช่น อวกาศ, นีออน พร้อมเอฟเฟกต์หิมะ ฟองสบู่ ลอยฟุ้ง</p>
                </div>
              </li>
              <li className="flex gap-2.5 items-start bg-zinc-950/40 p-3 rounded-xl border border-zinc-900">
                <span className="text-indigo-400 text-sm">⚙️</span>
                <div>
                  <h4 className="text-xs font-bold text-white mb-0.5">Teacher Admin Controls</h4>
                  <p className="text-[11px] text-zinc-400">เครื่องมือสำหรับคุณครูผู้สอนในการควบคุม เปิด/ปิด รับบอร์ด และจัดการสถานะคิว</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Tech Stack Badge Section */}
          <div className="pt-4 border-t border-zinc-800/60">
            <h3 className="text-white font-bold mb-3 text-xs uppercase tracking-wider text-zinc-400">🛠️ เทคโนโลยีเบื้องหลัง</h3>
            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 font-semibold px-2.5 py-1 rounded-lg">Next.js 16 (React 19)</span>
              <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 font-semibold px-2.5 py-1 rounded-lg">Tailwind CSS v4</span>
              <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 font-semibold px-2.5 py-1 rounded-lg">WS Library (WebSockets)</span>
              <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 font-semibold px-2.5 py-1 rounded-lg">SQLite (better-sqlite3)</span>
              <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 font-semibold px-2.5 py-1 rounded-lg">Google Gemini 2.5 Flash</span>
            </div>
          </div>
        </div>

        {/* Footer buttons */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-bold text-xs transition-colors cursor-pointer"
          >
            ตกลง, ปิดหน้าต่างนี้
          </button>
        </div>
      </div>
    </div>
  );
};
