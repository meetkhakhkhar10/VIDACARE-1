import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Calendar,
  FileCheck2,
  FileHeart,
  HandHeart,
  Share2,
  ShieldCheck,
} from 'lucide-react';
import { HERO_SCULPTURE_IMAGE } from '../data/mockCampaigns';
import { useVidaCare } from '../context/VidaCareContext';
import { formatINR } from '../lib/format';
import { CampaignCard } from '../components/CampaignCard';
import { MedicalCategoriesSection } from '../components/MedicalCategoriesSection';
import { SafeImage } from '../components/SafeImage';
import {
  GlassSurface,
  SectionHeading,
  VidaButton,
} from '../components/ui/DesignPrimitives';

const TRANSPARENCY_PILLARS = [
  {
    title: 'Hospital Billing Verification',
    description:
      'Every patient fundraiser is reviewed against treatment cost estimates, diagnostic summaries, and hospital contact records prior to approval.',
    icon: Building2,
  },
  {
    title: '0% Platform Fee on Care Funds',
    description:
      '100% of every patient contribution is allocated toward medical treatment, surgical invoices, and rehabilitation without platform deductions.',
    icon: ShieldCheck,
  },
  {
    title: 'Bedside Recovery Updates',
    description:
      'Organizers post dated clinical milestones and discharge progress notes so supporters can follow the patient journey transparently.',
    icon: FileCheck2,
  },
];

const HOW_IT_WORKS_STEPS = [
  {
    step: '01',
    title: 'Submit Patient & Clinical Intake',
    description:
      'Provide patient details, hospital estimate, and medical documents through our guided 6-step fundraiser workflow.',
    icon: FileHeart,
  },
  {
    step: '02',
    title: 'Clinical Desk Verification',
    description:
      'Our verification reviewers inspect submitted hospital records before publishing the campaign to the live directory.',
    icon: ShieldCheck,
  },
  {
    step: '03',
    title: 'Mobilize Community & Care Support',
    description:
      'Share the verified story with family and compassionate donors, post bedside milestones, and track contributions.',
    icon: HandHeart,
  },
];

