import React from 'react';

interface StarPoint {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  twinkle: boolean;
  delay: string;
}

const STAR_POINTS: StarPoint[] = Array.from({ length: 56 }, (_, index) => {
  const seed = (index + 1) * 37.419;
  const x = ((Math.sin(seed) * 43758.5453) % 1 + 1) % 1;
  const y = ((Math.cos(seed * 1.37) * 29431.128) % 1 + 1) % 1;
  return {
    id: index,
    x: Math.round(x * 1000) / 10,
    y: Math.round(y * 1000) / 10,
    size: index % 7 === 0 ? 2.2 : index % 3 === 0 ? 1.5 : 1.1,
    opacity: index % 5 === 0 ? 0.65 : 0.32,
    twinkle: index % 4 === 0,
    delay: `${(index % 6) * 0.9}s`,
  };
});

export const StarfieldBackdrop: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#050A14]"
    >
      {/* Ambient midnight navy atmospheric gradients */}
      <div
        className="absolute -top-40 right-[-10%] h-[680px] w-[680px] rounded-full opacity-50 blur-[140px]"
        style={{
          background:
            'radial-gradient(circle, rgba(45, 212, 191, 0.14) 0%, rgba(56, 189, 248, 0.08) 42%, rgba(5, 10, 20, 0) 72%)',
        }}
      />
      <div
        className="absolute top-[28%] -left-48 h-[560px] w-[560px] rounded-full opacity-45 blur-[130px]"
        style={{
          background:
            'radial-gradient(circle, rgba(30, 64, 175, 0.22) 0%, rgba(15, 23, 42, 0.08) 55%, rgba(5, 10, 20, 0) 75%)',
        }}
      />
      <div
        className="absolute bottom-[-18%] right-[20%] h-[520px] w-[520px] rounded-full opacity-35 blur-[140px]"
        style={{
          background:
            'radial-gradient(circle, rgba(251, 191, 36, 0.08) 0%, rgba(15, 23, 42, 0.03) 50%, rgba(5, 10, 20, 0) 75%)',
        }}
      />

      {/* Subtle star-like particles */}
      <div className="absolute inset-0">
        {STAR_POINTS.map((star) => (
          <span
            key={star.id}
            className={`absolute rounded-full bg-slate-200 ${
              star.twinkle ? 'vc-star-twinkle' : ''
            }`}
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
              animationDelay: star.twinkle ? star.delay : undefined,
            }}
          />
        ))}
      </div>

      {/* Top vignette edge for crisp text legibility */}
      <div
        className="absolute inset-x-0 top-0 h-32"
        style={{
          background:
            'linear-gradient(180deg, rgba(5, 10, 20, 0.72) 0%, rgba(5, 10, 20, 0) 100%)',
        }}
      />
    </div>
  );
};
