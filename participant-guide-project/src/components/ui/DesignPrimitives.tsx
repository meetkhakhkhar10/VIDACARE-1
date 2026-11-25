import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

export const BrandMark: React.FC<{ className?: string }> = ({ className = 'h-6 w-6' }) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <circle
      cx="16"
      cy="16"
      r="13.5"
      stroke="#16A085"
      strokeWidth="2"
      strokeDasharray="64 20"
    />
    <path
      d="M16 23.2C16 23.2 9.2 18.9 9.2 13.7C9.2 11.4 11 9.6 13.2 9.6C14.5 9.6 15.5 10.2 16 11.1C16.5 10.2 17.5 9.6 18.8 9.6C21 9.6 22.8 11.4 22.8 13.7C22.8 18.9 16 23.2 16 23.2Z"
      fill="url(#vc_heart_grad)"
    />
    <defs>
      <linearGradient id="vc_heart_grad" x1="9.2" y1="9.6" x2="22.8" y2="23.2" gradientUnits="userSpaceOnUse">
        <stop stopColor="#123C35" />
        <stop offset="1" stopColor="#16A085" />
      </linearGradient>
    </defs>
  </svg>
);

interface GlassSurfaceProps {
  children: React.ReactNode;
  className?: string;
}

export const GlassSurface: React.FC<GlassSurfaceProps> = ({ children, className = '' }) => (
  <div className={`vc-glass rounded-2xl ${className}`}>{children}</div>
);

interface ProgressMeterProps {
  value: number;
  label?: string;
}

export const ProgressMeter: React.FC<ProgressMeterProps> = ({ value, label }) => {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || `Funding progress ${clamped}%`}
      className="h-2 w-full overflow-hidden rounded-full bg-[#DDF3E9]"
    >
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: clamped / 100 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformOrigin: 'left' }}
        className="h-full w-full rounded-full bg-gradient-to-r from-[#123C35] to-[#16A085]"
      />
    </div>
  );
};

interface SectionHeadingProps {
  kicker: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({
  kicker,
  title,
  description,
  align = 'left',
}) => {
  const alignment = align === 'center' ? 'mx-auto text-center items-center' : 'text-left items-start';
  return (
    <div className={`flex max-w-2xl flex-col gap-3 ${alignment}`}>
      <p className="text-xs font-semibold tracking-[0.14em] text-[#16A085] uppercase">
        {kicker}
      </p>
      <h2 className="font-display text-3xl font-bold tracking-tight text-[#123C35] sm:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="text-base leading-relaxed text-[#71807A]">{description}</p>
      )}
    </div>
  );
};

interface VidaButtonProps {
  children: React.ReactNode;
  to?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
  disabled?: boolean;
}

export const VidaButton: React.FC<VidaButtonProps> = ({
  children,
  to,
  onClick,
  type = 'button',
  variant = 'primary',
  className = '',
  disabled = false,
}) => {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold whitespace-nowrap shrink-0 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16A085] focus-visible:ring-offset-2 min-h-[44px] shadow-sm';

  const variants: Record<'primary' | 'secondary' | 'ghost', string> = {
    primary:
      'bg-[#123C35] text-white hover:bg-[#16A085] shadow-[0_4px_14px_rgba(18,60,53,0.25)]',
    secondary:
      'border border-[#16A085]/30 bg-white text-[#123C35] hover:bg-[#DDF3E9]/50',
    ghost: 'text-[#202B29] hover:bg-[#123C35]/5',
  };

  const disabledCls = disabled ? 'opacity-50 pointer-events-none' : '';
  const combined = `${base} ${variants[variant]} ${disabledCls} ${className}`;

  if (to) {
    return (
      <Link to={to} className={combined}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={combined}>
      {children}
    </button>
  );
};