export const HomePage: React.FC = () => {
  const {
    approvedCampaigns,
    campaigns,
    donations,
    totalRaisedPlatform,
    totalDonorsPlatform,
  } = useVidaCare();

  const pendingCount = campaigns.filter((c) => c.status === 'pending').length;

  const impactStats = [
    {
      label: 'Total Funds Raised',
      value: formatINR(totalRaisedPlatform),
      context: `${donations.length} logged contributions across active care units`,
      accent: 'text-[#123C35]',
    },
    {
      label: 'Verified Patient Cases',
      value: `${approvedCampaigns.length} Active`,
      context:
        pendingCount > 0
          ? `${pendingCount} additional ${pendingCount === 1 ? 'case' : 'cases'} in review`
          : 'Clinically reviewed prior to listing',
      accent: 'text-[#159B79]',
    },
    {
      label: 'Community Supporters',
      value: totalDonorsPlatform.toLocaleString('en-IN'),
      context: 'Standing beside families across critical care',
      accent: 'text-[#123C35]',
    },
  ];

  const urgentCampaigns = useMemo(
    () =>
      [...approvedCampaigns]
        .sort((a, b) => {
          if (Boolean(a.featured) !== Boolean(b.featured)) {
            return a.featured ? -1 : 1;
          }
          if (Boolean(a.isUrgent) !== Boolean(b.isUrgent)) {
            return a.isUrgent ? -1 : 1;
          }
          return a.daysRemaining - b.daysRemaining;
        })
        .slice(0, 3),
    [approvedCampaigns]
  );

  const recentPatientUpdates = useMemo(() => {
    const items: Array<{
      id: string;
      campaignId: string;
      patientName: string;
      hospitalName: string;
      title: string;
      summary: string;
      date: string;
      author: string;
    }> = [];
    for (const c of approvedCampaigns) {
      for (const upd of c.updates) {
        items.push({
          id: upd.id,
          campaignId: c.id,
          patientName: c.patientName,
          hospitalName: c.hospitalName,
          title: upd.title,
          summary: upd.summary,
          date: upd.date,
          author: upd.author,
        });
      }
    }
    return items.slice(0, 3);
  }, [approvedCampaigns]);

  return (
    <div className="flex flex-col">
      {/* 1. Editorial Hero Section */}
      <section className="bg-[#F0FCF8] pt-12 pb-14 sm:pt-16 sm:pb-18 lg:pt-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
            {/* Left Copy Column */}
            <div className="flex flex-col items-start gap-5 lg:col-span-6">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-[#159B79] uppercase">
                Verified Medical Crowdfunding
              </p>

              <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight text-[#123C35] sm:text-5xl lg:text-[3.35rem]">
                Together, We Make Healing Possible.
              </h1>

              <p className="max-w-xl text-base leading-relaxed text-[#414846] sm:text-[1.0625rem]">
                Help patients and families bridge life-saving surgeries,
                targeted oncology therapies, and critical rehabilitation through
                hospital-verified fundraising with 0% platform deduction on care
                funds.
              </p>

              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <VidaButton to="/start-fundraiser" variant="primary">
                  <span>Start a Fundraiser</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </VidaButton>
                <VidaButton to="/campaigns" variant="secondary">
                  Explore Campaigns
                </VidaButton>
              </div>
            </div>

            {/* Right Clinical Photography Frame */}
            <div className="lg:col-span-6">
              <div className="relative mx-auto w-full max-w-[520px] overflow-hidden rounded-[20px] border border-[#123C35]/12 bg-white shadow-[0_20px_50px_-22px_rgba(18,60,53,0.22)]">
                <SafeImage
                  src={HERO_SCULPTURE_IMAGE}
                  alt="Compassionate medical care and family support"
                  fallbackTitle="VidaCare Medical Care"
                  className="aspect-[5/4] w-full object-cover"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#123C35]/70 via-transparent to-transparent"
                />
                <div className="absolute inset-x-4 bottom-4 rounded-xl border border-[#123C35]/12 bg-white/95 px-4 py-3 backdrop-blur-md">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div>
                      <p className="font-semibold text-[#123C35]">
                        Direct Clinical Verification
                      </p>
                      <p className="text-[#414846]">
                        Reviewed against hospital estimates
                      </p>
                    </div>
                    <span className="vc-numeric rounded-lg bg-[#DDF3E9] px-2.5 py-1 font-bold text-[#123C35]">
                      0% Platform Fee
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Aligned Impact Statistics Strip */}
          <div className="mt-14 grid gap-6 border-y border-[#123C35]/12 py-8 sm:grid-cols-3">
            {impactStats.map((stat, idx) => (
              <div
                key={stat.label}
                className={`flex flex-col gap-1 ${
                  idx > 0 ? 'sm:border-l sm:border-[#123C35]/12 sm:pl-6' : ''
                }`}
              >
                <span className="text-[11px] font-semibold tracking-[0.12em] text-[#414846] uppercase">
                  {stat.label}
                </span>
                <span
                  className={`vc-numeric text-2xl font-bold tracking-tight sm:text-3xl ${stat.accent}`}
                >
                  {stat.value}
                </span>
                <span className="text-xs text-[#414846]">{stat.context}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Urgent Campaigns Section */}
      <section className="border-t border-[#123C35]/10 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 border-b border-[#123C35]/10 pb-8 sm:flex-row sm:items-end">
            <SectionHeading
              kicker="Urgent Medical Needs"
              title="Patients Counting on Timely Care"
              description="Clinically reviewed patient stories raising funds for upcoming surgical dates and time-critical treatments."
            />
            <Link
              to="/campaigns"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#159B79] transition-colors hover:text-[#123C35] whitespace-nowrap shrink-0"
            >
              <span>View all campaigns</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {urgentCampaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} variant="detailed" />
            ))}
          </div>
        </div>
      </section>

      {/* 4. Trust & Transparency Architecture */}
      <section className="border-t border-[#123C35]/10 bg-[#F0FCF8] py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="Institutional Trust"
            title="Built Around Clinical Integrity"
            description="Every safeguard on VidaCare is structured to protect patients, families, and donors with clear medical documentation."
          />

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {TRANSPARENCY_PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <GlassSurface key={pillar.title} className="flex flex-col gap-4 p-7">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#DDF3E9] text-[#123C35]">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-[#123C35]">
                    {pillar.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#414846]">
                    {pillar.description}
                  </p>
                </GlassSurface>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. How It Works */}
      <section
        id="how-it-works"
        className="scroll-mt-20 border-t border-[#123C35]/10 bg-white py-16 sm:py-20"
      >
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 border-b border-[#123C35]/10 pb-8 sm:flex-row sm:items-end">
            <SectionHeading
              kicker="How It Works"
              title="Three Clear Steps to Mobilize Care"
              description="Structured to remove friction during urgent hospital moments so families can focus on recovery."
            />
            <VidaButton to="/start-fundraiser" variant="mint">
              <span>Begin Intake</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </VidaButton>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {HOW_IT_WORKS_STEPS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="vc-panel-warm flex flex-col gap-4 p-7"
                >
                  <div className="flex items-center justify-between">
                    <span className="vc-numeric text-xs font-bold tracking-[0.14em] text-[#159B79] uppercase">
                      Step {item.step}
                    </span>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-[#123C35]/10 text-[#123C35]">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                  </div>
                  <h3 className="font-display text-lg font-bold text-[#123C35]">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#414846]">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. Medical Specialties Section */}
      <MedicalCategoriesSection />

      {/* 7. Recent Clinical Updates Feed */}
      {recentPatientUpdates.length > 0 && (
        <section className="border-t border-[#123C35]/10 bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-6 border-b border-[#123C35]/10 pb-8 sm:flex-row sm:items-end">
              <SectionHeading
                kicker="Patient Recovery Journal"
                title="Latest Clinical Updates"
                description="Recent progress notes shared directly by families and treatment coordinators across active fundraisers."
              />
              <Link
                to="/campaigns"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#159B79] transition-colors hover:text-[#123C35] whitespace-nowrap shrink-0"
              >
                <span>Follow patient stories</span>
                <Share2 className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {recentPatientUpdates.map((upd) => (
                <GlassSurface key={upd.id} className="flex flex-col justify-between gap-4 p-6">
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between gap-2 text-xs text-[#414846]">
                      <span className="font-semibold text-[#159B79]">
                        {upd.patientName}
                      </span>
                      <span className="vc-numeric inline-flex items-center gap-1 text-[#414846]">
                        <Calendar className="h-3.5 w-3.5 text-[#159B79]" aria-hidden="true" />
                        <span>{upd.date}</span>
                      </span>
                    </div>
                    <h3 className="font-display text-lg font-bold text-[#123C35]">
                      {upd.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-[#414846]">
                      {upd.summary}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-[#123C35]/10 pt-3 text-xs">
                    <span className="truncate text-[#414846]">{upd.hospitalName}</span>
                    <Link
                      to={`/campaigns/${upd.campaignId}`}
                      className="font-semibold text-[#123C35] hover:text-[#159B79] shrink-0"
                    >
                      Read story →
                    </Link>
                  </div>
                </GlassSurface>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 8. Closing Call to Action */}
      <section className="border-t border-[#123C35]/10 bg-[#F0FCF8] py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[20px] bg-[#123C35] p-8 text-white shadow-[0_20px_50px_-20px_rgba(18,60,53,0.38)] sm:p-12 lg:p-14">
            <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold tracking-[0.16em] text-[#DDF3E9] uppercase">
                  Take Action Today
                </p>
                <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Your Support Can Change a Life
                </h2>
                <p className="mt-3 text-base leading-relaxed text-[#DDF3E9]/90">
                  Every contribution—large or modest—brings a verified patient
                  closer to scheduled surgery, medication continuity, and
                  recovery.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3.5 shrink-0">
                <VidaButton to="/campaigns" variant="inverted">
                  <span>Donate to a Patient</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </VidaButton>
                <VidaButton to="/about" variant="inverted-outline">
                  Our Verification Standards
                </VidaButton>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
