import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Compass, Home } from 'lucide-react';
import notFoundArtwork from '../assets/images/vidacare_404_compass_1795452390906.jpg';
import { SafeImage } from './SafeImage';
import { BrandMark, VidaButton } from './ui/DesignPrimitives';

export interface NotFoundProps {
  title?: string;
  message?: string;
  primaryCtaLabel?: string;
  primaryCtaTo?: string;
  secondaryCtaLabel?: string;
  secondaryCtaTo?: string;
  showRequestedPath?: boolean;
}

const AMBIENT_PARTICLES = [
  { id: 'p1', left: '10%', top: '18%', size: 3, tone: 'bg-sky-300/70', delay: 0 },
  { id: 'p2', left: '24%', top: '76%', size: 2, tone: 'bg-amber-300/75', delay: 0.9 },
  { id: 'p3', left: '46%', top: '12%', size: 2.5, tone: 'bg-teal-300/65', delay: 1.4 },
  { id: 'p4', left: '72%', top: '14%', size: 3, tone: 'bg-amber-200/80', delay: 0.4 },
  { id: 'p5', left: '88%', top: '34%', size: 2, tone: 'bg-sky-300/70', delay: 1.8 },
  { id: 'p6', left: '82%', top: '80%', size: 2.5, tone: 'bg-amber-300/70', delay: 1.1 },
  { id: 'p7', left: '58%', top: '86%', size: 2, tone: 'bg-sky-200/60', delay: 2.2 },
];

