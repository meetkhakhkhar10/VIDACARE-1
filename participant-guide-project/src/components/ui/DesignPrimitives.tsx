import React from 'react';
import { Link } from 'react-router-dom';

export const BrandMark: React.FC<{ className?: string; inverted?: boolean }> = ({
  className = 'h-6 w-6',
  inverted = false,
}) => (
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
      stroke={inverted ? '#DDF3E9' : '#159B79'}
      strokeWidth="2"
      strokeDasharray="64 20"
    />
    <path
      d="M16 23.2C16 23.2 9.2 18.9 9.2 13.7C9.2 11.4 11 9.6 13.2 9.6C14.5 9.6 15.5 10.2 16 11.1C16.5 10.2 17.5 9.6 18.8 9.6C21 9.6 22.8 11.4 22.8 13.7C22.8 18.9 16 23.2 16 23.2Z"
      fill={inverted ? 'url(#vc_heart_grad_inv)' : 'url(#vc_heart_grad)'}
    />
    <defs>
      <linearGradient id="vc_heart_grad" x1="9.2" y1="9.6" x2="22.8" y2="23.2" gradientUnits="userSpaceOnUse">
        <stop stopColor="#123C35" />
        <stop offset="1" stopColor="#159B79" />
      </linearGradient>
      <linearGradient id="vc_heart_grad_inv" x1="9.2" y1="9.6" x2="22.8" y2="23.2" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFFFFF" />
        <stop offset="1" stopColor="#DDF3E9" />
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
  heightClass?: string;
}

export const ProgressMeter: React.FC<ProgressMeterProps> = ({
  value,
  label,
  heightClass = 'h-2',
}) => {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || `Funding progress ${clamped}%`}
      className={`${heightClass} w-full overflow-hidden rounded-full bg-[#DDF3E9]`}
    >
      <div
        style={{ width: `${clamped}%` }}
        className="h-full rounded-full bg-[#159B79] transition-all duration-500 ease-out"
      />
    </div>
  );
};

interface SectionHeadingProps {
  kicker: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  as?: 'h1' | 'h2';
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({
  kicker,
  title,
  description,
  align = 'left',
  as = 'h2',
}) => {
  const alignment = align === 'center' ? 'mx-auto text-center items-center' : 'text-left items-start';
  const HeadingTag = as;
  const titleClasses =
    as === 'h1'
      ? 'font-display text-3xl font-bold tracking-tight text-[#123C35] sm:text-4xl lg:text-[2.75rem] lg:leading-[1.12]'
      : 'font-display text-2xl font-bold tracking-tight text-[#123C35] sm:text-3xl';

  return (
    <div className={`flex max-w-2xl flex-col gap-2.5 ${alignment}`}>
      <p className="text-[11px] font-semibold tracking-[0.16em] text-[#159B79] uppercase">
        {kicker}
      </p>
      <HeadingTag className={titleClasses}>{title}</HeadingTag>
      {description && (
        <p className="text-sm leading-relaxed text-[#414846] sm:text-base">{description}</p>
      )}
    </div>
  );
};

interface VidaButtonProps {
  children: React.ReactNode;
  to?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'mint' | 'ghost' | 'inverted' | 'inverted-outline';
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
    'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#159B79] focus-visible:ring-offset-2 min-h-[44px]';

  const variants: Record<
    'primary' | 'secondary' | 'mint' | 'ghost' | 'inverted' | 'inverted-outline',
    string
  > = {
    primary: 'bg-[#123C35] text-white hover:bg-[#159B79] shadow-sm',
    secondary:
      'border border-[#123C35]/20 bg-white text-[#123C35] hover:bg-[#DDF3E9]/60 hover:border-[#159B79]/40',
    mint: 'bg-[#DDF3E9] text-[#123C35] hover:bg-[#159B79] hover:text-white',
    ghost: 'text-[#131E1C] hover:bg-[#123C35]/5',
    inverted:
      'bg-white text-[#123C35] hover:bg-[#DDF3E9] focus-visible:ring-white focus-visible:ring-offset-[#123C35] shadow-sm',
    'inverted-outline':
      'border border-white/35 bg-transparent text-white hover:bg-white/15 focus-visible:ring-white focus-visible:ring-offset-[#123C35]',
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
