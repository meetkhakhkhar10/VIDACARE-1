import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bookmark, ShieldCheck } from 'lucide-react';
import { MedicalCampaign } from '../types/campaign';
import { calculateProgress, formatINR } from '../lib/format';
import { useVidaCare } from '../context/VidaCareContext';
import { GlassSurface, ProgressMeter } from './ui/DesignPrimitives';
import { SafeImage } from './SafeImage';

interface CampaignCardProps {
  campaign: MedicalCampaign;
  variant?: 'compact' | 'detailed';
}

export const CampaignCard: React.FC<CampaignCardProps> = ({
  campaign,
  variant = 'compact',
}) => {
  const { savedCampaignIds, toggleSavedCampaign } = useVidaCare();
  const isSaved = savedCampaignIds.includes(campaign.id);
  const progress = calculateProgress(campaign.raisedAmount, campaign.goalAmount);
  const isUrgent = Boolean(campaign.isUrgent || campaign.daysRemaining <= 10);

  return (
    <GlassSurface className="group flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      {/* Editorial 4:3 Photography Header */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#DDF3E9]">
        <Link
          to={`/campaigns/${campaign.id}`}
          className="block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#159B79]"
        >
          <SafeImage
            src={campaign.imageUrl}
            alt={`${campaign.patientName} — ${campaign.condition}`}
            fallbackTitle={campaign.title}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#123C35]/88 via-[#123C35]/20 to-transparent"
          />
        </Link>

        {/* Compact Top-Right Bookmark Control */}
        <button
          type="button"
          onClick={() => toggleSavedCampaign(campaign.id)}
          aria-label={
            isSaved
              ? `Remove ${campaign.patientName} from saved`
              : `Save ${campaign.patientName} campaign`
          }
          className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-[10px] border border-white/50 bg-white/95 text-[#123C35] shadow-sm backdrop-blur-md transition-colors hover:bg-white hover:text-[#159B79] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#159B79]"
        >
          <Bookmark
            className={`h-4 w-4 ${isSaved ? 'fill-[#123C35] text-[#123C35]' : ''}`}
            aria-hidden="true"
          />
        </button>

        {/* Bottom Scrim Overlay: Hospital & Status / Timeline */}
        <div className="pointer-events-none absolute bottom-3 left-4 right-4 flex items-center justify-between gap-2 text-xs text-white">
          <span className="truncate font-medium text-white">
            {campaign.hospitalName}
          </span>
          <span
            className={`vc-numeric shrink-0 font-semibold ${
              isUrgent ? 'text-[#FEF3C7]' : 'text-[#DDF3E9]'
            }`}
          >
            {isUrgent ? `Urgent · ${campaign.daysRemaining}d left` : `${campaign.daysRemaining}d left`}
          </span>
        </div>
      </div>

      {/* Editorial Body */}
      <div className="flex flex-1 flex-col justify-between gap-5 p-6">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#414846]">
            <span className="font-semibold text-[#159B79]">{campaign.patientName}</span>
            <span aria-hidden="true">·</span>
            <span className="text-[#414846]">{campaign.condition}</span>
          </div>

          <Link
            to={`/campaigns/${campaign.id}`}
            className="font-display text-lg font-bold leading-snug text-[#123C35] transition-colors hover:text-[#159B79] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#159B79] rounded sm:text-[1.18rem]"
          >
            {campaign.title}
          </Link>

          <p className="line-clamp-2 text-sm leading-relaxed text-[#414846]">
            {campaign.summary}
          </p>
        </div>

        {/* Aligned Financial Meter & Actions */}
        <div className="flex flex-col gap-4 border-t border-[#123C35]/10 pt-4">
          <div className="flex flex-col gap-2">
            <ProgressMeter
              value={progress}
              label={`${campaign.patientName} funding progress`}
            />

            <div className="flex items-baseline justify-between gap-3">
              <div className="vc-numeric">
                <span className="text-base font-bold text-[#123C35]">
                  {formatINR(campaign.raisedAmount)}
                </span>
                <span className="ml-1.5 text-xs text-[#414846]">
                  of {formatINR(campaign.goalAmount)}
                </span>
              </div>
              <span className="vc-numeric text-xs font-bold text-[#159B79]">
                {progress}%
              </span>
            </div>

            {variant === 'detailed' && (
              <div className="flex items-center justify-between text-xs text-[#414846]">
                <span className="vc-numeric font-medium">
                  {campaign.donorCount.toLocaleString('en-IN')} supporters
                </span>
                {campaign.hospitalVerified && (
                  <span className="inline-flex items-center gap-1 font-medium text-[#123C35]">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#159B79]" aria-hidden="true" />
                    <span>Clinical Desk Verified</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {variant === 'detailed' ? (
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                to={`/campaigns/${campaign.id}`}
                className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-[#123C35]/18 bg-white px-3 py-2 text-xs font-semibold text-[#123C35] whitespace-nowrap transition-colors hover:bg-[#DDF3E9]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#159B79]"
              >
                Patient Story
              </Link>
              <Link
                to={`/donate/${campaign.id}`}
                className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl bg-[#123C35] px-3 py-2 text-xs font-semibold text-white whitespace-nowrap transition-colors hover:bg-[#159B79] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#159B79]"
              >
                <span>Donate Now</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <Link
              to={`/campaigns/${campaign.id}`}
              className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-[#123C35] px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#159B79] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#159B79]"
            >
              <span>View &amp; Support</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </GlassSurface>
  );
};
