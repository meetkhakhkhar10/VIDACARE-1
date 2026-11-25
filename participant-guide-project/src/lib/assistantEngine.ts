import { CategoryItem, MedicalCampaign, UserSession } from '../types/campaign';
import { formatINR } from './format';
import { generateUniqueId } from './storage';

export interface AssistantLink {
  label: string;
  to: string;
}

export interface AssistantCampaignPreview {
  id: string;
  title: string;
  patientName: string;
  category: string;
  hospitalName: string;
  raisedAmount: number;
  goalAmount: number;
}

export interface AssistantMessage {
  id: string;
  sender: 'assistant' | 'user';
  text: string;
  timestamp: string;
  campaigns?: AssistantCampaignPreview[];
  links?: AssistantLink[];
  suggestions?: string[];
  isError?: boolean;
}

/**
 * Optional AI Backend Integration Placeholder
 * Future backend integration can replace the local FAQ/keyword responder
 * by calling a server-side endpoint (e.g. POST /api/assistant) and returning
 * structured AssistantReply data. Currently frontend-only.
 */
export interface FutureBackendAssistantConfig {
  endpointUrl?: string;
  enabled: boolean;
}

export const FUTURE_AI_INTEGRATION_CONFIG: FutureBackendAssistantConfig = {
  endpointUrl: '/api/assistant',
  enabled: false,
};

export async function queryFutureAssistantBackendPlaceholder(
  _query: string
): Promise<AssistantMessage | null> {
  if (!FUTURE_AI_INTEGRATION_CONFIG.enabled) {
    return null;
  }
  return null;
}

export const QUICK_QUESTIONS: string[] = [
  'How can I donate?',
  'How do I start a fundraiser?',
  'How are campaigns verified?',
  'Where can I track my donation?',
  'How can I contact support?',
];

export function createWelcomeMessage(categories: CategoryItem[]): AssistantMessage {
  const active = categories.filter((c) => c.isActive !== false);
  const categorySample = active
    .slice(0, 4)
    .map((c) => c.displayTitle || c.name)
    .join(', ');

  return {
    id: 'msg-welcome',
    sender: 'assistant',
    text: `Welcome to VidaCare. I am an automated platform helper (not a medical professional). Ask me about donating, starting a fundraiser, campaign verification, or exploring approved patient campaigns in ${categorySample || 'medical categories'}.`,
    timestamp: new Date().toISOString(),
    suggestions: QUICK_QUESTIONS,
    links: [
      { label: 'Campaigns', to: '/campaigns' },
      { label: 'Create Fundraiser', to: '/dashboard' },
      { label: 'FAQ', to: '/faq' },
      { label: 'Login', to: '/login' },
    ],
  };
}

function toPreview(c: MedicalCampaign): AssistantCampaignPreview {
  return {
    id: c.id,
    title: c.title,
    patientName: c.patientName,
    category: c.category,
    hospitalName: c.hospitalName,
    raisedAmount: c.raisedAmount,
    goalAmount: c.goalAmount,
  };
}

const MEDICAL_ADVICE_TERMS = [
  'symptom',
  'diagnose',
  'diagnosis',
  'medicine',
  'dosage',
  'prescription',
  'chest pain',
  'cure',
  'should i take',
  'medical advice',
  'doctor advice',
];

const CATEGORY_SYNONYMS: Array<{ categoryMatch: string; keywords: string[] }> = [
  {
    categoryMatch: 'cancer',
    keywords: ['cancer', 'oncology', 'tumor', 'chemo', 'immunotherapy', 'biologic'],
  },
  {
    categoryMatch: 'heart',
    keywords: ['heart', 'cardiac', 'valve', 'bypass', 'coronary', 'cardiology'],
  },
  {
    categoryMatch: 'kidney',
    keywords: ['kidney', 'renal', 'dialysis', 'hemodialysis', 'nephrology'],
  },
  {
    categoryMatch: 'transplant',
    keywords: ['transplant', 'liver', 'organ', 'living-donor'],
  },
  {
    categoryMatch: 'accident',
    keywords: ['accident', 'emergency', 'trauma', 'stroke', 'rehab', 'fracture', 'orthopedic'],
  },
  {
    categoryMatch: 'other',
    keywords: ['nicu', 'neonatal', 'microsurgery', 'cranial', 'respiratory', 'other'],
  },
];

