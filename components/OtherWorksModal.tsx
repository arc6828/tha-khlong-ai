'use client';

import React, { useEffect } from 'react';

interface OtherWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OtherWorksModal: React.FC<OtherWorksModalProps> = ({ isOpen, onClose }) => {
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

  const works = [
    {
      id: 'work-1',
      title: 'ระบบจำแนกพรรณไม้ (Plant ID) 🌱',
      description: 'ระบบจำแนกและวิเคราะห์ชนิดพรรณไม้อัจฉริยะจากภาพถ่าย โดยใช้โมเดล Deep Learning (เช่น CNNs, ViTs) ร่วมกับฐานข้อมูลพืชระดับสากล เพื่อระบุข้อมูลทางชีววิทยาและลักษณะของพืชอัตโนมัติ รองรับการวิเคราะห์ทางหน้าเว็บและการแชทส่งรูปถ่ายผ่าน LINE Chatbot',
      tags: ['Laravel 11', 'Bootstrap 5', 'Deep Learning', 'LINE API'],
      url: 'https://plants.samkhok.org/',
      icon: '🌱',
      gradient: 'from-emerald-600 to-teal-500'
    },
    {
      id: 'work-2',
      title: 'SmartZoo - จำแนกสายพันธุ์สัตว์ด้วย AI 🐾',
      description: 'เว็บแอปพลิเคชันระบุและวิเคราะห์สายพันธุ์สัตว์ป่าและสัตว์เลี้ยงจากภาพถ่ายด้วยระบบ AI ของ Gemini เพื่อรายงานข้อมูลทางชีววิทยา ถิ่นอยู่อาศัย และบันทึกประวัติการสแกนแบบพรีเมียม รองรับการเปิดกล้องสแกนสดและบริการวิเคราะห์ตอบกลับผ่าน LINE Chatbot',
      tags: ['Next.js', 'Gemini API', 'LINE API', 'Tailwind CSS'],
      url: 'https://smartzoo.ckartisan.com',
      icon: '🐾',
      gradient: 'from-orange-500 to-amber-600'
    }
  ];

  return (
    <div 
      className="fixed inset-0 bg-[#040914]/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-[#0b0f19]/95 border border-zinc-800 rounded-3xl max-w-4xl w-full p-6 md:p-8 relative shadow-2xl overflow-y-auto max-h-[90vh] animate-scaleUp text-white"
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
            💼
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400">
              ผลงานสร้างสรรค์อื่น ๆ ของพวกเรา
            </h2>
            <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mt-0.5">Our Other Projects Portfolio</p>
          </div>
        </div>

        <hr className="border-zinc-800/80 mb-6" />

        {/* Portfolio Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {works.map((work) => (
            <div 
              key={work.id}
              className="bg-zinc-950/40 border border-zinc-850 hover:border-zinc-700/60 rounded-2xl p-5 md:p-6 flex flex-col justify-between transition-all duration-300 group shadow-md hover:shadow-xl relative"
            >
              <div>
                {/* Icon inside gradient circle */}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${work.gradient} flex items-center justify-center text-2xl shadow-md mb-4 group-hover:scale-105 transition-transform`}>
                  {work.icon}
                </div>
                
                <h3 className="text-base font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">
                  {work.title}
                </h3>
                
                <p className="text-zinc-400 text-xs leading-relaxed mb-4">
                  {work.description}
                </p>
              </div>

              <div>
                {/* Tech tags */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {work.tags.map((tag) => (
                    <span 
                      key={tag}
                      className="text-[9px] bg-zinc-900/80 border border-zinc-800 text-zinc-400 font-semibold px-2 py-0.5 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Clickable Outbound Link */}
                <a 
                  href={work.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white font-bold text-xs transition-colors border border-zinc-800 hover:border-zinc-750/80 shadow cursor-pointer gap-1.5"
                >
                  🔗 ไปยังซอร์สโค้ด / หน้าผลงานจริง
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="mt-8 pt-4 border-t border-zinc-800/40 text-center text-zinc-600 text-xs">
          Tha Khlong Community Projects &copy; 2026. ออกแบบเพื่อพัฒนานวัตกรรมทางการศึกษา
        </div>
      </div>
    </div>
  );
};
