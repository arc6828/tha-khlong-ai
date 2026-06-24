'use client';

import React, { useRef, useEffect } from 'react';

interface CanvasEffectsProps {
  effect: 'none' | 'confetti' | 'snow' | 'bubbles';
}

export function CanvasEffects({ effect }: CanvasEffectsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    interface SnowParticle {
      x: number;
      y: number;
      r: number;
      d: number;
      swing: number;
      swingSpeed: number;
    }

    interface ConfettiParticle {
      x: number;
      y: number;
      w: number;
      h: number;
      color: string;
      vx: number;
      vy: number;
      rotation: number;
      rotationSpeed: number;
    }

    interface BubbleParticle {
      x: number;
      y: number;
      r: number;
      speed: number;
      wobble: number;
      wobbleSpeed: number;
    }

    const snowParticles: SnowParticle[] = [];
    const confettiParticles: ConfettiParticle[] = [];
    const bubbleParticles: BubbleParticle[] = [];

    // เริ่มต้นตัวแปรพาร์ติเคิลตามเอฟเฟกต์ที่เลือก
    if (effect === 'snow') {
      for (let i = 0; i < 70; i++) {
        snowParticles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * 3 + 1,
          d: Math.random() * 0.8 + 0.3,
          swing: Math.random() * 2 * Math.PI,
          swingSpeed: Math.random() * 0.015 + 0.005
        });
      }
    } else if (effect === 'confetti') {
      const colors = [
        '#f43f5e', '#ec4899', '#d946ef', '#a855f7', 
        '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', 
        '#f59e0b', '#ef4444'
      ];
      for (let i = 0; i < 80; i++) {
        confettiParticles.push({
          x: Math.random() * width,
          y: Math.random() * height - height,
          w: Math.random() * 6 + 5,
          h: Math.random() * 12 + 8,
          color: colors[Math.floor(Math.random() * colors.length)],
          vx: Math.random() * 4 - 2,
          vy: Math.random() * 2 + 2,
          rotation: Math.random() * 360,
          rotationSpeed: Math.random() * 4 - 2
        });
      }
    } else if (effect === 'bubbles') {
      for (let i = 0; i < 30; i++) {
        bubbleParticles.push({
          x: Math.random() * width,
          y: height + Math.random() * 100,
          r: Math.random() * 12 + 4,
          speed: Math.random() * 1.2 + 0.4,
          wobble: Math.random() * 2 * Math.PI,
          wobbleSpeed: Math.random() * 0.015 + 0.005
        });
      }
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      if (effect === 'snow') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        snowParticles.forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();

          p.y += p.d;
          p.swing += p.swingSpeed;
          p.x += Math.sin(p.swing) * 0.3;

          // วนลูปกลับไปด้านบน
          if (p.y > height) {
            p.y = -10;
            p.x = Math.random() * width;
          }
        });
      } else if (effect === 'confetti') {
        confettiParticles.forEach(p => {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();

          p.x += p.vx;
          p.y += p.vy;
          p.rotation += p.rotationSpeed;

          // วนลูปกลับไปด้านบน
          if (p.y > height) {
            p.y = -20;
            p.x = Math.random() * width;
          }
        });
      } else if (effect === 'bubbles') {
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
        ctx.fillStyle = 'rgba(6, 182, 212, 0.03)';
        ctx.lineWidth = 1.2;
        bubbleParticles.forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          p.y -= p.speed;
          p.wobble += p.wobbleSpeed;
          p.x += Math.sin(p.wobble) * 0.3;

          // วนลูปกลับไปด้านล่าง
          if (p.y < -p.r * 2) {
            p.y = height + Math.random() * 50;
            p.x = Math.random() * width;
          }
        });
      }

      animationId = requestAnimationFrame(draw);
    };

    if (effect !== 'none') {
      draw();
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, [effect]);

  if (effect === 'none') return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-20"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
