import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  FileCheck2,
  HeartHandshake,
  HelpCircle,
  Lock,
  Mail,
  Receipt,
  Search,
  ShieldCheck,
  Stethoscope,
  UserPlus,
  X,
} from 'lucide-react';
import {
  GlassSurface,
  SectionHeading,
  VidaButton,
} from '../components/ui/DesignPrimitives';

type FaqTopic =
  | 'Registration and Login'
  | 'Creating a Fundraiser'
  | 'Campaign Approval'
  | 'Making Donations'
  | 'Payment and Receipts'
  | 'Donation History'
  | 'Privacy and Support';

interface FaqEntry {
  id: string;
  topic: FaqTopic;
  question: string;
  answer: string;
}

const FAQ_TOPICS: Array<{
  topic: FaqTopic;
  summary: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    topic: 'Registration and Login',
    summary: 'Accounts, roles, OTP verification, and password resets.',
    icon: UserPlus,
  },
  {
    topic: 'Creating a Fundraiser',
    summary: 'Patient story, medical category selection, and target goals.',
    icon: Stethoscope,
  },
  {
    topic: 'Campaign Approval',
    summary: 'Clinical review workflow, pending status, and public visibility.',
    icon: FileCheck2,
  },
  {
    topic: 'Making Donations',
    summary: 'Quick donation tiers, custom amounts, and anonymous giving.',
    icon: HeartHandshake,
  },
  {
    topic: 'Payment and Receipts',
    summary: 'Simulated UPI/Card/Net Banking checkout and printable receipts.',
    icon: Receipt,
  },
  {
    topic: 'Donation History',
    summary: 'Tracking past contributions and downloading receipts.',
    icon: ShieldCheck,
  },
  {
    topic: 'Privacy and Support',
    summary: 'Donor anonymity, data handling, and contacting Care Liaison.',
    icon: Lock,
  },
];

