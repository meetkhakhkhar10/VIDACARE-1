import React from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Ambulance,
  ArrowRight,
  Droplets,
  HeartHandshake,
  HeartPulse,
  Ribbon,
  Stethoscope,
} from 'lucide-react';
import { useVidaCare } from '../context/VidaCareContext';
import { CategoryItem } from '../types/campaign';
import { GlassSurface, SectionHeading } from './ui/DesignPrimitives';

function getCategoryVisual(cat: CategoryItem): {
  icon: React.ComponentType<{ className?: string }>;
  accentText: string;
  accentBg: string;
} {
  const key = (cat.iconKey || cat.name).toLowerCase();
  if (key.includes('oncology') || key.includes('cancer')) {
    return {
      icon: Ribbon,
      accentText: 'text-[#159B79]',
      accentBg: 'border-[#159B79]/20 bg-[#DDF3E9]',
    };
  }
  if (key.includes('cardiac') || key.includes('heart')) {
    return {
      icon: HeartPulse,
      accentText: 'text-[#123C35]',
      accentBg: 'border-[#123C35]/15 bg-[#DDF3E9]',
    };
  }
  if (key.includes('renal') || key.includes('kidney')) {
    return {
      icon: Droplets,
      accentText: 'text-[#159B79]',
      accentBg: 'border-[#159B79]/20 bg-[#DDF3E9]',
    };
  }
  if (key.includes('transplant') || key.includes('organ')) {
    return {
      icon: HeartHandshake,
      accentText: 'text-[#123C35]',
      accentBg: 'border-[#123C35]/15 bg-[#DDF3E9]',
    };
  }
  if (key.includes('emergency') || key.includes('accident')) {
    return {
      icon: Ambulance,
      accentText: 'text-[#159B79]',
      accentBg: 'border-[#159B79]/20 bg-[#DDF3E9]',
    };
  }
  if (key.includes('other')) {
    return {
      icon: Stethoscope,
      accentText: 'text-[#123C35]',
      accentBg: 'border-[#123C35]/15 bg-[#DDF3E9]',
    };
  }
  return {
    icon: Activity,
    accentText: 'text-[#159B79]',
    accentBg: 'border-[#159B79]/20 bg-[#DDF3E9]',
  };
}

export const MedicalCategoriesSection: React.FC = () => {
  const { activeCategories, approvedCampaigns } = useVidaCare();

  if (activeCategories.length === 0) return null;

  return (
    <section
      aria-label="Medical Categories"
      className="border-t border-[#123C35]/10 bg-[#F8FAF7] py-16 sm:py-20"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-6 border-b border-[#123C35]/10 pb-8 sm:flex-row sm:items-end">
          <SectionHeading
            kicker="Medical Specialties"
            title="Fundraisers by Clinical Need"
            description="Select a specialty to support verified patients raising funds for surgery, oncology, renal treatment, organ care, and rehabilitation."
          />
          <Link
            to="/campaigns"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#159B79] transition-colors hover:text-[#123C35] whitespace-nowrap shrink-0"
          >
            <span>Browse all campaigns</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {activeCategories.map((cat) => {
            const { icon: Icon, accentText, accentBg } = getCategoryVisual(cat);
            const count = approvedCampaigns.filter(
              (c) => c.category.toLowerCase() === cat.name.toLowerCase()
            ).length;
            const title = cat.displayTitle || cat.name;

            return (
              <GlassSurface
                key={cat.id}
                className="group flex flex-col justify-between gap-5 p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-3">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl border ${accentBg}`}
                    >
                      <Icon className={`h-5 w-5 ${accentText}`} aria-hidden="true" />
                    </div>
                    <span className="vc-numeric text-xs font-semibold text-[#414846]">
                      {count} {count === 1 ? 'active story' : 'active stories'}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-display text-lg font-bold text-[#123C35] transition-colors group-hover:text-[#159B79]">
                      {title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-[#414846]">
                      {cat.description}
                    </p>
                  </div>
                </div>

                <div className="border-t border-[#123C35]/10 pt-3.5">
                  <Link
                    to={`/campaigns?category=${encodeURIComponent(cat.name)}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#159B79] transition-colors hover:text-[#123C35]"
                  >
                    <span>Explore {title}</span>
                    <ArrowRight
                      className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                </div>
              </GlassSurface>
            );
          })}
        </div>
      </div>
    </section>
  );
};
