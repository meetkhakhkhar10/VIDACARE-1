import React from 'react';
import { Link, useLocation } from 'react-router-dom';
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

  return (
    <section
      aria-labelledby="not-found-heading"
      className="relative flex min-h-[calc(100vh-5rem)] items-center bg-[#F8FAF7] py-12 sm:py-16 lg:py-20"
    >
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10">
          {/* Left column: 404 typography, message, actions & VidaCare tagline */}
          <div className="order-2 flex flex-col items-start lg:order-1 lg:col-span-7">
            <Link
              to="/"
              className="group mb-7 inline-flex items-center gap-3 rounded-xl py-1 pr-2 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#159B79] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F8FAF7]"
            >
              <BrandMark className="h-7 w-7 shrink-0" />
              <div className="flex flex-col">
                <span className="font-display text-sm font-bold tracking-tight text-[#123C35]">
                  VidaCare
                </span>
                <span className="text-xs font-medium tracking-[0.02em] text-[#159B79]">
                  Together, We Make Healing Possible.
                </span>
              </div>
            </Link>

            {/* 404 typographic centerpiece */}
            <div className="relative mb-5 select-none">
              <div className="relative flex items-baseline gap-4">
                <span
                  aria-label="Error 404"
                  className="vc-numeric font-display text-[clamp(5rem,13vw,8.5rem)] font-extrabold leading-[0.9] tracking-tight text-[#123C35]"
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
                    stroke="#159B79"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M84 15H114"
                    stroke="#123C35"
                    strokeOpacity="0.3"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray="4 4"
                  />
                  <circle cx="79" cy="15" r="3" fill="#159B79" />
                </svg>
              </div>
            </div>

            <h1
              id="not-found-heading"
              className="font-display text-[clamp(2rem,4vw,3.125rem)] font-bold leading-[1.12] tracking-tight text-[#123C35]"
            >
              {title}
            </h1>

            <p className="mt-4 max-w-xl text-base leading-relaxed text-[#414846] sm:text-lg">
              {message}
            </p>

            {showRequestedPath && location.pathname && (
              <p className="mt-4 max-w-full truncate rounded-lg border border-[#123C35]/15 bg-white px-3 py-1.5 text-xs text-[#414846]">
                Requested path:{' '}
                <span className="vc-numeric font-semibold text-[#123C35]">
                  {location.pathname}
                </span>
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
                <Compass className="h-4 w-4 shrink-0 text-[#159B79]" aria-hidden="true" />
                <span>{secondaryCtaLabel}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-[#414846]" aria-hidden="true" />
              </VidaButton>
            </div>
          </div>

          {/* Right column: Healthcare illustration framed on crisp white card */}
          <div className="order-1 flex justify-center lg:order-2 lg:col-span-5">
            <div className="relative w-full max-w-[360px] sm:max-w-[420px] lg:max-w-[460px]">
              <div className="vc-glass relative aspect-square overflow-hidden rounded-2xl p-2.5">
                <div className="relative h-full w-full overflow-hidden rounded-xl bg-[#123C35]">
                  <SafeImage
                    src={notFoundArtwork}
                    alt="VidaCare illustration showing a frosted crystal medical cross and luminous glass heart"
                    fallbackTitle="Together, We Make Healing Possible."
                    className="h-full w-full object-cover"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        'radial-gradient(circle at center, transparent 58%, rgba(18, 60, 53, 0.4) 100%)',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