const FAQ_ENTRIES: FaqEntry[] = [
  // 1. Registration and Login
  {
    id: 'reg-1',
    topic: 'Registration and Login',
    question: 'How do I create a VidaCare account?',
    answer:
      'Open the Signup page via Get Started, enter your full name, email address, mobile number, and password, then choose whether you are registering as a Patient/Fundraiser or a Donor. After submitting, complete the demo OTP verification step to activate your session.',
  },
  {
    id: 'reg-2',
    topic: 'Registration and Login',
    question: 'Can I sign in using either my email address or mobile number?',
    answer:
      'Yes. On the Login page you can enter your registered email address or 10-digit mobile number along with your password. You can also check Remember Me to prefill your identifier on future visits.',
  },
  {
    id: 'reg-3',
    topic: 'Registration and Login',
    question: 'What happens if I forget my account password?',
    answer:
      'Click Forgot Password on the Login screen to enter your registered email or mobile number, verify the demo OTP code, and set a new password directly in browser storage.',
  },
  {
    id: 'reg-4',
    topic: 'Registration and Login',
    question: 'Can one email address be registered twice?',
    answer:
      'No. VidaCare prevents duplicate email registrations so every donor history, fundraiser submission, and notification thread remains tied to a single unique account.',
  },

  // 2. Creating a Fundraiser
  {
    id: 'create-1',
    topic: 'Creating a Fundraiser',
    question: 'Who can start a medical fundraiser on VidaCare?',
    answer:
      'Registered users signed in to their Dashboard can launch a campaign on behalf of themselves, a child, a parent, or a close family member by clicking Create Fundraiser.',
  },
  {
    id: 'create-2',
    topic: 'Creating a Fundraiser',
    question: 'What medical categories are supported when creating a fundraiser?',
    answer:
      'You can select from active medical categories managed on the platform, including Cancer Treatment, Heart Surgery, Kidney Treatment, Organ Transplant, Accident & Emergency, and Other Medical Needs.',
  },
  {
    id: 'create-3',
    topic: 'Creating a Fundraiser',
    question: 'What information should I prepare before creating a campaign?',
    answer:
      'Prepare the patient name and age, diagnosed medical condition, accredited hospital name and city, target fundraising goal, a clear summary of the care need, and optional planned clinical treatment details.',
  },
  {
    id: 'create-4',
    topic: 'Creating a Fundraiser',
    question: 'Can I edit my campaign details or post updates after submission?',
    answer:
      'Yes. Inside My Campaigns on your User Dashboard you can edit active or pending fundraiser details (such as category, condition, hospital, goal, or summary) and publish progress updates once your campaign is approved.',
  },

  // 3. Campaign Approval
  {
    id: 'app-1',
    topic: 'Campaign Approval',
    question: 'Why does a newly created campaign start in Pending status?',
    answer:
      'To protect donor trust, every newly submitted fundraiser enters Pending status for administrative review. Only Approved campaigns appear publicly on the Home and Campaigns pages.',
  },
  {
    id: 'app-2',
    topic: 'Campaign Approval',
    question: 'How are medical campaigns reviewed before approval?',
    answer:
      'Reviewers inspect patient details, hospital facility information, treatment estimates, and attached medical document previews in the Admin console before approving or declining a campaign.',
  },
  {
    id: 'app-3',
    topic: 'Campaign Approval',
    question: 'What happens if a fundraiser is rejected during review?',
    answer:
      'If a campaign cannot be approved, a clear rejection reason is recorded and sent to the creator’s Notifications tab inside the User Dashboard explaining what documentation or clarification is needed.',
  },

  // 4. Making Donations
  {
    id: 'don-1',
    topic: 'Making Donations',
    question: 'How can I donate to a patient campaign?',
    answer:
      'Open any approved campaign from the Campaigns directory or Home page, click Donate Now, select a quick amount (₹500, ₹1,000, ₹2,000, or ₹5,000) or enter any positive custom amount, fill in your donor details, and confirm the payment.',
  },
  {
    id: 'don-2',
    topic: 'Making Donations',
    question: 'Can I donate anonymously without showing my name publicly?',
    answer:
      'Yes. Check the Donate Anonymously option on the Donation page before completing checkout. Your name will appear publicly as Anonymous Donor while your private receipt remains accessible in your Dashboard.',
  },
  {
    id: 'don-3',
    topic: 'Making Donations',
    question: 'Can I leave an encouraging message for the patient and family?',
    answer:
      'Yes. The Donation form includes an optional message field where you can share words of encouragement that appear alongside recent supporter activity on the campaign page.',
  },

  // 5. Payment and Receipts
  {
    id: 'pay-1',
    topic: 'Payment and Receipts',
    question: 'Which payment methods are supported on the Donation page?',
    answer:
      'The VidaCare Donation checkout supports simulated UPI, Debit/Credit Card, and Net Banking flows so you can preview the full contribution confirmation journey safely in your browser.',
  },
  {
    id: 'pay-2',
    topic: 'Payment and Receipts',
    question: 'Are real bank charges processed on this site?',
    answer:
      'No. VidaCare currently runs as a frontend demonstration environment using simulated payment confirmation and browser LocalStorage persistence—no real money or external bank card transactions occur.',
  },
  {
    id: 'pay-3',
    topic: 'Payment and Receipts',
    question: 'How do I view or print my donation receipt right after giving?',
    answer:
      'Once your simulated donation succeeds, the confirmation screen displays your unique transaction reference (VC-SIM-...) and a View Receipt button where you can review or print your contribution summary.',
  },

  // 6. Donation History
  {
    id: 'hist-1',
    topic: 'Donation History',
    question: 'Where can I track all my past donations and receipts?',
    answer:
      'Sign in with the email address you used when donating, open your User Dashboard, and select My Donations. Every contribution lists the campaign name, amount, date, payment method, status, and a Receipt button.',
  },
  {
    id: 'hist-2',
    topic: 'Donation History',
    question: 'Does my donation immediately update the campaign progress bar?',
    answer:
      'Yes. Completed contributions immediately increment the campaign’s raised amount and donor count across the Campaigns directory, Campaign Details page, and User Dashboard.',
  },

  // 7. Privacy and Support
  {
    id: 'priv-1',
    topic: 'Privacy and Support',
    question: 'How is my donor and patient information stored?',
    answer:
      'In this frontend preview, user profiles, campaigns, donations, and inquiries are stored locally in your browser’s LocalStorage under your control. Choosing anonymous giving hides your donor name from public campaign feeds.',
  },
  {
    id: 'priv-2',
    topic: 'Privacy and Support',
    question: 'How can I contact the VidaCare Care Liaison Desk for help?',
    answer:
      'Visit our Contact page to submit an inquiry directly to the support inbox, email support@vidacare.org, or call +1 (800) 555-0194. Messages submitted on the Contact page are logged for administrative review.',
  },
];

