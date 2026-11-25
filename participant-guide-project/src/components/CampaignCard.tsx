import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bookmark } from 'lucide-react';
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

  return (
    <GlassSurface className="group flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        <Link
          to={`/campaigns/${campaign.id}`}
          className="block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#16A085]"
        >
          <SafeImage
            src={campaign.imageUrl}
            alt={`${campaign.patientName} — ${campaign.condition}`}
            fallbackTitle={campaign.title}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#123C35]/80 via-[#123C35]/20 to-transparent"
          />
        </Link>

        <button
          type="button"
          onClick={() => toggleSavedCampaign(campaign.id)}
          aria-label={
            isSaved
              ? `Remove ${campaign.patientName} from saved`
              : `Save ${campaign.patientName} campaign`
          }
          className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-xl border border-white/30 bg-white/90 text-[#123C35] backdrop-blur-md transition-colors hover:bg-white hover:text-[#16A085] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16A085]"
        >
          <Bookmark
            className={`h-4 w-4 ${isSaved ? 'fill-[#123C35] text-[#123C35]' : ''}`}
            aria-hidden="true"
          />
        </button>

        <div className="pointer-events-none absolute bottom-3 left-4 right-4 flex items-center justify-between gap-2 text-xs text-white">
          <span className="truncate font-medium">{campaign.hospitalName}</span>
          <span className="font-mono tabular-nums text-[#DDF3E9] shrink-0 font-medium">
            {campaign.daysRemaining}d left
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between gap-5 p-6">
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#71807A]">
            <span className="font-semibold text-[#16A085]">{campaign.patientName}</span>
            <span aria-hidden="true">·</span>
            <span>{campaign.condition}</span>
            {variant === 'detailed' && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[#123C35] font-medium">{campaign.category}</span>
              </>
            )}
          </div>

          <Link
            to={`/campaigns/${campaign.id}`}
            className="font-display text-xl font-bold leading-snug text-[#123C35] transition-colors hover:text-[#16A085] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16A085]"
          >
            {campaign.title}
          </Link>

          {variant === 'detailed' && (
            <p className="text-xs text-[#71807A]">
              {campaign.hospitalName} · {campaign.location}
            </p>
          )}

          <p className="line-clamp-2 text-sm leading-relaxed text-[#71807A]">
            {campaign.summary}
          </p>
        </div>

        <div className="flex flex-col gap-4 border-t vc-hairline pt-4">
          <div className="flex flex-col gap-2.5">
            <ProgressMeter
              value={progress}
              label={`${campaign.patientName} funding progress`}
            />

            <div className="flex items-baseline justify-between gap-3">
              <div>
                <span className="font-mono text-base font-bold tabular-nums text-[#123C35]">
                  {formatINR(campaign.raisedAmount)}
                </span>
                <span className="ml-1.5 text-xs text-[#71807A] tabular-nums">
                  raised of {formatINR(campaign.goalAmount)}
                </span>
              </div>
              <span className="font-mono text-xs font-semibold tabular-nums text-[#16A085]">
                {progress}%
              </span>
            </div>

            {variant === 'detailed' && (
              <div className="flex items-center justify-between text-xs text-[#71807A]">
                <span className="font-mono tabular-nums">
                  {campaign.donorCount.toLocaleString('en-IN')} donors
                </span>
                {campaign.isUrgent && (
                  <span className="font-semibold text-[#16A085] bg-[#DDF3E9] px-2 py-0.5 rounded-full text-[11px]">
                    Immediate Need
                  </span>
                )}
              </div>
            )}
          </div>

          {variant === 'detailed' ? (
            <div className="grid grid-cols-2 gap-3">
              <Link
                to={`/campaigns/${campaign.id}`}
                className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-[#123C35]/20 bg-white px-3 py-2 text-xs font-semibold text-[#123C35] whitespace-nowrap transition-colors hover:bg-[#DDF3E9]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16A085]"
              >
                View Details
              </Link>
              <Link
                to={`/campaigns/${campaign.id}?donate=1`}
                className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl bg-[#123C35] px-3 py-2 text-xs font-semibold text-white whitespace-nowrap transition-colors hover:bg-[#16A085] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16A085]"
              >
                <span>Donate Now</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <Link
              to={`/campaigns/${campaign.id}`}
              className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-[#123C35] px-4 py-2 text-sm font-semibold text-white transition-all duration-150 hover:bg-[#16A085] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16A085]"
            >
              <span>Donate</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </GlassSurface>
  );
};
