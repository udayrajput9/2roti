import React, { useState, useEffect } from 'react';

export default function SplashScreen({ onFinish }) {
  const [phaseText, setPhaseText] = useState('Fresh roti on the way');
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const steps = [
      { time: 600, text: 'Piping hot 🔥' },
      { time: 1400, text: 'Rider on the way 🛵' },
      { time: 2100, text: 'Delivered! 🎉' }
    ];

    const timeouts = steps.map(s =>
      setTimeout(() => {
        setPhaseText(s.text);
      }, s.time)
    );

    const finishTimeout = setTimeout(() => {
      setIsFadingOut(true);
      setTimeout(() => {
        if (onFinish) onFinish();
      }, 500);
    }, 2600);

    return () => {
      timeouts.forEach(clearTimeout);
      clearTimeout(finishTimeout);
    };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 bg-[#0E0E0E] flex flex-col items-center justify-center transition-opacity duration-500 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_45%,rgba(255,87,34,0.18)_0%,transparent_70%)] pointer-events-none animate-[glowPulse_4s_ease-in-out_infinite_alternate]" />

      {/* Squircle logo wrapper */}
      <div className="relative w-48 h-48 sm:w-52 sm:h-52 bg-gradient-to-br from-white to-[#ececec] rounded-[48px] flex items-center justify-center shadow-[0_24px_70px_rgba(255,87,34,0.55),0_8px_24px_rgba(0,0,0,0.5)] border border-[rgba(255,140,0,0.2)] animate-[squircleFloat_3.5s_ease-in-out_infinite]">
        
        {/* Pulse rings */}
        <div className="absolute -inset-1 rounded-[52px] border-2 border-[rgba(255,87,34,0.65)] animate-[ringPulse_2.2s_ease-out_infinite]" />
        <div className="absolute -inset-1 rounded-[52px] border-2 border-[rgba(255,140,0,0.35)] animate-[ringPulse_2.2s_ease-out_0.8s_infinite]" />

        {/* Animated 2 Roti SVG */}
        <svg className="w-36 h-36 overflow-visible" viewBox="0 0 160 170" fill="none">
          <defs>
            <radialGradient id="pinGrad" cx="38%" cy="28%" r="65%">
              <stop offset="0%" stopColor="#FF7043" />
              <stop offset="60%" stopColor="#F4511E" />
              <stop offset="100%" stopColor="#BF360C" />
            </radialGradient>
            <radialGradient id="pinInner" cx="50%" cy="50%" r="50%">
              <stop offset="60%" stopColor="#C62800" />
              <stop offset="100%" stopColor="#8B1500" />
            </radialGradient>
            <radialGradient id="rotiGrad" cx="38%" cy="32%" r="62%">
              <stop offset="0%" stopColor="#FFF3C4" />
              <stop offset="25%" stopColor="#FFE082" />
              <stop offset="55%" stopColor="#FFCA28" />
              <stop offset="80%" stopColor="#F5A623" />
              <stop offset="100%" stopColor="#D4780A" />
            </radialGradient>
            <radialGradient id="charGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#B8660A" stopOpacity="0.65" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <linearGradient id="swooshG" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FF5722" stopOpacity="0" />
              <stop offset="40%" stopColor="#FF7043" />
              <stop offset="100%" stopColor="#FF9800" />
            </linearGradient>
            <clipPath id="pinHole">
              <circle cx="80" cy="78" r="36" />
            </clipPath>
          </defs>

          {/* PIN GROUP */}
          <g className="origin-[80px_140px] animate-[pinDrop_0.8s_cubic-bezier(0.34,1.56,0.64,1)_0.2s_both]">
            {/* PIN BODY */}
            <g className="origin-[80px_80px] animate-[pinBreath_2.8s_ease-in-out_1s_infinite]">
              <path
                d="M80 8 C48 8 22 34 22 66 C22 100 80 152 80 152 C80 152 138 100 138 66 C138 34 112 8 80 8 Z"
                fill="url(#pinGrad)"
              />
              <path
                d="M80 8 C48 8 22 34 22 66 C22 100 80 152 80 152 C80 152 138 100 138 66 C138 34 112 8 80 8 Z"
                fill="none"
                stroke="rgba(100,20,0,0.25)"
                strokeWidth="3"
              />
              <path
                d="M44 28 Q52 16 68 14 Q80 12 88 16"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="5"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx="80" cy="78" r="40" fill="url(#pinInner)" opacity="0.6" />
              <circle cx="80" cy="78" r="36" fill="rgba(255,255,255,0.1)" />
            </g>

            {/* ROTI SPINNING INSIDE HOLE */}
            <g className="origin-[80px_78px] animate-[rotiSpin_3s_linear_infinite]" clipPath="url(#pinHole)">
              <g className="origin-[80px_78px] animate-[rotiPuff_1.5s_ease-in-out_infinite_alternate]">
                <circle cx="80" cy="78" r="34" fill="url(#rotiGrad)" />
                <circle cx="80" cy="78" r="18" fill="url(#charGrad)" />
                <circle cx="80" cy="78" r="34" fill="none" stroke="rgba(210,140,10,0.5)" strokeWidth="2" />
                <circle cx="80" cy="78" r="26" fill="none" stroke="rgba(255,220,80,0.2)" strokeWidth="3" />
              </g>
            </g>

            {/* Pin hole border */}
            <circle cx="80" cy="78" r="36" fill="none" stroke="#E64A19" strokeWidth="3.5" />

            {/* Swoosh arcs */}
            <path
              d="M 20 108 Q 38 126 60 122 Q 80 118 104 122 Q 128 126 145 112"
              stroke="url(#swooshG)"
              strokeWidth="5.5"
              strokeLinecap="round"
              fill="none"
              className="[stroke-dasharray:60] [stroke-dashoffset:60] animate-[swooshDraw_1.8s_ease-in-out_1.2s_infinite]"
            />
            <path
              d="M 12 116 Q 28 128 46 126"
              stroke="#FF7043"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              opacity="0.7"
              className="[stroke-dasharray:30] [stroke-dashoffset:30] animate-[swooshDraw_1.8s_ease-in-out_1.5s_infinite]"
            />

            {/* Pin tip dot */}
            <circle cx="80" cy="148" r="4" fill="rgba(255,87,34,0.8)" className="origin-[80px_148px] animate-[tipPing_2s_ease-out_infinite]" />
          </g>
        </svg>
      </div>

      {/* Brand Name Title */}
      <div className="mt-6 text-center">
        <h1 className="text-3xl font-black tracking-tight text-white flex items-center justify-center gap-1.5">
          <span className="text-[#FF5722]">2</span> ROTI
        </h1>
        <p className="text-xs uppercase tracking-widest text-neutral-400 mt-1 font-medium">
          Campus Food & Quick Delivery
        </p>
      </div>

      {/* Progress & Phases */}
      <div className="mt-8 w-56 text-center">
        <div className="text-xs font-semibold text-neutral-300 mb-2.5 h-4 transition-all duration-300">
          {phaseText}
        </div>
        <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#FF5722] via-[#FF9800] to-[#FF5722] rounded-full animate-[fillBar_2.5s_cubic-bezier(0.4,0,0.2,1)_forwards]" />
        </div>
        <div className="flex justify-center gap-1.5 mt-2.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#FF5722] animate-[dotBounce_1.1s_ease-in-out_infinite]" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#FF5722] animate-[dotBounce_1.1s_ease-in-out_0.2s_infinite]" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#FF5722] animate-[dotBounce_1.1s_ease-in-out_0.4s_infinite]" />
        </div>
      </div>
    </div>
  );
}
