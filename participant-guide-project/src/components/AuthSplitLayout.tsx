import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { SafeImage } from './SafeImage';

interface AuthSplitLayoutProps {
  children: React.ReactNode;
  eyebrow: string;
  headline: string;
  description: string;
  imageUrl?: string;
  imageAlt?: string;
}

export const AuthSplitLayout: React.FC<AuthSplitLayoutProps> = ({
  children,
  eyebrow,
  headline,
  description,
  imageUrl = '/src/assets/images/campaign_cardiac_care_1795448745364.jpg',
  imageAlt = 'Compassionate physician consulting with a mother and young child',
}) => {
  return (
    <section className="py-10 sm:py-14 lg:py-16">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="grid items-stretch gap-8 lg:grid-cols-12">
          {/* Visual & Brand Story Panel — forest green accent column */}
          <div className="hidden lg:col-span-5 lg:flex">
            <div className="relative flex w-full flex-col justify-between overflow-hidden rounded-2xl bg-[#123C35] p-8">
              <div className="relative z-10 flex flex-col gap-3">
                <p className="text-xs font-semibold tracking-[0.14em] text-[#DDF3E9] uppercase">
                  {eyebrow}
                </p>
                <h2 className="font-display text-3xl font-semibold leading-snug text-white">
                  {headline}
                </h2>
                <p className="text-sm leading-relaxed text-[#DDF3E9]/85">
                  {description}
                </p>
              </div>

              <div className="relative my-6 overflow-hidden rounded-2xl border border-white/15">
                <SafeImage
                  src={imageUrl}
                  alt={imageAlt}
                  fallbackTitle="VidaCare Patient Support"
                  className="aspect-[4/3] w-full object-cover"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#123C35]/80 via-transparent to-transparent"
                />
                <div className="absolute inset-x-4 bottom-4 flex items-center justify-between text-xs text-white">
                  <span>Together, We Make Healing Possible.</span>
                  <span className="font-mono text-[#DDF3E9] font-semibold">97.4% to Care</span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 border-t border-white/15 pt-5 text-xs text-[#DDF3E9]/80">
                <div className="flex items-center gap-2">
                  <ShieldCheck
                    className="h-4 w-4 shrink-0 text-[#DDF3E9]"
                    aria-hidden="true"
                  />
                  <span>
                    Hospital-verified fundraisers &amp; direct clinical settlement
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-[#DDF3E9]/60">
                  Preview notice: Authentication and OTP screens run as a
                  frontend simulation stored locally in your browser.
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Auth Form Column */}
          <div className="flex items-center lg:col-span-7">{children}</div>
        </div>
      </div>
    </section>
  );
};
