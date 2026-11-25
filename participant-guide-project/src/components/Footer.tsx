import React from 'react';
import { Link } from 'react-router-dom';
import { Globe, Mail, MapPin, Phone, Share2 } from 'lucide-react';
import { BrandMark } from './ui/DesignPrimitives';

export const Footer: React.FC = () => {
  return (
    <footer className="relative z-10 border-t border-[#123C35]/15 bg-[#123C35] text-white">
      <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-12">
          {/* Brand Summary & Social Icons */}
          <div className="flex flex-col gap-4 md:col-span-5">
            <Link
              to="/"
              className="inline-flex w-fit items-center gap-2.5 font-display text-xl font-bold tracking-tight text-white"
            >
              <BrandMark className="h-7 w-7" />
              <span>VidaCare</span>
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-[#DDF3E9]/85">
              Together, We Make Healing Possible. Verified medical crowdfunding
              connecting patients and families with compassionate donors around
              the world.
            </p>

            {/* Social Icons */}
            <div className="flex items-center gap-3 pt-1">
              <Link
                to="/about"
                aria-label="VidaCare Global Community"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white transition-colors hover:border-[#16A085] hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16A085]"
              >
                <Globe className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                to="/campaigns"
                aria-label="Share VidaCare Campaigns"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white transition-colors hover:border-[#16A085] hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16A085]"
              >
                <Share2 className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a
                href="mailto:support@vidacare.org"
                aria-label="Email VidaCare Support"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white transition-colors hover:border-[#16A085] hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16A085]"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Navigation & Contact Details */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-7">
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold tracking-[0.12em] text-[#DDF3E9] uppercase">
                Explore
              </h3>
              <ul className="flex flex-col gap-2.5 text-sm text-[#DDF3E9]/80">
                <li>
                  <Link to="/" className="transition-colors hover:text-white">
                    Home
                  </Link>
                </li>
                <li>
                  <Link to="/campaigns" className="transition-colors hover:text-white">
                    Campaigns
                  </Link>
                </li>
                <li>
                  <Link to="/#how-it-works" className="transition-colors hover:text-white">
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="transition-colors hover:text-white">
                    About
                  </Link>
                </li>
                <li>
                  <Link to="/faq" className="transition-colors hover:text-white">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold tracking-[0.12em] text-[#DDF3E9] uppercase">
                Account
              </h3>
              <ul className="flex flex-col gap-2.5 text-sm text-[#DDF3E9]/80">
                <li>
                  <Link to="/login" className="transition-colors hover:text-white">
                    Login
                  </Link>
                </li>
                <li>
                  <Link to="/signup" className="transition-colors hover:text-white">
                    Get Started
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard" className="transition-colors hover:text-white">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link to="/admin" className="transition-colors hover:text-white">
                    Admin Portal
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="transition-colors hover:text-white">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            <div className="col-span-2 flex flex-col gap-3 sm:col-span-1">
              <h3 className="text-xs font-semibold tracking-[0.12em] text-[#DDF3E9] uppercase">
                Contact Desk
              </h3>
              <ul className="flex flex-col gap-2.5 text-sm text-[#DDF3E9]/80">
                <li className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-[#16A085]" aria-hidden="true" />
                  <a
                    href="mailto:support@vidacare.org"
                    className="truncate transition-colors hover:text-white"
                  >
                    support@vidacare.org
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-[#16A085]" aria-hidden="true" />
                  <span className="font-mono text-xs tabular-nums">+1 (800) 555-0194</span>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#16A085]" aria-hidden="true" />
                  <span className="text-xs leading-relaxed text-[#DDF3E9]/80">
                    240 Beacon Clinical Way, Boston, MA
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 text-xs text-[#DDF3E9]/75 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} VidaCare Medical Foundation. All rights reserved.</p>
          <p>Direct-to-care medical crowdfunding standard.</p>
        </div>
      </div>
    </footer>
  );
};
