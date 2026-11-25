import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight,
  FileCheck2,
  FileHeart,
  HandHeart,
  Lock,
  Share2,
  ShieldCheck,
  Users,
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

const HOW_IT_WORKS_STEPS = [
  {
    step: '01.',
    title: 'Create a Campaign',
    description:
      'Share the patient’s diagnosis, treatment plan, and clinical billing details through our guided medical intake.',
    icon: FileHeart,
  },
  {
    step: '02.',
    title: 'Share Your Story',
    description:
      'Publish verified care milestones and invite friends, community networks, and compassionate donors to rally behind recovery.',
    icon: Share2,
  },
  {
    step: '03.',
    title: 'Receive Support',
    description:
      'Contributions settle quickly and transparently toward hospital invoices, medications, and essential post-operative care.',
    icon: HandHeart,
  },
];

const WHY_VIDACARE_ITEMS = [
  {
    title: 'Secure Donations',
    description:
      'Bank-grade encrypted contributions protect every supporter gift and ensure reliable medical disbursement.',
    icon: Lock,
    tint: 'text-[#16A085]',
  },
  {
    title: 'Verified Campaigns',
    description:
      'Every patient fundraiser undergoes clinical document and hospital billing verification prior to going live.',
    icon: ShieldCheck,
    tint: 'text-[#123C35]',
  },
  {
    title: 'Transparent Updates',
    description:
      'Families post milestone progress notes and care updates so donors see the tangible impact of their generosity.',
    icon: FileCheck2,
    tint: 'text-[#16A085]',
  },
  {
    title: 'Community Support',
    description:
      'Dedicated care liaisons and a compassionate network stand beside families throughout diagnosis and healing.',
    icon: Users,
    tint: 'text-[#123C35]',
  },
];

