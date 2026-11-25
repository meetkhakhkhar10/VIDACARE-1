import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
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

const QUICK_AMOUNTS = [500, 1000, 2500, 5000];

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
    }, 120);
    return () => window.clearTimeout(timer);
  }, [id]);

  useEffect(() => {
    if (!isLoading && searchParams.get('donate') === '1' && donationPanelRef.current) {
      donationPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isLoading, searchParams]);

  useEffect(() => {
    if (!previewDoc) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewDoc(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [previewDoc]);

  const rawCampaign = id ? getCampaignById(id) : undefined;
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

  if (isLoading) {
    return (
      <section className="py-12 sm:py-16" aria-busy="true" aria-label="Loading campaign details">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="h-5 w-48 animate-pulse rounded-xl bg-[#DDF3E9]" />
          <div className="mt-8 grid gap-10 lg:grid-cols-12">
            <div className="flex flex-col gap-6 lg:col-span-7">
              <div className="h-10 w-3/4 animate-pulse rounded-xl bg-[#DDF3E9]" />
              <div className="aspect-[16/10] w-full animate-pulse rounded-2xl bg-[#DDF3E9]/80" />
              <div className="h-48 w-full animate-pulse rounded-2xl bg-white" />
            </div>
            <div className="lg:col-span-5">
              <div className="h-96 w-full animate-pulse rounded-2xl bg-white" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (hasError) {
    return (
      <section className="py-20">
        <div className="mx-auto max-w-[780px] px-4 sm:px-6 lg:px-8">
          <GlassSurface className="flex flex-col items-start gap-4 p-8 sm:p-12">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-[11px] font-semibold tracking-[0.16em] text-[#159B79] uppercase">
              Unable to Load Campaign
            </p>
            <h1 className="font-display text-3xl font-bold text-[#123C35]">
              Something interrupted loading this medical story.
            </h1>
            <p className="text-sm leading-relaxed text-[#414846]">
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

  if (!campaign) {
    return (
      <section className="py-20">
        <div className="mx-auto max-w-[780px] px-4 sm:px-6 lg:px-8">
          <GlassSurface className="flex flex-col items-start gap-4 p-8 sm:p-12">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-[#159B79] uppercase">
              Campaign Unavailable
            </p>
            <h1 className="font-display text-3xl font-bold text-[#123C35]">
              This campaign could not be found or is awaiting clinical approval.
            </h1>
            <p className="text-sm leading-relaxed text-[#414846]">
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

  const milestones = [
    {
      label: 'Clinical Intake & Documentation Submitted',
      detail: `${campaign.documents?.length ?? 0} medical records attached`,
      complete: true,
    },
    {
      label: 'Hospital & Treatment Estimate Reviewed',
      detail: campaign.verifiedBy,
      complete: Boolean(campaign.hospitalVerified || campaign.status === 'approved'),
    },
    {
      label: 'Active Fundraising & Donor Disbursement',
      detail: `${progress}% of ${formatINR(campaign.goalAmount)} goal mobilized`,
      complete: campaign.raisedAmount > 0,
    },
  ];

  return (
    <div className="flex flex-col">
      <section className="bg-[#F8FAF7] py-10 sm:py-12">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs & Back Action */}
          <div className="flex flex-col justify-between gap-4 border-b border-[#123C35]/12 pb-5 sm:flex-row sm:items-center">
            <nav
              aria-label="Breadcrumb"
              className="flex flex-wrap items-center gap-1.5 text-xs text-[#414846]"
            >
              <Link to="/" className="font-medium transition-colors hover:text-[#123C35]">
                Home
              </Link>
              <ChevronRight className="h-3.5 w-3.5 text-[#414846]/60" aria-hidden="true" />
              <Link
                to="/campaigns"
                className="font-medium transition-colors hover:text-[#123C35]"
              >
                Campaigns
              </Link>
              <ChevronRight className="h-3.5 w-3.5 text-[#414846]/60" aria-hidden="true" />
              <span className="max-w-[240px] truncate font-semibold text-[#123C35]">
                {campaign.patientName}
              </span>
            </nav>

            <Link
              to="/campaigns"
              className="inline-flex min-h-[40px] w-fit items-center gap-2 rounded-xl border border-[#123C35]/20 bg-white px-4 py-2 text-xs font-semibold text-[#123C35] transition-colors hover:border-[#159B79] hover:bg-[#DDF3E9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#159B79]"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Back to Campaigns</span>
            </Link>
          </div>

          {/* Editorial Campaign Header */}
          <div className="mt-7 flex flex-col gap-3.5">
            <div className="flex flex-wrap items-center gap-2.5 text-xs text-[#414846]">
              <span className="vc-badge-green">
                <ShieldCheck className="h-3.5 w-3.5 text-[#159B79]" aria-hidden="true" />
                <span>Clinically Approved</span>
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-[#159B79]">{campaign.category}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 font-medium">
                <MapPin className="h-3.5 w-3.5 text-[#159B79]" aria-hidden="true" />
                <span>{campaign.location}</span>
              </span>
              {(campaign.isUrgent || campaign.daysRemaining <= 10) && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="vc-badge-amber">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="vc-numeric">{campaign.daysRemaining}d remaining</span>
                  </span>
                </>
              )}
            </div>

            <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-[#123C35] sm:text-4xl lg:text-[2.55rem]">
              {campaign.title}
            </h1>

            <p className="text-sm text-[#414846] sm:text-base">
              Patient:{' '}
              <span className="font-semibold text-[#131E1C]">
                {campaign.patientName}
              </span>{' '}
              ({campaign.ageLabel}) · Diagnosis:{' '}
              <span className="font-semibold text-[#123C35]">
                {campaign.condition}
              </span>
            </p>
          </div>

          {/* Two-Column Content Layout */}
          <div className="mt-9 grid items-start gap-8 lg:grid-cols-12">
            {/* Left Primary Story & Clinical Verification Column */}
            <div className="flex flex-col gap-7 lg:col-span-7">
              <div className="overflow-hidden rounded-[20px] border border-[#123C35]/12 bg-white shadow-sm">
                <SafeImage
                  src={campaign.imageUrl}
                  alt={`${campaign.patientName} — ${campaign.condition}`}
                  fallbackTitle={campaign.title}
                  className="aspect-[16/10] w-full object-cover"
                />
              </div>

              {/* 1. Patient & Organizer Story */}
              <GlassSurface className="flex flex-col gap-5 p-6 sm:p-8">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.14em] text-[#159B79] uppercase">
                    Campaigner Narrative
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-bold text-[#123C35]">
                    Patient Story
                  </h2>
                </div>

                <div className="flex flex-col gap-4">
                  {campaign.story.map((paragraph, idx) => (
                    <p
                      key={idx}
                      className="text-[0.95rem] leading-relaxed text-[#131E1C]"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#123C35]/10 pt-5 text-xs text-[#414846]">
                  <div>
                    <span>Organized by </span>
                    <strong className="font-semibold text-[#131E1C]">
                      {campaign.organizerName}
                    </strong>{' '}
                    ({campaign.organizerRelation})
                  </div>
                  <span>
                    Settlement Preference:{' '}
                    <strong className="font-semibold text-[#123C35]">
                      {campaign.settlementPreference || 'Direct Hospital Billing'}
                    </strong>
                  </span>
                </div>
              </GlassSurface>

              {/* 2. Clinical Condition & Hospital Care Plan */}
              <GlassSurface className="flex flex-col gap-5 p-6 sm:p-8">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.14em] text-[#159B79] uppercase">
                    Clinical Summary
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-bold text-[#123C35]">
                    Diagnosis &amp; Treatment Plan
                  </h2>
                </div>

                <div className="grid gap-4 rounded-xl border border-[#123C35]/10 bg-[#F8FAF7] p-5 sm:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#DDF3E9] text-[#123C35]">
                      <Building2 className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[#414846]">Treating Hospital</p>
                      <p className="mt-0.5 text-sm font-semibold text-[#131E1C]">
                        {campaign.hospitalName}
                      </p>
                      <p className="text-xs text-[#414846]">{campaign.location}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#DDF3E9] text-[#159B79]">
                      <Stethoscope className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[#414846]">Clinical Verification</p>
                      <p className="mt-0.5 text-sm font-semibold text-[#131E1C]">
                        {campaign.verifiedBy}
                      </p>
                      {campaign.treatingDoctor && (
                        <p className="text-xs text-[#414846]">
                          Lead Clinician: {campaign.treatingDoctor}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold tracking-[0.1em] text-[#414846] uppercase">
                    Planned Treatment Protocol
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#131E1C]">
                    {campaign.treatmentDetails}
                  </p>
                </div>

                {/* Milestone Timeline */}
                <div className="border-t border-[#123C35]/10 pt-5">
                  <h3 className="text-xs font-semibold tracking-[0.1em] text-[#414846] uppercase">
                    Verification &amp; Care Milestones
                  </h3>
                  <div className="mt-4 flex flex-col gap-3.5">
                    {milestones.map((ms) => (
                      <div key={ms.label} className="flex items-start gap-3">
                        <CheckCircle2
                          className={`mt-0.5 h-4 w-4 shrink-0 ${
                            ms.complete ? 'text-[#159B79]' : 'text-[#414846]/40'
                          }`}
                          aria-hidden="true"
                        />
                        <div>
                          <p className="text-sm font-semibold text-[#123C35]">{ms.label}</p>
                          <p className="text-xs text-[#414846]">{ms.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </GlassSurface>

              {/* 3. Medical Documents */}
              <GlassSurface className="flex flex-col gap-5 p-6 sm:p-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold tracking-[0.14em] text-[#159B79] uppercase">
                      Supporting Records
                    </p>
                    <h2 className="mt-1 font-display text-2xl font-bold text-[#123C35]">
                      Medical Documents
                    </h2>
                  </div>
                  <span className="vc-numeric rounded-lg bg-[#DDF3E9] px-3 py-1 text-xs font-semibold text-[#123C35]">
                    {campaign.documents?.length ?? 0}{' '}
                    {(campaign.documents?.length ?? 0) === 1 ? 'record' : 'records'}
                  </span>
                </div>

                {!campaign.documents || campaign.documents.length === 0 ? (
                  <p className="rounded-xl border border-[#123C35]/10 bg-[#F8FAF7] p-4 text-sm text-[#414846]">
                    Verification records are held on file with {campaign.verifiedBy}.
                    No public document attachments have been uploaded for preview.
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {campaign.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex flex-col justify-between gap-4 rounded-xl border border-[#123C35]/12 bg-[#F8FAF7] p-4 sm:flex-row sm:items-center"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#159B79]/20 bg-white text-[#159B79]">
                            <FileText className="h-5 w-5" aria-hidden="true" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#131E1C]">
                              {doc.title}
                            </p>
                            <p className="mt-0.5 text-xs text-[#414846]">
                              {doc.docType} · {doc.issuedDate} · {doc.fileSize}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setPreviewDoc(doc)}
                          className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-[#123C35]/20 bg-white px-4 py-1.5 text-xs font-semibold text-[#123C35] whitespace-nowrap shrink-0 transition-colors hover:border-[#159B79] hover:bg-[#DDF3E9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#159B79]"
                        >
                          Inspect Record
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </GlassSurface>

              {/* 4. Bedside Updates */}
              <GlassSurface className="flex flex-col gap-5 p-6 sm:p-8">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="font-display text-2xl font-bold text-[#123C35]">
                    Clinical &amp; Bedside Updates
                  </h2>
                  <span className="vc-numeric text-xs font-medium text-[#414846]">
                    {campaign.updates.length}{' '}
                    {campaign.updates.length === 1 ? 'update' : 'updates'}
                  </span>
                </div>

                {campaign.updates.length === 0 ? (
                  <p className="rounded-xl border border-[#123C35]/10 bg-[#F8FAF7] p-4 text-sm text-[#414846]">
                    No post-intake clinical updates have been published yet. Save
                    this campaign to track progress from your dashboard.
                  </p>
                ) : (
                  <div className="flex flex-col gap-5">
                    {campaign.updates.map((upd) => (
                      <div
                        key={upd.id}
                        className="border-t border-[#123C35]/10 pt-5 first:border-t-0 first:pt-0"
                      >
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#414846]">
                          <span className="vc-numeric font-semibold text-[#159B79]">
                            {upd.date}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>Shared by {upd.author}</span>
                        </div>
                        <h3 className="mt-1.5 text-base font-bold text-[#123C35]">
                          {upd.title}
                        </h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-[#414846]">
                          {upd.summary}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </GlassSurface>

              {/* 5. Recent Donors */}
              <GlassSurface className="flex flex-col gap-5 p-6 sm:p-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-display text-2xl font-bold text-[#123C35]">
                      Donor Wall &amp; Support Notes
                    </h2>
                    <p className="mt-1 text-xs text-[#414846]">
                      Community supporters standing beside {campaign.patientName}
                    </p>
                  </div>
                  <span className="vc-numeric rounded-lg bg-[#DDF3E9] px-3 py-1 text-xs font-semibold text-[#123C35]">
                    {campaign.donorCount.toLocaleString('en-IN')} supporters
                  </span>
                </div>

                {campaignDonors.length === 0 ? (
                  <p className="rounded-xl border border-[#123C35]/10 bg-[#F8FAF7] p-4 text-sm text-[#414846]">
                    Be the first supporter to leave a message of encouragement for{' '}
                    {campaign.patientName}.
                  </p>
                ) : (
                  <div className="flex flex-col divide-y divide-[#123C35]/10">
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
                            <span className="text-sm font-semibold text-[#131E1C]">
                              {displayName}
                            </span>
                            <span className="vc-numeric text-sm font-bold text-[#159B79]">
                              {formatINR(donor.amount)}
                            </span>
                          </div>
                          {donor.message && (
                            <p className="text-xs leading-relaxed text-[#414846]">
                              “{donor.message}”
                            </p>
                          )}
                          <p className="vc-numeric text-[11px] text-[#414846]/80">
                            {donor.timestamp.slice(0, 10)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </GlassSurface>
            </div>

            {/* Right Sticky Donation Panel Column */}
            <div
              ref={donationPanelRef}
              className="flex flex-col gap-6 lg:col-span-5 lg:sticky lg:top-24"
            >
              <GlassSurface className="flex flex-col gap-6 p-6 sm:p-8 vc-glow-accent">
                <div className="flex flex-col gap-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-[#414846]">
                        Amount Raised
                      </p>
                      <p className="vc-numeric mt-0.5 text-3xl font-bold text-[#123C35]">
                        {formatINR(campaign.raisedAmount)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="vc-numeric text-lg font-bold text-[#159B79]">
                        {progress}%
                      </p>
                      <p className="text-xs text-[#414846]">funded</p>
                    </div>
                  </div>

                  <ProgressMeter
                    value={progress}
                    label={`${campaign.patientName} fundraising progress`}
                  />

                  <div className="grid grid-cols-3 gap-3 border-y border-[#123C35]/10 py-4 text-xs">
                    <div>
                      <p className="text-[#414846]">Target Goal</p>
                      <p className="vc-numeric mt-1 text-sm font-bold text-[#131E1C]">
                        {formatINR(campaign.goalAmount)}
                      </p>
                    </div>
                    <div className="border-l border-[#123C35]/10 pl-3">
                      <p className="text-[#414846]">Remaining</p>
                      <p className="vc-numeric mt-1 text-sm font-bold text-[#123C35]">
                        {formatINR(remainingAmount)}
                      </p>
                    </div>
                    <div className="border-l border-[#123C35]/10 pl-3">
                      <p className="text-[#414846]">Supporters</p>
                      <p className="vc-numeric mt-1 inline-flex items-center gap-1 text-sm font-bold text-[#159B79]">
                        <Users className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{campaign.donorCount.toLocaleString('en-IN')}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contribution Form */}
                <form
                  onSubmit={handleProceedToDonate}
                  noValidate
                  className="flex flex-col gap-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold tracking-[0.12em] text-[#159B79] uppercase">
                      Select Contribution
                    </span>
                    <span className="text-xs text-[#414846]">
                      0% platform deduction
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
                          className={`vc-numeric min-h-[44px] rounded-xl px-2 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#159B79] ${
                            active
                              ? 'bg-[#123C35] text-white'
                              : 'border border-[#123C35]/18 bg-[#F8FAF7] text-[#131E1C] hover:border-[#159B79] hover:bg-[#DDF3E9]'
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
                      className="text-xs font-semibold text-[#131E1C]"
                    >
                      Custom Amount (₹)
                    </label>
                    <div className="relative">
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm font-bold text-[#159B79]"
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
                        className="vc-input vc-numeric pl-8"
                      />
                    </div>
                  </div>

                  {amountError && (
                    <p
                      role="alert"
                      className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
                    >
                      {amountError}
                    </p>
                  )}

                  <button
                    type="submit"
                    className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-[#123C35] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#159B79] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#159B79] focus-visible:ring-offset-2"
                  >
                    <HeartHandshake className="h-4 w-4" aria-hidden="true" />
                    <span className="vc-numeric">
                      Proceed to Donate{' '}
                      {Number(customAmount) >= 100
                        ? formatINR(Number(customAmount))
                        : ''}
                    </span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </form>

                {/* Save Bookmark */}
                <button
                  type="button"
                  onClick={() => toggleSavedCampaign(campaign.id)}
                  className={`inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#159B79] ${
                    isSaved
                      ? 'border-[#159B79]/40 bg-[#DDF3E9] text-[#123C35]'
                      : 'border-[#123C35]/20 bg-[#F8FAF7] text-[#123C35] hover:border-[#159B79] hover:bg-[#DDF3E9]'
                  }`}
                >
                  <Bookmark
                    className={`h-4 w-4 ${isSaved ? 'fill-[#159B79] text-[#159B79]' : ''}`}
                    aria-hidden="true"
                  />
                  <span>
                    {isSaved ? 'Saved in Your Portal' : 'Save Campaign'}
                  </span>
                </button>
              </GlassSurface>

              {/* Share Card */}
              <GlassSurface className="flex flex-col gap-4 p-6">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#123C35]">
                      Share This Story
                    </h3>
                    <p className="text-xs text-[#414846]">
                      Help connect this family with compassionate supporters
                    </p>
                  </div>
                  <Share2 className="h-4 w-4 text-[#159B79]" aria-hidden="true" />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-xl border border-[#123C35]/18 bg-[#F8FAF7] px-3.5 py-2 text-xs font-semibold text-[#123C35] whitespace-nowrap transition-colors hover:border-[#159B79] hover:bg-[#DDF3E9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#159B79]"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-[#159B79]" aria-hidden="true" />
                        <span className="text-[#159B79]">Copied</span>
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
                    className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-[#123C35]/18 bg-[#F8FAF7] px-3.5 py-2 text-xs font-semibold text-[#123C35] transition-colors hover:border-[#159B79] hover:bg-[#DDF3E9]"
                  >
                    <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Email</span>
                  </a>

                  <a
                    href={`https://twitter.com/intent/tweet?text=${shareText}&url=${encodedUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Share campaign on X"
                    className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-[#123C35]/18 bg-[#F8FAF7] px-3.5 py-2 text-xs font-semibold text-[#123C35] transition-colors hover:border-[#159B79] hover:bg-[#DDF3E9]"
                  >
                    Post on X
                  </a>

                  <a
                    href={`https://wa.me/?text=${shareText}%20${encodedUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Share campaign on WhatsApp"
                    className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-[#123C35]/18 bg-[#F8FAF7] px-3.5 py-2 text-xs font-semibold text-[#123C35] transition-colors hover:border-[#159B79] hover:bg-[#DDF3E9]"
                  >
                    WhatsApp
                  </a>
                </div>
              </GlassSurface>
            </div>
          </div>
        </div>
      </section>

      {/* Related Campaigns */}
      {relatedCampaigns.length > 0 && (
        <section className="border-t border-[#123C35]/10 bg-white py-14 sm:py-16">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.16em] text-[#159B79] uppercase">
                  Continue Supporting
                </p>
                <h2 className="mt-1 font-display text-2xl font-bold text-[#123C35] sm:text-3xl">
                  Related Campaigns
                </h2>
              </div>
              <Link
                to="/campaigns"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#159B79] hover:text-[#123C35]"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#123C35]/45 p-4 backdrop-blur-sm"
          onClick={() => setPreviewDoc(null)}
        >
          <GlassSurface className="w-full max-w-lg p-6 sm:p-8">
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex flex-col gap-5"
            >
              <div className="flex items-start justify-between gap-4 border-b border-[#123C35]/12 pb-4">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.14em] text-[#159B79] uppercase">
                    {previewDoc.docType}
                  </p>
                  <h3
                    id="doc-preview-title"
                    className="mt-1 font-display text-xl font-bold text-[#123C35]"
                  >
                    {previewDoc.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  aria-label="Close document preview"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#123C35]/15 bg-[#F8FAF7] text-[#414846] transition-colors hover:bg-[#DDF3E9] hover:text-[#123C35]"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="rounded-xl border border-[#123C35]/12 bg-[#F8FAF7] p-5 text-sm">
                <div className="grid gap-3 text-xs sm:grid-cols-2">
                  <div>
                    <span className="font-medium text-[#414846]">Issued By</span>
                    <p className="mt-0.5 font-semibold text-[#131E1C]">
                      {previewDoc.issuedBy}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-[#414846]">Reference ID</span>
                    <p className="vc-numeric mt-0.5 font-semibold text-[#123C35]">
                      {previewDoc.referenceCode}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-[#414846]">Issued Date</span>
                    <p className="vc-numeric mt-0.5 font-medium text-[#131E1C]">
                      {previewDoc.issuedDate}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-[#414846]">Review Status</span>
                    <p className="mt-0.5 font-semibold text-[#159B79]">
                      {previewDoc.verified ? 'Verified Clinical Record' : 'Pending Review'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 border-t border-[#123C35]/10 pt-4">
                  <p className="text-xs font-semibold text-[#414846]">
                    Clinical Summary
                  </p>
                  <p className="mt-1.5 leading-relaxed text-[#131E1C]">
                    {previewDoc.summary}
                  </p>
                </div>

                {previewDoc.previewUrl ? (
                  <div className="mt-4 border-t border-[#123C35]/10 pt-4">
                    <p className="mb-2 text-xs font-semibold text-[#159B79]">
                      Temporary Browser File Preview
                    </p>
                    {previewDoc.mimeType === 'application/pdf' ? (
                      <iframe
                        title={previewDoc.fileName || previewDoc.title}
                        src={previewDoc.previewUrl}
                        className="h-64 w-full rounded-xl border border-[#123C35]/15 bg-white"
                      />
                    ) : (
                      <img
                        src={previewDoc.previewUrl}
                        alt={previewDoc.fileName || previewDoc.title}
                        className="max-h-64 w-full rounded-xl border border-[#123C35]/15 bg-white object-contain"
                      />
                    )}
                  </div>
                ) : previewDoc.isTemporaryPreview ? (
                  <p className="mt-4 border-t border-[#123C35]/10 pt-3 text-xs font-medium text-amber-800">
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