export function generateAssistantReply(
  rawInput: string,
  context: {
    approvedCampaigns: MedicalCampaign[];
    categories: CategoryItem[];
    user: UserSession | null;
  }
): AssistantMessage {
  const trimmed = rawInput.trim();
  const q = trimmed.toLowerCase();
  const { approvedCampaigns, categories, user } = context;

  // 1. Guardrail: Medical advice disclaimer
  if (MEDICAL_ADVICE_TERMS.some((term) => q.includes(term)) && !q.includes('campaign')) {
    return {
      id: generateUniqueId('msg'),
      sender: 'assistant',
      text: 'I am an automated VidaCare platform helper—not a doctor or licensed medical professional—so I cannot offer medical advice, diagnoses, or treatment recommendations. Please consult a qualified physician or emergency services for clinical care. If you need help funding verified hospital treatment, I can guide you through starting or supporting a campaign.',
      timestamp: new Date().toISOString(),
      links: [
        { label: 'How It Works', to: '/#how-it-works' },
        { label: 'Create Fundraiser', to: '/dashboard' },
        { label: 'Contact Support', to: '/contact' },
      ],
      suggestions: ['How do I start a fundraiser?', 'How are campaigns verified?'],
    };
  }

  // 2. Quick Question: How can I donate?
  if (
    q.includes('how can i donate') ||
    q.includes('how to donate') ||
    q.includes('payment method') ||
    (q.includes('donate') && !q.includes('track') && !q.includes('receipt') && !q.includes('cancer') && !q.includes('heart') && !q.includes('kidney'))
  ) {
    const urgentApproved = approvedCampaigns
      .filter((c) => c.isUrgent || c.daysRemaining <= 10)
      .slice(0, 2);

    return {
      id: generateUniqueId('msg'),
      sender: 'assistant',
      text: 'Donating on VidaCare takes under a minute: browse any approved campaign, click "Donate Now", select ₹500, ₹1,000, ₹2,000, ₹5,000, or a custom amount, optionally mark your gift anonymous, and complete the simulated UPI, Debit/Credit Card, or Net Banking flow to receive a printable receipt.',
      timestamp: new Date().toISOString(),
      campaigns: urgentApproved.map(toPreview),
      links: [
        { label: 'Browse Campaigns', to: '/campaigns' },
        { label: 'Donate Now', to: '/donate' },
      ],
      suggestions: [
        'Where can I track my donation?',
        'How are campaigns verified?',
        'Show Heart Surgery campaigns',
      ],
    };
  }

  // 3. Quick Question: How do I start a fundraiser?
  if (
    q.includes('start a fundraiser') ||
    q.includes('create a fundraiser') ||
    q.includes('create campaign') ||
    q.includes('start campaign') ||
    q.includes('raise funds') ||
    q.includes('raise money')
  ) {
    return {
      id: generateUniqueId('msg'),
      sender: 'assistant',
      text: user
        ? `You are signed in as ${user.fullName}. Open your Dashboard and click "Create Fundraiser" to enter patient details, hospital name, medical category, and target goal. New submissions begin in Pending status until approved during review.`
        : 'To start a medical fundraiser, create an account as a Patient/Fundraiser (or sign in), open your Dashboard, and click "Create Fundraiser" to enter the patient story, hospital, and goal amount. Newly submitted campaigns remain Pending until approved.',
      timestamp: new Date().toISOString(),
      links: user
        ? [
            { label: 'Create Fundraiser in Dashboard', to: '/dashboard' },
            { label: 'View Campaigns', to: '/campaigns' },
          ]
        : [
            { label: 'Signup as Fundraiser', to: '/signup' },
            { label: 'Login', to: '/login' },
            { label: 'Create Fundraiser', to: '/dashboard' },
          ],
      suggestions: [
        'How are campaigns verified?',
        'How can I contact support?',
      ],
    };
  }

  // 4. Quick Question: How are campaigns verified?
  if (
    q.includes('verified') ||
    q.includes('verify') ||
    q.includes('verification') ||
    q.includes('legit') ||
    q.includes('trust') ||
    q.includes('approved')
  ) {
    return {
      id: generateUniqueId('msg'),
      sender: 'assistant',
      text: `Every fundraiser enters Pending status upon submission. During review, hospital billing estimates and diagnostic summaries are checked before a campaign is marked Approved. Only Approved campaigns (${approvedCampaigns.length} currently active) appear publicly in the VidaCare directory—Pending or Rejected campaigns remain private to their creator and reviewers.`,
      timestamp: new Date().toISOString(),
      links: [
        { label: 'Browse Approved Campaigns', to: '/campaigns' },
        { label: 'About VidaCare', to: '/about' },
      ],
      suggestions: [
        'How can I donate?',
        'How do I start a fundraiser?',
      ],
    };
  }

  // 5. Quick Question: Where can I track my donation?
  if (
    q.includes('track') ||
    q.includes('my donation') ||
    q.includes('receipt') ||
    q.includes('history')
  ) {
    return {
      id: generateUniqueId('msg'),
      sender: 'assistant',
      text: user
        ? `Open your Dashboard and select "My Donations" to see every contribution tied to ${user.email}, including date, payment status, transaction reference, and a printable receipt modal.`
        : 'Sign in with the email address you used when donating, then open your Dashboard and choose "My Donations" to inspect donation history, payment status, and printable receipts.',
      timestamp: new Date().toISOString(),
      links: user
        ? [{ label: 'Open My Donations', to: '/dashboard' }]
        : [
            { label: 'Login to Track Donations', to: '/login' },
            { label: 'Signup', to: '/signup' },
          ],
      suggestions: ['How can I donate?', 'How can I contact support?'],
    };
  }

  // 6. Quick Question: How can I contact support?
  if (
    q.includes('contact') ||
    q.includes('support') ||
    q.includes('help desk') ||
    q.includes('email') ||
    q.includes('phone')
  ) {
    return {
      id: generateUniqueId('msg'),
      sender: 'assistant',
      text: 'You can reach the VidaCare Care Liaison Desk at support@vidacare.org or +1 (800) 555-0194 (240 Beacon Clinical Way, Boston, MA), or submit an inquiry directly through our Contact page.',
      timestamp: new Date().toISOString(),
      links: [
        { label: 'Open Contact Page', to: '/contact' },
        { label: 'Read FAQ', to: '/faq' },
        { label: 'About VidaCare', to: '/about' },
      ],
      suggestions: [
        'How are campaigns verified?',
        'Where can I track my donation?',
      ],
    };
  }

  // 7. Category & Approved Campaign Discovery
  const matchedCategories = categories.filter((cat) => {
    const catLower = cat.name.toLowerCase();
    if (q.includes(catLower)) return true;
    const synonymEntry = CATEGORY_SYNONYMS.find((s) =>
      catLower.includes(s.categoryMatch)
    );
    return synonymEntry
      ? synonymEntry.keywords.some((kw) => q.includes(kw))
      : false;
  });

  if (matchedCategories.length > 0 || q.includes('categor') || q.includes('urgent')) {
    if (q.includes('categor') && matchedCategories.length === 0) {
      const catNames = categories.map((c) => c.name).join(', ');
      return {
        id: generateUniqueId('msg'),
        sender: 'assistant',
        text: `VidaCare currently organizes approved fundraisers across these medical categories: ${catNames}. Ask about any category—such as "Show Heart Surgery campaigns" or "Cancer campaigns"—to view active approved fundraisers.`,
        timestamp: new Date().toISOString(),
        links: [{ label: 'Explore All Campaigns', to: '/campaigns' }],
        suggestions: categories
          .slice(0, 4)
          .map((c) => `Show ${c.name} campaigns`),
      };
    }

    let matchedApproved: MedicalCampaign[] = [];
    if (q.includes('urgent') && matchedCategories.length === 0) {
      matchedApproved = approvedCampaigns.filter(
        (c) => c.isUrgent || c.daysRemaining <= 10
      );
    } else {
      const targetNames = new Set(
        matchedCategories.map((c) => c.name.toLowerCase())
      );
      matchedApproved = approvedCampaigns.filter((c) =>
        targetNames.has(c.category.toLowerCase())
      );
    }

    if (matchedApproved.length === 0) {
      const labelList = matchedCategories.map((c) => c.name).join(', ');
      return {
        id: generateUniqueId('msg'),
        sender: 'assistant',
        text: `There are currently no approved public campaigns under ${labelList || 'that filter'}. Pending or unapproved submissions are never shown publicly. You can browse all approved campaigns or start a new fundraiser.`,
        timestamp: new Date().toISOString(),
        links: [
          { label: 'Browse All Campaigns', to: '/campaigns' },
          { label: 'Create Fundraiser', to: '/dashboard' },
        ],
        suggestions: ['Show all medical categories', 'How can I donate?'],
      };
    }

    const topMatches = matchedApproved.slice(0, 3);
    const labelSummary =
      matchedCategories.length > 0
        ? matchedCategories.map((c) => c.name).join(' / ')
        : 'Urgent Care';

    return {
      id: generateUniqueId('msg'),
      sender: 'assistant',
      text: `Found ${matchedApproved.length} approved ${labelSummary} ${
        matchedApproved.length === 1 ? 'campaign' : 'campaigns'
      } currently open for support (${formatINR(
        topMatches[0].raisedAmount
      )} raised toward ${formatINR(topMatches[0].goalAmount)} on the top match):`,
      timestamp: new Date().toISOString(),
      campaigns: topMatches.map(toPreview),
      links: [{ label: 'View Full Directory', to: '/campaigns' }],
      suggestions: ['How can I donate?', 'Show all medical categories'],
    };
  }

  // 8. Direct Search across Approved Campaigns (patient name, title, condition, hospital, city)
  const searchTokens = q
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !['the', 'for', 'and', 'find', 'show', 'campaign', 'campaigns', 'patient', 'help'].includes(w));

  if (searchTokens.length > 0) {
    const directHits = approvedCampaigns.filter((c) => {
      const haystack = `${c.title} ${c.patientName} ${c.condition} ${c.hospitalName} ${c.location} ${c.category}`.toLowerCase();
      return searchTokens.some((tok) => haystack.includes(tok));
    });

    if (directHits.length > 0) {
      return {
        id: generateUniqueId('msg'),
        sender: 'assistant',
        text: `Here ${directHits.length === 1 ? 'is an approved campaign' : `are ${Math.min(3, directHits.length)} approved campaigns`} matching your query:`,
        timestamp: new Date().toISOString(),
        campaigns: directHits.slice(0, 3).map(toPreview),
        links: [{ label: 'Browse All Campaigns', to: '/campaigns' }],
        suggestions: ['How can I donate?', 'How are campaigns verified?'],
      };
    }
  }

  // 9. Portal Navigation Shortcuts (Login, Signup, Dashboard, Campaigns)
  if (
    q.includes('login') ||
    q.includes('sign in') ||
    q.includes('signup') ||
    q.includes('sign up') ||
    q.includes('register') ||
    q.includes('account') ||
    q.includes('dashboard')
  ) {
    return {
      id: generateUniqueId('msg'),
      sender: 'assistant',
      text: user
        ? `You are currently signed in as ${user.fullName} (${user.role}). You can jump straight to your Dashboard or browse active campaigns below.`
        : 'Use these direct VidaCare portal links to sign in, register a new Donor or Patient/Fundraiser account, or explore campaigns:',
      timestamp: new Date().toISOString(),
      links: [
        { label: 'Login', to: '/login' },
        { label: 'Signup', to: '/signup' },
        { label: 'Campaigns', to: '/campaigns' },
        { label: 'Create Fundraiser', to: '/dashboard' },
      ],
      suggestions: [
        'Where can I track my donation?',
        'How do I start a fundraiser?',
      ],
    };
  }

  // 10. Helpful Fallback State when no keyword matched
  return {
    id: generateUniqueId('msg'),
    sender: 'assistant',
    text: 'I could not match that to a specific VidaCare FAQ or approved campaign. As an automated helper, I can guide you on donating, starting a fundraiser, verification rules, tracking donations, or discovering approved campaigns by category (e.g., "Heart Surgery", "Cancer", "Kidney Treatment").',
    timestamp: new Date().toISOString(),
    links: [
      { label: 'Campaigns', to: '/campaigns' },
      { label: 'Create Fundraiser', to: '/dashboard' },
      { label: 'Login', to: '/login' },
      { label: 'Signup', to: '/signup' },
    ],
    suggestions: QUICK_QUESTIONS.slice(0, 4),
  };
}
