import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Building2,
  Check,
  ChevronRight,
  Copy,
  FileText,
  HeartHandshake,
  Mail,
  MapPin,
  Share2,
  ShieldCheck,
  Stethoscope,
  Users,
  X,
} from 'lucide-react';
import { useVidaCare } from '../context/VidaCareContext';
import { MedicalDocument } from '../types/campaign';
import { calculateProgress, formatINR } from '../lib/format';
import { CampaignCard } from '../components/CampaignCard';
import { SafeImage } from '../components/SafeImage';
import {
  GlassSurface,
  ProgressMeter,
  VidaButton,
} from '../components/ui/DesignPrimitives';

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

export const CampaignDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    approvedCampaigns,
    donations,
    savedCampaignIds,
    toggleSavedCampaign,
    getCampaignById,
  } = useVidaCare();

  const donationPanelRef = useRef<HTMLDivElement | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [selectedQuickAmount, setSelectedQuickAmount] = useState<number | null>(1000);
  const [customAmount, setCustomAmount] = useState('1000');
  const [amountError, setAmountError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<MedicalDocument | null>(null);

  // Brief non-blocking skeleton transition when navigating between campaign IDs
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    const timer = window.setTimeout(() => {
      try {
        if (!id || id.trim().length === 0) {
          setHasError(true);
        }
      } catch {
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    }, 160);
    return () => window.clearTimeout(timer);
  }, [id]);

  // Smooth scroll to donation panel when ?donate=1 is passed
  useEffect(() => {
    if (!isLoading && searchParams.get('donate') === '1' && donationPanelRef.current) {
      donationPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isLoading, searchParams]);

  // Close document modal on Escape
  useEffect(() => {
    if (!previewDoc) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewDoc(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [previewDoc]);

  const rawCampaign = id ? getCampaignById(id) : undefined;
  // Public route strictly shows approved campaigns only
  const campaign =
    rawCampaign && rawCampaign.status === 'approved' ? rawCampaign : undefined;

  const campaignDonors = useMemo(() => {
    if (!campaign) return [];
    return donations.filter((d) => d.campaignId === campaign.id);
  }, [donations, campaign]);

  const relatedCampaigns = useMemo(() => {
    if (!campaign) return [];
    const others = approvedCampaigns.filter((c) => c.id !== campaign.id);
    const sameCategory = others.filter((c) => c.category === campaign.category);
    const differentCategory = others.filter((c) => c.category !== campaign.category);
    return [...sameCategory, ...differentCategory].slice(0, 3);
  }, [approvedCampaigns, campaign]);

  const handleQuickSelect = (amount: number) => {
    setSelectedQuickAmount(amount);
    setCustomAmount(String(amount));
    setAmountError('');
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    const parsed = Number(value);
    setSelectedQuickAmount(QUICK_AMOUNTS.includes(parsed) ? parsed : null);
    if (amountError) setAmountError('');
  };

  const handleProceedToDonate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaign) return;
    const numericAmount = Number(customAmount);
    if (!Number.isFinite(numericAmount) || numericAmount < 100) {
      setAmountError('Please enter a contribution amount of at least ₹100.');
      return;
    }
    setAmountError('');
    navigate(`/donate/${campaign.id}?amount=${Math.round(numericAmount)}`);
  };

  const handleCopyShareLink = async () => {
    const shareUrl = window.location.href;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const input = document.createElement('input');
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2400);
    } catch {
      setCopiedLink(false);
    }
  };

  // Loading Skeleton State
  if (isLoading) {
    return (
      <section className="py-12 sm:py-16" aria-busy="true" aria-label="Loading campaign details">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="h-5 w-48 animate-pulse rounded bg-slate-800/80" />
          <div className="mt-8 grid gap-10 lg:grid-cols-12">
            <div className="flex flex-col gap-6 lg:col-span-7">
              <div className="h-10 w-3/4 animate-pulse rounded bg-slate-800/80" />
              <div className="aspect-[16/10] w-full animate-pulse rounded-2xl bg-slate-900/90" />
              <div className="h-48 w-full animate-pulse rounded-2xl bg-slate-900/70" />
            </div>
            <div className="lg:col-span-5">
              <div className="h-96 w-full animate-pulse rounded-2xl bg-slate-900/70" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Error State
  if (hasError) {
    return (
      <section className="py-20">
        <div className="mx-auto max-w-[780px] px-4 sm:px-6 lg:px-8">
          <GlassSurface className="flex flex-col items-start gap-4 p-8 sm:p-12">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-amber-300/30 bg-amber-300/10 text-amber-300">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-xs font-medium tracking-[0.14em] text-amber-300">
              Unable to Load Campaign
            </p>
            <h1 className="font-display text-3xl font-semibold text-slate-50">
              Something interrupted loading this medical story.
            </h1>
            <p className="text-sm leading-relaxed text-slate-300/85">
              Please retry or return to the verified campaigns directory.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <VidaButton
                type="button"
                variant="primary"
                onClick={() => window.location.reload()}
              >
                Retry
              </VidaButton>
              <VidaButton to="/campaigns" variant="secondary">
                Back to Campaigns
              </VidaButton>
            </div>
          </GlassSurface>
        </div>
      </section>
    );
  }

  // Campaign Not Found or Unapproved State
  if (!campaign) {
    return (
      <section className="py-20">
        <div className="mx-auto max-w-[780px] px-4 sm:px-6 lg:px-8">
          <GlassSurface className="flex flex-col items-start gap-4 p-8 sm:p-12">
            <p className="text-xs font-medium tracking-[0.14em] text-amber-300">
              Campaign Unavailable
            </p>
            <h1 className="font-display text-3xl font-semibold text-slate-50">
              This campaign could not be found or is awaiting clinical approval.
            </h1>
            <p className="text-sm leading-relaxed text-slate-300/85">
              Only verified and approved medical campaigns are publicly listed on
              VidaCare. Explore active stories of hope in our campaign directory.
            </p>
            <VidaButton to="/campaigns" variant="primary">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Back to Campaigns</span>
            </VidaButton>
          </GlassSurface>
        </div>
      </section>
    );
  }

  const progress = calculateProgress(campaign.raisedAmount, campaign.goalAmount);
  const remainingAmount = Math.max(0, campaign.goalAmount - campaign.raisedAmount);
  const isSaved = savedCampaignIds.includes(campaign.id);
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = encodeURIComponent(
    `Support ${campaign.patientName}: ${campaign.title} on VidaCare`
  );
  const encodedUrl = encodeURIComponent(shareUrl);

  return (
    <div className="flex flex-col">
      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          {/* 10. Navigation: Breadcrumbs + Back to Campaigns */}
          <div className="flex flex-col justify-between gap-4 border-b vc-hairline pb-6 sm:flex-row sm:items-center">
            <nav
              aria-label="Breadcrumb"
              className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400"
            >
              <Link to="/" className="transition-colors hover:text-slate-100">
                Home
              </Link>
              <ChevronRight className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
              <Link
                to="/campaigns"
                className="transition-colors hover:text-slate-100"
              >
                Campaigns
              </Link>
              <ChevronRight className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
              <span className="truncate max-w-[240px] text-amber-300">
                {campaign.patientName}
              </span>
            </nav>

            <Link
              to="/campaigns"
              className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-3.5 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-amber-300/50 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Back to Campaigns</span>
            </Link>
          </div>

          {/* 1. Campaign Header */}
          <div className="mt-8 flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-300">
              <span className="inline-flex items-center gap-1.5 font-medium text-teal-300">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Approved &amp; Clinically Verified</span>
              </span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-sky-300">{campaign.category}</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="inline-flex items-center gap-1 text-slate-300">
                <MapPin className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                <span>{campaign.location}</span>
              </span>
              {campaign.isUrgent && (
                <>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="font-medium text-amber-300">
                    Urgent Care Need ({campaign.daysRemaining}d remaining)
                  </span>
                </>
              )}
            </div>

            <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-slate-50 sm:text-4xl lg:text-[2.65rem]">
              {campaign.title}
            </h1>

            <p className="text-sm text-slate-300/90 sm:text-base">
              Patient:{' '}
              <span className="font-medium text-slate-100">
                {campaign.patientName}
              </span>{' '}
              ({campaign.ageLabel}) · Condition:{' '}
              <span className="font-medium text-amber-200">
                {campaign.condition}
              </span>
            </p>
          </div>

          {/* Main Two-Column Desktop Layout */}
          <div className="mt-10 grid items-start gap-10 lg:grid-cols-12">
            {/* Left Primary Content Column */}
            <div className="flex flex-col gap-8 lg:col-span-7">
              {/* 2. Patient Image & Medical Story */}
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.85)]">
                <SafeImage
                  src={campaign.imageUrl}
                  alt={`${campaign.patientName} — ${campaign.condition}`}
                  fallbackTitle={campaign.title}
                  className="aspect-[16/10] w-full object-cover"
                />
              </div>

              <GlassSurface className="flex flex-col gap-6 p-7 sm:p-8">
                <div className="flex flex-col gap-4 border-b vc-hairline pb-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-sky-400/20 bg-sky-400/10 text-sky-300">
                      <Building2 className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Treating Hospital</p>
                      <p className="text-sm font-semibold text-slate-100">
                        {campaign.hospitalName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-300/20 bg-amber-300/10 text-amber-300">
                      <Stethoscope className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Organizer &amp; Care Desk</p>
                      <p className="text-sm font-semibold text-slate-100">
                        {campaign.organizerName} ({campaign.organizerRelation})
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <h2 className="font-display text-2xl font-semibold text-slate-50">
                    Patient Story
                  </h2>
                  {campaign.story.map((paragraph, idx) => (
                    <p
                      key={idx}
                      className="text-base leading-relaxed text-slate-300/90"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>

                <div className="border-t vc-hairline pt-5">
                  <h3 className="text-xs font-semibold tracking-[0.12em] text-amber-300">
                    Planned Clinical Treatment
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300/90">
                    {campaign.treatmentDetails}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    Verified by: {campaign.verifiedBy}
                  </p>
                </div>
              </GlassSurface>

              {/* 5. Medical Documents */}
              <GlassSurface className="flex flex-col gap-5 p-7 sm:p-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-display text-2xl font-semibold text-slate-50">
                      Medical Documents
                    </h2>
                    <p className="mt-1 text-xs text-slate-400">
                      Clinical estimates and hospital verification records
                    </p>
                  </div>
                  <span className="font-mono text-xs tabular-nums text-sky-300">
                    {campaign.documents?.length ?? 0} files
                  </span>
                </div>

                {!campaign.documents || campaign.documents.length === 0 ? (
                  <p className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4 text-sm text-slate-400">
                    Verification records are held on file with {campaign.verifiedBy}.
                    No public document attachments have been uploaded for this
                    story yet.
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {campaign.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex flex-col justify-between gap-4 rounded-xl border border-slate-800/80 bg-slate-950/55 p-4 sm:flex-row sm:items-center"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-sky-400/20 bg-sky-400/10 text-sky-300">
                            <FileText className="h-5 w-5" aria-hidden="true" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-100">
                              {doc.title}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-400">
                              {doc.docType} · {doc.issuedDate} · {doc.fileSize}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setPreviewDoc(doc)}
                          className="inline-flex min-h-[38px] items-center justify-center rounded-lg border border-slate-700/80 bg-slate-900/70 px-3.5 py-1.5 text-xs font-medium text-amber-200 whitespace-nowrap shrink-0 transition-colors hover:border-amber-300/60 hover:text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                        >
                          Preview Document
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </GlassSurface>

              {/* 6. Campaign Updates */}
              <GlassSurface className="flex flex-col gap-5 p-7 sm:p-8">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="font-display text-2xl font-semibold text-slate-50">
                    Campaign Updates
                  </h2>
                  <span className="font-mono text-xs tabular-nums text-slate-400">
                    {campaign.updates.length}{' '}
                    {campaign.updates.length === 1 ? 'update' : 'updates'}
                  </span>
                </div>

                {campaign.updates.length === 0 ? (
                  <p className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4 text-sm text-slate-400">
                    No post-intake clinical updates have been shared yet. Follow
                    or save this campaign to check back as treatment progresses.
                  </p>
                ) : (
                  <div className="flex flex-col gap-5">
                    {campaign.updates.map((upd) => (
                      <div
                        key={upd.id}
                        className="border-t vc-hairline pt-5 first:border-t-0 first:pt-0"
                      >
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          <span className="font-mono text-amber-300">{upd.date}</span>
                          <span aria-hidden="true">·</span>
                          <span>Shared by {upd.author}</span>
                        </div>
                        <h3 className="mt-1.5 text-base font-semibold text-slate-100">
                          {upd.title}
                        </h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-slate-300/85">
                          {upd.summary}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </GlassSurface>

              {/* 7. Recent Donors */}
              <GlassSurface className="flex flex-col gap-5 p-7 sm:p-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-display text-2xl font-semibold text-slate-50">
                      Recent Donors
                    </h2>
                    <p className="mt-1 text-xs text-slate-400">
                      Community supporters standing beside {campaign.patientName}
                    </p>
                  </div>
                  <span className="font-mono text-xs tabular-nums text-teal-300">
                    {campaign.donorCount.toLocaleString('en-IN')} total donors
                  </span>
                </div>

                {campaignDonors.length === 0 ? (
                  <p className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4 text-sm text-slate-400">
                    Be the first featured supporter to leave an encouraging note for{' '}
                    {campaign.patientName}.
                  </p>
                ) : (
                  <div className="flex flex-col divide-y divide-slate-800/70">
                    {campaignDonors.map((donor) => {
                      const displayName = donor.isAnonymous
                        ? 'Anonymous Donor'
                        : donor.donorName;
                      return (
                        <div
                          key={donor.id}
                          className="flex flex-col gap-1.5 py-4 first:pt-0 last:pb-0"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-medium text-slate-100">
                              {displayName}
                            </span>
                            <span className="font-mono text-sm font-semibold tabular-nums text-amber-300">
                              {formatINR(donor.amount)}
                            </span>
                          </div>
                          {donor.message && (
                            <p className="text-xs leading-relaxed text-slate-300/85">
                              “{donor.message}”
                            </p>
                          )}
                          <p className="font-mono text-[11px] tabular-nums text-slate-500">
                            {donor.timestamp.slice(0, 10)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </GlassSurface>
            </div>

            {/* Right Sticky Fundraising & Donation Column */}
            <div
              ref={donationPanelRef}
              className="flex flex-col gap-6 lg:col-span-5 lg:sticky lg:top-24"
            >
              {/* 3. Fundraising Progress + 4. Donation Panel */}
              <GlassSurface className="flex flex-col gap-6 p-7 sm:p-8 vc-glow-accent">
                <div className="flex flex-col gap-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-slate-400">
                        Amount Raised
                      </p>
                      <p className="mt-0.5 font-mono text-3xl font-semibold tabular-nums text-slate-50">
                        {formatINR(campaign.raisedAmount)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-lg font-semibold tabular-nums text-amber-300">
                        {progress}%
                      </p>
                      <p className="text-xs text-slate-400">funded</p>
                    </div>
                  </div>

                  <ProgressMeter
                    value={progress}
                    label={`${campaign.patientName} fundraising progress`}
                  />

                  <div className="grid grid-cols-3 gap-3 border-y vc-hairline py-4 text-xs">
                    <div>
                      <p className="text-slate-400">Target Goal</p>
                      <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-slate-100">
                        {formatINR(campaign.goalAmount)}
                      </p>
                    </div>
                    <div className="border-l vc-hairline pl-3">
                      <p className="text-slate-400">Remaining</p>
                      <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-sky-300">
                        {formatINR(remainingAmount)}
                      </p>
                    </div>
                    <div className="border-l vc-hairline pl-3">
                      <p className="text-slate-400">Donors</p>
                      <p className="mt-1 inline-flex items-center gap-1 font-mono text-sm font-semibold tabular-nums text-teal-300">
                        <Users className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{campaign.donorCount.toLocaleString('en-IN')}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Donation Panel Form */}
                <form
                  onSubmit={handleProceedToDonate}
                  noValidate
                  className="flex flex-col gap-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold tracking-[0.1em] text-amber-300">
                      Choose Contribution
                    </span>
                    <span className="text-xs text-slate-400">
                      Quick amounts in ₹
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                    {QUICK_AMOUNTS.map((amt) => {
                      const active = selectedQuickAmount === amt;
                      return (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => handleQuickSelect(amt)}
                          className={`min-h-[42px] rounded-lg px-2 py-2 font-mono text-xs font-semibold tabular-nums transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                            active
                              ? 'bg-amber-300 text-slate-950 shadow-[0_0_20px_-6px_rgba(251,191,36,0.6)]'
                              : 'border border-slate-800 bg-slate-900/70 text-slate-200 hover:border-sky-300/50 hover:text-white'
                          }`}
                        >
                          {formatINR(amt)}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="custom-donation-amount"
                      className="text-xs font-medium text-slate-300"
                    >
                      Or enter custom amount (₹)
                    </label>
                    <div className="relative">
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 font-mono text-sm text-amber-300"
                      >
                        ₹
                      </span>
                      <input
                        id="custom-donation-amount"
                        type="number"
                        min={100}
                        step={50}
                        value={customAmount}
                        onChange={(e) => handleCustomAmountChange(e.target.value)}
                        placeholder="1000"
                        className="min-h-[44px] w-full rounded-lg border border-slate-800 bg-slate-950/75 pr-4 pl-8 font-mono text-sm tabular-nums text-slate-100 placeholder:text-slate-500 focus:border-amber-300/60 focus:outline-none focus:ring-2 focus:ring-amber-300/20"
                      />
                    </div>
                  </div>

                  {amountError && (
                    <p role="alert" className="text-xs text-amber-300">
                      {amountError}
                    </p>
                  )}

                  <button
                    type="submit"
                    className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-teal-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_24px_-6px_rgba(45,212,191,0.55)] transition-all hover:bg-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
                  >
                    <HeartHandshake className="h-4 w-4" aria-hidden="true" />
                    <span>
                      Donate{' '}
                      {Number(customAmount) >= 100
                        ? formatINR(Number(customAmount))
                        : 'Now'}
                    </span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </form>

                {/* Save Campaign Action */}
                <button
                  type="button"
                  onClick={() => toggleSavedCampaign(campaign.id)}
                  className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-4 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-amber-300/50 hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                >
                  <Bookmark
                    className={`h-4 w-4 ${isSaved ? 'fill-amber-300 text-amber-300' : ''}`}
                    aria-hidden="true"
                  />
                  <span>
                    {isSaved ? 'Saved to Your Dashboard' : 'Save Campaign to Dashboard'}
                  </span>
                </button>
              </GlassSurface>

              {/* 8. Share Campaign Panel */}
              <GlassSurface className="flex flex-col gap-4 p-6">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display text-lg font-semibold text-slate-50">
                      Share This Story
                    </h3>
                    <p className="text-xs text-slate-400">
                      Every share helps reach compassionate supporters
                    </p>
                  </div>
                  <Share2 className="h-4 w-4 text-sky-300" aria-hidden="true" />
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-950/70 px-3.5 py-2 text-xs font-medium text-slate-200 whitespace-nowrap transition-colors hover:border-amber-300/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-teal-300" aria-hidden="true" />
                        <span className="text-teal-300">Link Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>

                  <a
                    href={`mailto:?subject=${shareText}&body=${encodedUrl}`}
                    aria-label="Share campaign via email"
                    className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950/70 px-3.5 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-sky-300/50 hover:text-white"
                  >
                    <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Email</span>
                  </a>

                  <a
                    href={`https://twitter.com/intent/tweet?text=${shareText}&url=${encodedUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Share campaign on X"
                    className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-slate-800 bg-slate-950/70 px-3.5 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-sky-300/50 hover:text-white"
                  >
                    Share on X
                  </a>

                  <a
                    href={`https://wa.me/?text=${shareText}%20${encodedUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Share campaign on WhatsApp"
                    className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-slate-800 bg-slate-950/70 px-3.5 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-teal-300/50 hover:text-white"
                  >
                    WhatsApp
                  </a>
                </div>
              </GlassSurface>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Related Campaigns (3 Similar Campaigns) */}
      {relatedCampaigns.length > 0 && (
        <section className="border-t vc-hairline py-14 sm:py-16">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-medium tracking-[0.14em] text-amber-300">
                  Continue Supporting
                </p>
                <h2 className="mt-1 font-display text-2xl font-semibold text-slate-50 sm:text-3xl">
                  Related Campaigns
                </h2>
              </div>
              <Link
                to="/campaigns"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-300 hover:text-sky-200"
              >
                <span>Explore all stories</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {relatedCampaigns.map((rel) => (
                <CampaignCard key={rel.id} campaign={rel} variant="detailed" />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Medical Document Preview Modal */}
      {previewDoc && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="doc-preview-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#020611]/80 p-4 backdrop-blur-sm"
          onClick={() => setPreviewDoc(null)}
        >
          <GlassSurface
            className="w-full max-w-lg p-6 sm:p-8"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex flex-col gap-5"
            >
              <div className="flex items-start justify-between gap-4 border-b vc-hairline pb-4">
                <div>
                  <p className="text-xs font-medium tracking-[0.12em] text-amber-300">
                    {previewDoc.docType}
                  </p>
                  <h3
                    id="doc-preview-title"
                    className="mt-1 font-display text-xl font-semibold text-slate-50"
                  >
                    {previewDoc.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  aria-label="Close document preview"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/70 text-slate-300 hover:text-white"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="rounded-xl border border-slate-800/80 bg-slate-950/75 p-5 text-sm">
                <div className="grid gap-3 text-xs sm:grid-cols-2">
                  <div>
                    <span className="text-slate-400">Issued By</span>
                    <p className="mt-0.5 font-medium text-slate-100">
                      {previewDoc.issuedBy}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Reference ID</span>
                    <p className="mt-0.5 font-mono text-sky-300">
                      {previewDoc.referenceCode}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Issued Date</span>
                    <p className="mt-0.5 font-mono text-slate-200">
                      {previewDoc.issuedDate}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Verification Status</span>
                    <p className="mt-0.5 font-medium text-teal-300">
                      {previewDoc.verified ? 'Authenticated Clinical Record' : 'Pending'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 border-t vc-hairline pt-4">
                  <p className="text-xs font-medium text-slate-400">
                    Clinical Summary
                  </p>
                  <p className="mt-1.5 leading-relaxed text-slate-200">
                    {previewDoc.summary}
                  </p>
                </div>

                {previewDoc.previewUrl ? (
                  <div className="mt-4 border-t vc-hairline pt-4">
                    <p className="mb-2 text-xs font-medium text-sky-300">
                      Temporary Browser File Preview
                    </p>
                    {previewDoc.mimeType === 'application/pdf' ? (
                      <iframe
                        title={previewDoc.fileName || previewDoc.title}
                        src={previewDoc.previewUrl}
                        className="h-64 w-full rounded-lg border border-slate-800 bg-white"
                      />
                    ) : (
                      <img
                        src={previewDoc.previewUrl}
                        alt={previewDoc.fileName || previewDoc.title}
                        className="max-h-64 w-full rounded-lg border border-slate-800 bg-slate-900 object-contain"
                      />
                    )}
                  </div>
                ) : previewDoc.isTemporaryPreview ? (
                  <p className="mt-4 border-t vc-hairline pt-3 text-xs text-amber-300/90">
                    Temporary browser preview is unavailable after page reload (uploaded files are not persisted in LocalStorage).
                  </p>
                ) : null}
              </div>

              <div className="flex justify-end">
                <VidaButton
                  type="button"
                  variant="secondary"
                  onClick={() => setPreviewDoc(null)}
                >
                  Close Preview
                </VidaButton>
              </div>
            </div>
          </GlassSurface>
        </div>
      )}
    </div>
  );
};