export const HomePage: React.FC = () => {
  const {
    approvedCampaigns,
    campaigns,
    donations,
    totalRaisedPlatform,
    totalDonorsPlatform,
    user,
  } = useVidaCare();

  const pendingCount = campaigns.filter((c) => c.status === 'pending').length;

  const impactStats = [
    {
      label: 'Total Funds Raised',
      value: formatINR(totalRaisedPlatform),
      context: `${donations.length} logged gifts directed toward hospital care`,
      accent: 'text-[#123C35]',
    },
    {
      label: 'Patients Helped',
      value: `${approvedCampaigns.length} Verified`,
      context:
        pendingCount > 0
          ? `${pendingCount} pending clinical verification`
          : 'Active patient fundraisers across care units',
      accent: 'text-[#16A085]',
    },
    {
      label: 'Generous Donors',
      value: totalDonorsPlatform.toLocaleString('en-IN'),
      context: 'Standing beside families worldwide',
      accent: 'text-[#123C35]',
    },
  ];

  const urgentCampaigns = [...approvedCampaigns]
    .sort((a, b) => {
      if (Boolean(a.featured) !== Boolean(b.featured)) {
        return a.featured ? -1 : 1;
      }
      if (Boolean(a.isUrgent) !== Boolean(b.isUrgent)) {
        return a.isUrgent ? -1 : 1;
      }
      return a.daysRemaining - b.daysRemaining;
    })
    .slice(0, 3);

  const startFundraiserPath = '/start-fundraiser';

  return (
    <div className="flex flex-col">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
            {/* Left Copy Column */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-start gap-6 lg:col-span-6"
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-[#DDF3E9] px-3.5 py-1 text-xs font-semibold text-[#123C35]">
                <span className="h-2 w-2 rounded-full bg-[#16A085]" />
                <span>Verified Medical Crowdfunding Platform</span>
              </div>

              <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight text-[#123C35] sm:text-5xl lg:text-[3.5rem]">
                Together, We Can Make Healing Possible.
              </h1>

              <p className="max-w-xl text-base leading-relaxed text-[#71807A] sm:text-lg">
                Help patients and families access life-saving medical treatment,
                advanced oncology care, and critical surgical procedures through
                transparent, verified crowdfunding.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <VidaButton to={startFundraiserPath} variant="primary">
                  <span>Start a Fundraiser</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </VidaButton>
                <VidaButton
                  to="/campaigns"
                  variant="secondary"
                >
                  Explore Campaigns
                </VidaButton>
              </div>
            </motion.div>

            {/* Right Healthcare Visual Column */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex items-center justify-center lg:col-span-6"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute h-[86%] w-[86%] rounded-full blur-[90px]"
                style={{
                  background:
                    'radial-gradient(circle, rgba(22, 160, 133, 0.15) 0%, rgba(221, 243, 233, 0.4) 50%, rgba(247, 248, 245, 0) 75%)',
                }}
              />

              <div className="relative w-full max-w-[490px] overflow-hidden rounded-3xl border border-[#123C35]/15 bg-white shadow-[0_28px_80px_-24px_rgba(18,60,53,0.18)]">
                <SafeImage
                  src={HERO_SCULPTURE_IMAGE}
                  alt="Modern healthcare innovation and medical care"
                  fallbackTitle="VidaCare Medical Care"
                  className="aspect-square w-full object-cover"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#123C35]/60 via-transparent to-transparent opacity-80"
                />

                <div className="absolute inset-x-4 bottom-4 rounded-xl border border-white/20 bg-white/90 px-4 py-3 backdrop-blur-md shadow-sm">
                  <div className="flex items-center justify-between gap-4 text-xs">
                    <span className="font-semibold text-[#123C35]">
                      Direct Clinical Settlement
                    </span>
                    <span className="font-mono font-bold tabular-nums text-[#16A085]">
                      97.4% to Care
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* 2. Impact Statistics Strip */}
          <div className="mt-14 grid gap-6 border-y border-[#123C35]/10 py-8 sm:grid-cols-3">
            {impactStats.map((stat, idx) => (
              <div
                key={stat.label}
                className={`flex flex-col gap-1.5 ${
                  idx > 0 ? 'sm:border-l sm:border-[#123C35]/10 sm:pl-6' : ''
                }`}
              >
                <span className="text-xs font-semibold tracking-wide text-[#71807A] uppercase">
                  {stat.label}
                </span>
                <span
                  className={`font-mono text-2xl font-bold tabular-nums sm:text-3xl ${stat.accent}`}
                >
                  {stat.value}
                </span>
                <span className="text-xs text-[#71807A]">{stat.context}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Urgent Campaigns Section */}
      <section className="py-16 sm:py-20 bg-white/60">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <SectionHeading
              kicker="Urgent Medical Needs"
              title="Patients Counting on Timely Care"
              description="Every campaign below is clinically reviewed and actively raising funds for upcoming procedures and recovery milestones."
            />
            <Link
              to="/campaigns"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#16A085] transition-colors hover:text-[#123C35] whitespace-nowrap shrink-0"
            >
              <span>View all campaigns</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {urgentCampaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        </div>
      </section>

      {/* Medical Categories Discovery Section */}
      <MedicalCategoriesSection />

      {/* 4. How It Works Section */}
      <section
        id="how-it-works"
        className="scroll-mt-20 border-t border-[#123C35]/10 py-16 sm:py-20"
      >
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="How It Works"
            title="Three Clear Steps to Mobilize Care"
            description="Designed to remove complexity during stressful medical moments so families and supporters can focus on healing."
          />

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {HOW_IT_WORKS_STEPS.map((item) => {
              const Icon = item.icon;
              return (
                <GlassSurface
                  key={item.step}
                  className="flex flex-col gap-4 p-7 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-[#16A085]">
                      {item.step}
                    </span>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#DDF3E9] text-[#123C35]">
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                  </div>
                  <h3 className="font-display text-xl font-bold text-[#123C35]">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#71807A]">
                    {item.description}
                  </p>
                </GlassSurface>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. Why VidaCare Section */}
      <section className="border-t border-[#123C35]/10 py-16 sm:py-20 bg-white/60">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="Why VidaCare"
            title="Built Around Clinical Integrity and Human Dignity"
            description="Trust is the foundation of medical giving. Every safeguard on VidaCare is built to protect patients and donors alike."
          />

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {WHY_VIDACARE_ITEMS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <GlassSurface
                  key={pillar.title}
                  className="flex flex-col gap-4 p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#DDF3E9]">
                    <Icon className={`h-5 w-5 ${pillar.tint}`} aria-hidden="true" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-[#123C35]">
                    {pillar.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#71807A]">
                    {pillar.description}
                  </p>
                </GlassSurface>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. Final Call to Action */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <GlassSurface className="relative overflow-hidden p-8 sm:p-12 lg:p-14 bg-gradient-to-br from-[#123C35] to-[#16A085] text-white">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full blur-[90px]"
              style={{
                background:
                  'radial-gradient(circle, rgba(221, 243, 233, 0.25) 0%, rgba(22, 160, 133, 0.15) 50%, rgba(18, 60, 53, 0) 75%)',
              }}
            />

            <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold tracking-[0.14em] text-[#DDF3E9] uppercase">
                  Take Action Today
                </p>
                <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Your Support Can Change a Life
                </h2>
                <p className="mt-3 text-base leading-relaxed text-[#DDF3E9]/90">
                  Every contribution—large or modest—brings a patient closer to
                  essential surgery, recovery therapy, and peace of mind.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 shrink-0">
                <VidaButton to="/campaigns" variant="primary" className="bg-white text-[#123C35] hover:bg-[#DDF3E9]">
                  <span>Start Helping</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </VidaButton>
                <VidaButton to="/about" variant="secondary" className="border-white/30 text-white hover:bg-white/10">
                  Learn Our Standards
                </VidaButton>
              </div>
            </div>
          </GlassSurface>
        </div>
      </section>
    </div>
  );
};