export const NotFound: React.FC<NotFoundProps> = ({
  title = "Oops! You've Lost Your Way.",
  message = "The page you're looking for doesn't exist or may have been moved. Let's get you back to helping lives.",
  primaryCtaLabel = 'Back to Home',
  primaryCtaTo = '/',
  secondaryCtaLabel = 'Explore Campaigns',
  secondaryCtaTo = '/campaigns',
  showRequestedPath = true,
}) => {
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();

  return (
    <section
      aria-labelledby="not-found-heading"
      className="relative isolate flex min-h-[calc(100vh-5rem)] items-center overflow-hidden py-12 sm:py-16 lg:py-20"
    >
      {/* Subtle atmospheric lighting & particle depth */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div
          className="absolute -left-24 top-1/4 h-[380px] w-[380px] rounded-full opacity-40 blur-[110px]"
          style={{
            background:
              'radial-gradient(circle, rgba(56, 189, 248, 0.24) 0%, rgba(45, 212, 191, 0.08) 45%, transparent 72%)',
          }}
        />
        <div
          className="absolute right-[-6rem] bottom-1/4 h-[420px] w-[420px] rounded-full opacity-45 blur-[120px]"
          style={{
            background:
              'radial-gradient(circle, rgba(251, 191, 36, 0.2) 0%, rgba(56, 189, 248, 0.14) 50%, transparent 74%)',
          }}
        />

        {AMBIENT_PARTICLES.map((particle) => (
          <motion.span
            key={particle.id}
            style={{
              left: particle.left,
              top: particle.top,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
            }}
            className={`absolute rounded-full ${particle.tone}`}
            animate={
              shouldReduceMotion
                ? undefined
                : {
                    opacity: [0.25, 0.85, 0.25],
                    y: [0, -8, 0],
                  }
            }
            transition={
              shouldReduceMotion
                ? undefined
                : {
                    duration: 4.6,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: particle.delay,
                  }
            }
          />
        ))}
      </div>

      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10">
          {/* Left column: Glowing 404 typography, message, actions & VidaCare tagline */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="order-2 flex flex-col items-start lg:order-1 lg:col-span-7"
          >
            {/* Brand mark & tagline lockup (unboxed editorial signature) */}
            <Link
              to="/"
              className="group mb-7 inline-flex items-center gap-3 rounded-lg py-1 pr-2 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050A14]"
            >
              <BrandMark className="h-7 w-7 shrink-0" />
              <div className="flex flex-col">
                <span className="font-display text-sm font-semibold tracking-tight text-slate-100">
                  VidaCare
                </span>
                <span className="text-xs tracking-[0.04em] text-amber-200/85">
                  Together, We Make Healing Possible.
                </span>
              </div>
            </Link>

            {/* Creative 404 typographic centerpiece */}
            <div className="relative mb-5 select-none">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-x-6 -inset-y-3 rounded-full bg-gradient-to-r from-sky-400/20 via-teal-300/12 to-amber-400/20 blur-2xl"
              />
              <div className="relative flex items-baseline gap-4">
                <span
                  aria-label="Error 404"
                  className="font-display text-[clamp(5.25rem,14vw,9rem)] font-bold leading-[0.9] tracking-tight tabular-nums bg-gradient-to-br from-sky-300 via-slate-50 to-amber-300 bg-clip-text text-transparent drop-shadow-[0_0_28px_rgba(56,189,248,0.28)]"
                >
                  404
                </span>
                <svg
                  viewBox="0 0 116 28"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="hidden h-7 w-28 sm:block"
                  aria-hidden="true"
                >
                  <path
                    d="M2 15H34L42 6L52 22L60 15H74"
                    stroke="url(#vc_404_pulse_left)"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M84 15H114"
                    stroke="url(#vc_404_pulse_right)"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeDasharray="4 4"
                  />
                  <circle cx="79" cy="15" r="2.5" fill="#FBBF24" />
                  <defs>
                    <linearGradient id="vc_404_pulse_left" x1="2" y1="15" x2="74" y2="15" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#38BDF8" stopOpacity="0.25" />
                      <stop offset="1" stopColor="#7DD3FC" />
                    </linearGradient>
                    <linearGradient id="vc_404_pulse_right" x1="84" y1="15" x2="114" y2="15" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#FBBF24" />
                      <stop offset="1" stopColor="#FBBF24" stopOpacity="0.15" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

            <h1
              id="not-found-heading"
              className="font-display text-[clamp(2rem,4vw,3.125rem)] font-semibold leading-[1.12] tracking-tight text-slate-50"
            >
              {title}
            </h1>

            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-300/90 sm:text-lg">
              {message}
            </p>

            {showRequestedPath && location.pathname && (
              <p className="mt-4 max-w-full truncate font-mono text-xs text-slate-400">
                Requested path:{' '}
                <span className="text-sky-300/90">{location.pathname}</span>
              </p>
            )}

            {/* Primary & Secondary Navigation Actions */}
            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <VidaButton
                to={primaryCtaTo}
                variant="primary"
                className="min-h-[44px] px-6 py-3"
              >
                <Home className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{primaryCtaLabel}</span>
              </VidaButton>

              <VidaButton
                to={secondaryCtaTo}
                variant="secondary"
                className="min-h-[44px] px-6 py-3"
              >
                <Compass className="h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
                <span>{secondaryCtaLabel}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              </VidaButton>
            </div>
          </motion.div>

          {/* Right column: Original 3D healthcare illustration with soft glow & broken path motif */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
            className="order-1 flex justify-center lg:order-2 lg:col-span-5"
          >
            <div className="relative w-full max-w-[360px] sm:max-w-[420px] lg:max-w-[460px]">
              {/* Soft dual-tone studio backlight */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-4 rounded-full bg-gradient-to-tr from-sky-500/20 via-teal-400/10 to-amber-400/20 blur-3xl"
              />

              <motion.div
                animate={
                  shouldReduceMotion
                    ? undefined
                    : {
                        y: [0, -10, 0],
                      }
                }
                transition={
                  shouldReduceMotion
                    ? undefined
                    : {
                        duration: 6,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }
                }
                className="vc-glass relative aspect-square overflow-hidden rounded-3xl p-2 shadow-[0_24px_80px_-24px_rgba(56,189,248,0.28)]"
              >
                {/* Decorative hairline broken orbital path framing the 3D artwork */}
                <svg
                  viewBox="0 0 400 400"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="pointer-events-none absolute inset-0 z-10 h-full w-full"
                  aria-hidden="true"
                >
                  <circle
                    cx="200"
                    cy="200"
                    r="182"
                    stroke="url(#vc_404_orbit)"
                    strokeWidth="1"
                    strokeDasharray="110 26 42 18"
                    opacity="0.45"
                  />
                  <defs>
                    <linearGradient id="vc_404_orbit" x1="20" y1="20" x2="380" y2="380" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#38BDF8" />
                      <stop offset="0.55" stopColor="#2DD4BF" stopOpacity="0.25" />
                      <stop offset="1" stopColor="#FBBF24" />
                    </linearGradient>
                  </defs>
                </svg>

                <div className="relative h-full w-full overflow-hidden rounded-2xl bg-[#050A14]">
                  <SafeImage
                    src={notFoundArtwork}
                    alt="Original 3D VidaCare illustration showing a frosted crystal medical cross and luminous golden glass heart suspended above a gently fractured blue and gold orbital light path"
                    fallbackTitle="Together, We Make Healing Possible."
                    className="h-full w-full object-cover"
                  />
                  {/* Subtle radial edge vignette so the dark navy edges melt into the card */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        'radial-gradient(circle at center, transparent 56%, rgba(5, 10, 20, 0.72) 100%)',
                    }}
                  />
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