export const FaqPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<'All' | FaqTopic>('All');
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({
    'reg-1': true,
    'create-1': true,
  });

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return FAQ_ENTRIES.filter((entry) => {
      const matchesTopic = selectedTopic === 'All' || entry.topic === selectedTopic;
      const matchesSearch =
        !q ||
        entry.question.toLowerCase().includes(q) ||
        entry.answer.toLowerCase().includes(q) ||
        entry.topic.toLowerCase().includes(q);
      return matchesTopic && matchesSearch;
    });
  }, [searchQuery, selectedTopic]);

  const groupedSections = useMemo(() => {
    return FAQ_TOPICS.map((meta) => ({
      ...meta,
      items: filteredEntries.filter((entry) => entry.topic === meta.topic),
    })).filter((group) => group.items.length > 0);
  }, [filteredEntries]);

  const allVisibleExpanded =
    filteredEntries.length > 0 && filteredEntries.every((e) => openIds[e.id]);

  const toggleItem = (id: string) => {
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleToggleAllVisible = () => {
    const nextState = !allVisibleExpanded;
    setOpenIds((prev) => {
      const updated = { ...prev };
      filteredEntries.forEach((e) => {
        updated[e.id] = nextState;
      });
      return updated;
    });
  };

  const handleReset = () => {
    setSearchQuery('');
    setSelectedTopic('All');
  };

  return (
    <div className="flex flex-col">
      {/* Header & Search */}
      <section className="bg-[#F8FAF7] pt-12 pb-10 sm:pt-16 sm:pb-12">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 border-b border-[#123C35]/12 pb-10 md:flex-row md:items-end">
            <SectionHeading
              as="h1"
              kicker="Help Center & Guidelines"
              title="Frequently Asked Questions"
              description="Clear answers on registration, creating a verified medical fundraiser, making donations, tracking receipts, and reaching the VidaCare Care Liaison Desk."
            />
            <div className="flex items-center gap-5 text-xs text-[#414846] shrink-0">
              <div className="flex flex-col">
                <span className="font-medium text-[#414846]">Topics Covered</span>
                <span className="vc-numeric font-display text-lg font-bold text-[#123C35]">
                  {FAQ_TOPICS.length} Sections
                </span>
              </div>
              <div className="h-8 w-px bg-[#123C35]/15" aria-hidden="true" />
              <div className="flex flex-col">
                <span className="font-medium text-[#414846]">Answers Indexed</span>
                <span className="vc-numeric font-display text-lg font-bold text-[#159B79]">
                  {FAQ_ENTRIES.length} Guides
                </span>
              </div>
            </div>
          </div>

          {/* Search & Topic Filter Controls */}
          <GlassSurface className="mt-8 flex flex-col gap-5 p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#414846]"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search questions about login, fundraising, verification, UPI, receipts..."
                  aria-label="Search frequently asked questions"
                  className="vc-input pr-10 pl-10"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear FAQ search"
                    className="absolute top-1/2 right-2.5 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-[#414846] hover:bg-[#DDF3E9] hover:text-[#123C35]"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>

              {filteredEntries.length > 0 && (
                <button
                  type="button"
                  onClick={handleToggleAllVisible}
                  className="min-h-[44px] rounded-[10px] border border-[#123C35]/20 bg-[#F8FAF7] px-4 py-2 text-xs font-semibold text-[#123C35] whitespace-nowrap transition-colors hover:border-[#159B79] hover:bg-[#DDF3E9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#159B79]"
                >
                  {allVisibleExpanded ? 'Collapse All Answers' : 'Expand All Answers'}
                </button>
              )}
            </div>

            <div
              role="group"
              aria-label="Filter FAQs by topic"
              className="flex flex-wrap items-center gap-2 border-t border-[#123C35]/10 pt-4"
            >
              <button
                type="button"
                onClick={() => setSelectedTopic('All')}
                className={`min-h-[40px] rounded-[10px] px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#159B79] ${
                  selectedTopic === 'All'
                    ? 'bg-[#123C35] text-white shadow-sm'
                    : 'border border-[#123C35]/15 bg-[#F8FAF7] text-[#414846] hover:border-[#159B79]/50 hover:bg-[#DDF3E9] hover:text-[#123C35]'
                }`}
              >
                All Topics
              </button>
              {FAQ_TOPICS.map(({ topic }) => {
                const active = selectedTopic === topic;
                return (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => setSelectedTopic(topic)}
                    className={`min-h-[40px] rounded-[10px] px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#159B79] ${
                      active
                        ? 'bg-[#123C35] text-white shadow-sm'
                        : 'border border-[#123C35]/15 bg-[#F8FAF7] text-[#414846] hover:border-[#159B79]/50 hover:bg-[#DDF3E9] hover:text-[#123C35]'
                    }`}
                  >
                    {topic}
                  </button>
                );
              })}
            </div>
          </GlassSurface>
        </div>
      </section>

      {/* FAQ Accordion Sections */}
      <section className="bg-[#F8FAF7] pb-16">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          {groupedSections.length === 0 ? (
            <GlassSurface className="flex flex-col items-center gap-4 p-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#DDF3E9] text-[#159B79]">
                <HelpCircle className="h-6 w-6" aria-hidden="true" />
              </div>
              <h2 className="font-display text-2xl font-bold text-[#123C35]">
                No matching FAQ guides found
              </h2>
              <p className="max-w-md text-sm leading-relaxed text-[#414846]">
                Try another keyword or clear your topic filter. If your question
                isn’t listed, our Care Liaison Desk is ready to assist.
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#123C35] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#159B79] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#159B79]"
                >
                  Reset Search &amp; Filters
                </button>
                <VidaButton to="/contact" variant="secondary">
                  Contact Support
                </VidaButton>
              </div>
            </GlassSurface>
          ) : (
            <div className="flex flex-col gap-10">
              {groupedSections.map((group) => {
                const Icon = group.icon;
                return (
                  <div key={group.topic} className="flex flex-col gap-4">
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#159B79]/25 bg-[#DDF3E9] text-[#123C35]">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div>
                          <h2 className="font-display text-xl font-bold text-[#123C35] sm:text-2xl">
                            {group.topic}
                          </h2>
                          <p className="text-xs text-[#414846]">{group.summary}</p>
                        </div>
                      </div>
                      <span className="vc-numeric text-xs font-medium text-[#414846]">
                        {group.items.length}{' '}
                        {group.items.length === 1 ? 'question' : 'questions'}
                      </span>
                    </div>

                    <GlassSurface className="divide-y divide-[#123C35]/10 overflow-hidden">
                      {group.items.map((item) => {
                        const isOpen = !!openIds[item.id] || searchQuery.trim().length > 0;
                        const panelId = `faq-panel-${item.id}`;
                        return (
                          <div key={item.id}>
                            <button
                              type="button"
                              aria-expanded={isOpen}
                              aria-controls={panelId}
                              onClick={() => toggleItem(item.id)}
                              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-[#F8FAF7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#159B79] sm:px-6 sm:py-5"
                            >
                              <span className="text-sm font-semibold text-[#131E1C] sm:text-base">
                                {item.question}
                              </span>
                              <ChevronDown
                                className={`h-4 w-4 shrink-0 text-[#159B79] transition-transform duration-200 ${
                                  isOpen ? 'rotate-180' : ''
                                }`}
                                aria-hidden="true"
                              />
                            </button>
                            {isOpen && (
                              <div
                                id={panelId}
                                className="border-t border-[#123C35]/10 bg-[#F8FAF7] px-5 py-4 text-sm leading-relaxed text-[#414846] sm:px-6"
                              >
                                {item.answer}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </GlassSurface>
                  </div>
                );
              })}
            </div>
          )}

          {/* Contact Support CTA */}
          <GlassSurface className="mt-14 flex flex-col items-start justify-between gap-6 p-8 sm:flex-row sm:items-center sm:p-10">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#159B79]/25 bg-[#DDF3E9] text-[#159B79]">
                <Mail className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="max-w-xl">
                <p className="text-xs font-semibold tracking-[0.14em] text-[#159B79] uppercase">
                  Care Liaison Desk
                </p>
                <h2 className="mt-1 font-display text-2xl font-bold text-[#123C35]">
                  Still have questions about a campaign or donation?
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[#414846]">
                  Reach our dedicated Care Liaison team for help with hospital
                  verification, receipt lookups, or family fundraiser setup.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 shrink-0">
              <VidaButton to="/contact" variant="primary">
                Contact Support
              </VidaButton>
              <VidaButton to="/campaigns" variant="secondary">
                Explore Campaigns
              </VidaButton>
            </div>
          </GlassSurface>
        </div>
      </section>
    </div>
  );
};
