import {
  INITIAL_CAMPAIGNS,
  INITIAL_CATEGORIES,
  INITIAL_CONTACT_MESSAGES,
  INITIAL_DONATIONS,
  INITIAL_NOTIFICATIONS,
} from '../data/mockCampaigns';
import {
  AdminAuditEntry,
  CampaignUpdate,
  CategoryItem,
  ContactMessage,
  DashboardNotification,
  DonationRecord,
  MedicalCampaign,
  MedicalDocument,
  RegisteredAccount,
  UserSession,
  VidaCareStore,
} from '../types/campaign';

export const VIDACARE_STORE_KEY = 'vidacare_store_v1';
export const VIDACARE_ASSISTANT_KEY = 'vidacare_assistant_history_v1';
export const VIDACARE_RESET_EVENT = 'vidacare:store-reset';
export const CURRENT_SCHEMA_VERSION = 2;

export const DEMO_ACCOUNTS: RegisteredAccount[] = [
  {
    id: 'acc-demo-admin',
    fullName: 'Dr. Claire Sterling',
    email: 'admin@vidacare.org',
    phone: '+91 98765 00001',
    location: 'Boston, MA',
    avatarUrl: '/src/assets/images/campaign_oncology_support_1795448744973.jpg',
    password: 'VidaAdmin@2026',
    role: 'Admin',
    blocked: false,
    createdAt: '2026-09-01',
  },
  {
    id: 'acc-demo-donor',
    fullName: 'Dr. Samuel Vance',
    email: 'donor@vidacare.org',
    phone: '+91 98765 00112',
    location: 'Boston, MA',
    avatarUrl: '/src/assets/images/campaign_surgical_mission_1795448745169.jpg',
    password: 'CareDonor@2026',
    role: 'Donor',
    blocked: false,
    createdAt: '2026-10-01',
  },
  {
    id: 'acc-demo-patient',
    fullName: 'Elena Alvarez',
    email: 'elena@vidacare.org',
    phone: '+91 98765 00224',
    location: 'Boston, MA',
    avatarUrl: '/src/assets/images/campaign_cardiac_care_1795448745364.jpg',
    password: 'MayaCare@2026',
    role: 'Patient/Fundraiser',
    blocked: false,
    createdAt: '2026-10-18',
  },
  {
    id: 'acc-demo-miriam',
    fullName: 'Miriam Foster',
    email: 'miriam.f@example.org',
    phone: '+91 98765 00315',
    location: 'Seattle, WA',
    avatarUrl: '/src/assets/images/campaign_neuro_rehab_1795448745124.jpg',
    password: 'CareMember@2026',
    role: 'Donor',
    blocked: false,
    createdAt: '2026-10-25',
  },
  {
    id: 'acc-demo-carlos',
    fullName: 'Carlos Mendez',
    email: 'carlos.mendez@example.org',
    phone: '+91 98765 00419',
    location: 'Cleveland, OH',
    avatarUrl: '/src/assets/images/campaign_surgical_mission_1795448745169.jpg',
    password: 'CareMember@2026',
    role: 'Patient/Fundraiser',
    blocked: false,
    createdAt: '2026-11-05',
  },
  {
    id: 'acc-demo-kieran',
    fullName: 'Kieran Brooks',
    email: 'kieran.b@example.org',
    phone: '+91 98765 00522',
    location: 'Chicago, IL',
    avatarUrl: '/src/assets/images/campaign_cardiac_care_1795448745364.jpg',
    password: 'CareMember@2026',
    role: 'Donor',
    blocked: false,
    createdAt: '2026-11-12',
  },
];

let idSequence = 0;

/**
 * Generates collision-resistant IDs even across rapid same-millisecond actions.
 */
export function generateUniqueId(prefix: string): string {
  idSequence = (idSequence + 1) % 100000;
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  const rand = Math.random().toString(36).slice(2, 6);
  return `${prefix}-${Date.now()}-${idSequence}-${rand}`;
}

export function getCategoryFallbackImage(category: string): string {
  const categoryImageMap: Record<string, string> = {
    Cancer: '/src/assets/images/campaign_oncology_support_1795448744973.jpg',
    'Heart Surgery': '/src/assets/images/campaign_cardiac_care_1795448745364.jpg',
    'Kidney Treatment': '/src/assets/images/campaign_neuro_rehab_1795448745124.jpg',
    'Organ Transplant': '/src/assets/images/campaign_surgical_mission_1795448745169.jpg',
    'Accident & Emergency': '/src/assets/images/campaign_neuro_rehab_1795448745124.jpg',
    Other: '/src/assets/images/campaign_cardiac_care_1795448745364.jpg',
  };
  return (
    categoryImageMap[category] ||
    '/src/assets/images/campaign_cardiac_care_1795448745364.jpg'
  );
}

export function isTransientMediaUrl(url?: string): boolean {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  return trimmed.startsWith('blob:') || trimmed.startsWith('data:');
}

export function sanitizeDocumentsForPersistence(
  docs?: MedicalDocument[]
): MedicalDocument[] {
  if (!Array.isArray(docs)) return [];
  return docs.map((doc) => {
    const hadTransientPreview = isTransientMediaUrl(doc.previewUrl);
    return {
      ...doc,
      previewUrl: hadTransientPreview ? undefined : doc.previewUrl,
      isTemporaryPreview:
        doc.isTemporaryPreview ?? (hadTransientPreview ? true : undefined),
    };
  });
}

export function sanitizeCampaignForPersistence(
  campaign: MedicalCampaign
): MedicalCampaign {
  return {
    ...campaign,
    imageUrl:
      campaign.imageUrl && !isTransientMediaUrl(campaign.imageUrl)
        ? campaign.imageUrl
        : getCategoryFallbackImage(campaign.category),
    documents: sanitizeDocumentsForPersistence(campaign.documents),
  };
}

export function safeParseJSON<T>(raw: string | null): {
  ok: boolean;
  value: T | null;
  error?: string;
} {
  if (raw === null || raw.trim() === '') {
    return { ok: true, value: null };
  }
  try {
    const parsed = JSON.parse(raw) as T;
    return { ok: true, value: parsed };
  } catch (err) {
    return {
      ok: false,
      value: null,
      error: err instanceof Error ? err.message : 'Corrupted LocalStorage JSON payload.',
    };
  }
}

export function safeStorageGet(key: string): {
  ok: boolean;
  raw: string | null;
  error?: string;
} {
  if (typeof window === 'undefined') {
    return { ok: true, raw: null };
  }
  try {
    return { ok: true, raw: window.localStorage.getItem(key) };
  } catch (err) {
    return {
      ok: false,
      raw: null,
      error:
        err instanceof Error
          ? err.message
          : 'Browser LocalStorage read access is unavailable.',
    };
  }
}

export function safeStorageSet(
  key: string,
  value: string
): { ok: boolean; error?: string } {
  if (typeof window === 'undefined') {
    return { ok: true };
  }
  try {
    window.localStorage.setItem(key, value);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? `Could not save to LocalStorage: ${err.message}`
          : 'Browser LocalStorage quota exceeded or write access disabled.',
    };
  }
}

export function normalizeCampaignUpdates(
  updates: unknown,
  fallbackUpdates: CampaignUpdate[] = []
): CampaignUpdate[] {
  const source = Array.isArray(updates) ? updates : fallbackUpdates;
  const seen = new Set<string>();
  const normalized: CampaignUpdate[] = [];

  for (const item of source) {
    if (!item || typeof item !== 'object') continue;
    const raw = item as Partial<CampaignUpdate>;
    const id =
      typeof raw.id === 'string' && raw.id.trim()
        ? raw.id.trim()
        : generateUniqueId('upd');
    if (seen.has(id)) continue;
    seen.add(id);

    normalized.push({
      id,
      date:
        typeof raw.date === 'string' && raw.date.trim()
          ? raw.date
          : new Date().toLocaleDateString('en-US', {
              month: 'short',
              day: '2-digit',
              year: 'numeric',
            }),
      title: typeof raw.title === 'string' ? raw.title.trim() : 'Campaign Update',
      summary: typeof raw.summary === 'string' ? raw.summary.trim() : '',
      author: typeof raw.author === 'string' && raw.author.trim() ? raw.author : 'Organizer',
    });
  }

  return normalized;
}

export function normalizeCampaigns(
  stored: unknown,
  backfillMissingSeeds: boolean
): MedicalCampaign[] {
  if (!Array.isArray(stored)) {
    return INITIAL_CAMPAIGNS.map((c) => ({ ...c, updates: [...c.updates] }));
  }

  const initialMap = new Map(INITIAL_CAMPAIGNS.map((c) => [c.id, c]));
  const seen = new Set<string>();
  const normalized: MedicalCampaign[] = [];

  for (const entry of stored) {
    if (!entry || typeof entry !== 'object') continue;
    const item = entry as Partial<MedicalCampaign>;
    if (typeof item.id !== 'string' || !item.id.trim() || seen.has(item.id)) continue;
    seen.add(item.id);

    const template = initialMap.get(item.id);
    const category =
      typeof item.category === 'string' && item.category.trim()
        ? item.category.trim()
        : template?.category || 'Other';

    const goalAmount =
      typeof item.goalAmount === 'number' && Number.isFinite(item.goalAmount) && item.goalAmount > 0
        ? Math.round(item.goalAmount)
        : template?.goalAmount ?? 10000;

    const raisedAmount =
      typeof item.raisedAmount === 'number' && Number.isFinite(item.raisedAmount) && item.raisedAmount >= 0
        ? Math.round(item.raisedAmount)
        : template?.raisedAmount ?? 0;

    const donorCount =
      typeof item.donorCount === 'number' && Number.isFinite(item.donorCount) && item.donorCount >= 0
        ? Math.round(item.donorCount)
        : template?.donorCount ?? 0;

    const daysRemaining =
      typeof item.daysRemaining === 'number' && Number.isFinite(item.daysRemaining)
        ? Math.max(0, Math.round(item.daysRemaining))
        : template?.daysRemaining ?? 30;

    const summary =
      typeof item.summary === 'string' && item.summary.trim()
        ? item.summary.trim()
        : template?.summary || '';

    const story =
      Array.isArray(item.story) && item.story.length > 0
        ? item.story.filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
        : template?.story ?? (summary ? [summary] : []);

    normalized.push({
      ...template,
      ...item,
      id: item.id,
      slug:
        typeof item.slug === 'string' && item.slug.trim()
          ? item.slug
          : template?.slug || item.id,
      creatorId: item.creatorId ?? template?.creatorId,
      creatorEmail: item.creatorEmail ?? template?.creatorEmail,
      title: typeof item.title === 'string' && item.title.trim() ? item.title : template?.title || 'Medical Fundraiser',
      patientName:
        typeof item.patientName === 'string' && item.patientName.trim()
          ? item.patientName
          : template?.patientName || 'Patient',
      ageLabel: item.ageLabel || template?.ageLabel || 'Patient',
      category,
      condition: item.condition || template?.condition || category,
      hospitalName: item.hospitalName || template?.hospitalName || 'Medical Center',
      location: item.location || template?.location || 'United States',
      treatingDoctor: item.treatingDoctor ?? template?.treatingDoctor,
      organizerName: item.organizerName || template?.organizerName || 'Family Coordinator',
      organizerRelation: item.organizerRelation || template?.organizerRelation || 'Coordinator',
      summary,
      story,
      treatmentDetails:
        item.treatmentDetails || template?.treatmentDetails || summary,
      imageUrl:
        typeof item.imageUrl === 'string' &&
        item.imageUrl.trim() &&
        !isTransientMediaUrl(item.imageUrl)
          ? item.imageUrl
          : template?.imageUrl || getCategoryFallbackImage(category),
      goalAmount,
      raisedAmount,
      donorCount,
      daysRemaining,
      verifiedBy: item.verifiedBy || template?.verifiedBy || 'VidaCare Clinical Review',
      hospitalVerified:
        typeof item.hospitalVerified === 'boolean'
          ? item.hospitalVerified
          : template?.hospitalVerified ??
            (item.status === 'approved' || (!item.status && template?.status === 'approved')),
      eligible80G:
        typeof item.eligible80G === 'boolean'
          ? item.eligible80G
          : template?.eligible80G ??
            (item.status === 'approved' || (!item.status && template?.status === 'approved')),
      settlementPreference:
        item.settlementPreference ?? template?.settlementPreference ?? 'Direct Hospital Billing',
      status:
        item.status === 'approved' || item.status === 'pending' || item.status === 'rejected'
          ? item.status
          : template?.status ?? 'approved',
      rejectionReason: item.rejectionReason ?? template?.rejectionReason,
      featured: Boolean(item.featured ?? template?.featured ?? false),
      isUrgent: item.isUrgent ?? template?.isUrgent ?? daysRemaining <= 10,
      createdAt: item.createdAt || template?.createdAt || new Date().toISOString().slice(0, 10),
      updates: normalizeCampaignUpdates(item.updates, template?.updates),
      documents:
        Array.isArray(item.documents) && item.documents.length > 0
          ? sanitizeDocumentsForPersistence(item.documents)
          : template?.documents ?? [],
    });
  }

  if (backfillMissingSeeds) {
    for (const seed of INITIAL_CAMPAIGNS) {
      if (!seen.has(seed.id)) {
        normalized.push({ ...seed, updates: [...seed.updates] });
      }
    }
  }

  return normalized;
}

export function normalizeDonations(
  stored: unknown,
  backfillMissingSeeds: boolean
): DonationRecord[] {
  if (!Array.isArray(stored)) {
    return [...INITIAL_DONATIONS];
  }

  const initialMap = new Map(INITIAL_DONATIONS.map((d) => [d.id, d]));
  const seenIds = new Set<string>();
  const seenRefs = new Set<string>();
  const normalized: DonationRecord[] = [];

  for (const entry of stored) {
    if (!entry || typeof entry !== 'object') continue;
    const d = entry as Partial<DonationRecord>;
    if (typeof d.id !== 'string' || !d.id.trim() || seenIds.has(d.id)) continue;
    if (d.transactionRef && seenRefs.has(d.transactionRef)) continue;

    seenIds.add(d.id);
    if (d.transactionRef) seenRefs.add(d.transactionRef);

    const template = initialMap.get(d.id);
    const amount =
      typeof d.amount === 'number' && Number.isFinite(d.amount) && d.amount > 0
        ? Math.round(d.amount)
        : template?.amount ?? 0;
    if (amount <= 0) continue;

    const isAnonymous = Boolean(d.isAnonymous ?? template?.isAnonymous ?? false);

    normalized.push({
      ...template,
      ...d,
      id: d.id,
      campaignId: d.campaignId || template?.campaignId || '',
      campaignTitle: d.campaignTitle || template?.campaignTitle || 'Medical Campaign',
      donorId: d.donorId ?? template?.donorId,
      donorName: isAnonymous
        ? 'Anonymous Donor'
        : d.donorName || template?.donorName || 'Compassionate Supporter',
      donorEmail: d.donorEmail ?? template?.donorEmail,
      isAnonymous,
      amount,
      platformTipAmount:
        typeof d.platformTipAmount === 'number' && Number.isFinite(d.platformTipAmount) && d.platformTipAmount >= 0
          ? Math.round(d.platformTipAmount)
          : template?.platformTipAmount ?? 0,
      wants80GReceipt: Boolean(d.wants80GReceipt ?? template?.wants80GReceipt ?? false),
      panNumber: typeof d.panNumber === 'string' ? d.panNumber.trim().toUpperCase() : template?.panNumber,
      paymentMethod: d.paymentMethod || template?.paymentMethod || 'UPI',
      paymentStatus: d.paymentStatus ?? template?.paymentStatus ?? 'Completed',
      timestamp: d.timestamp || template?.timestamp || new Date().toISOString(),
    });
  }

  if (backfillMissingSeeds) {
    for (const seed of INITIAL_DONATIONS) {
      if (!seenIds.has(seed.id)) {
        normalized.push({ ...seed });
      }
    }
  }

  return normalized;
}

export function normalizeAccounts(stored: unknown): RegisteredAccount[] {
  if (!Array.isArray(stored)) {
    return DEMO_ACCOUNTS.map((a) => ({ ...a }));
  }

  const demoMap = new Map(DEMO_ACCOUNTS.map((d) => [d.id, d]));
  const seenIds = new Set<string>();
  const seenEmails = new Set<string>();
  const normalized: RegisteredAccount[] = [];

  for (const entry of stored) {
    if (!entry || typeof entry !== 'object') continue;
    const a = entry as Partial<RegisteredAccount>;
    if (typeof a.id !== 'string' || typeof a.email !== 'string' || !a.email.trim()) {
      continue;
    }
    const lowerEmail = a.email.trim().toLowerCase();
    if (seenIds.has(a.id) || seenEmails.has(lowerEmail)) continue;

    seenIds.add(a.id);
    seenEmails.add(lowerEmail);
    const template = demoMap.get(a.id);

    normalized.push({
      ...template,
      ...a,
      id: a.id,
      fullName: a.fullName || template?.fullName || 'VidaCare Member',
      email: lowerEmail,
      phone: a.phone || template?.phone || '',
      password: a.password || template?.password || 'VidaCare@2026',
      role:
        a.role === 'Admin' || a.role === 'Donor' || a.role === 'Patient/Fundraiser'
          ? a.role
          : template?.role ?? 'Donor',
      location: a.location ?? template?.location ?? '',
      avatarUrl: a.avatarUrl ?? template?.avatarUrl ?? '',
      blocked: Boolean(a.blocked ?? false),
      createdAt: a.createdAt || template?.createdAt || new Date().toISOString().slice(0, 10),
    });
  }

  // Always guarantee core demo accounts remain available for demo testing
  for (const demo of DEMO_ACCOUNTS) {
    if (!seenEmails.has(demo.email.toLowerCase())) {
      normalized.push({ ...demo });
    }
  }

  return normalized;
}

export function normalizeNotifications(
  stored: unknown,
  backfillMissingSeeds: boolean
): DashboardNotification[] {
  if (!Array.isArray(stored)) {
    return [...INITIAL_NOTIFICATIONS];
  }

  const seen = new Set<string>();
  const normalized: DashboardNotification[] = [];

  for (const entry of stored) {
    if (!entry || typeof entry !== 'object') continue;
    const n = entry as Partial<DashboardNotification>;
    if (typeof n.id !== 'string' || !n.id.trim() || seen.has(n.id)) continue;
    if (typeof n.userId !== 'string' || !n.userId.trim()) continue;
    seen.add(n.id);

    normalized.push({
      id: n.id,
      userId: n.userId,
      type:
        n.type === 'approval' ||
        n.type === 'rejection' ||
        n.type === 'donation' ||
        n.type === 'info'
          ? n.type
          : 'info',
      title: n.title || 'Notification',
      message: n.message || '',
      campaignId: n.campaignId,
      createdAt: n.createdAt || new Date().toISOString(),
      read: Boolean(n.read),
    });
  }

  if (backfillMissingSeeds) {
    for (const seed of INITIAL_NOTIFICATIONS) {
      if (!seen.has(seed.id)) {
        normalized.push({ ...seed });
      }
    }
  }

  return normalized;
}

export function normalizeCategories(stored: unknown): CategoryItem[] {
  if (!Array.isArray(stored) || stored.length === 0) {
    return INITIAL_CATEGORIES.map((c) => ({ ...c }));
  }

  const initialMap = new Map(INITIAL_CATEGORIES.map((c) => [c.id, c]));
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const normalized: CategoryItem[] = [];

  for (const entry of stored) {
    if (!entry || typeof entry !== 'object') continue;
    const c = entry as Partial<CategoryItem>;
    if (typeof c.id !== 'string' || typeof c.name !== 'string' || !c.name.trim()) {
      continue;
    }
    const lowerName = c.name.trim().toLowerCase();
    if (seenIds.has(c.id) || seenNames.has(lowerName)) continue;

    seenIds.add(c.id);
    seenNames.add(lowerName);
    const tpl = initialMap.get(c.id);

    normalized.push({
      ...tpl,
      ...c,
      id: c.id,
      name: c.name.trim(),
      displayTitle: c.displayTitle?.trim() || tpl?.displayTitle || c.name.trim(),
      iconKey: c.iconKey ?? tpl?.iconKey ?? 'other',
      description:
        c.description?.trim() ||
        tpl?.description ||
        'Specialized medical care fundraisers.',
      isActive: c.isActive ?? true,
      createdAt: c.createdAt || tpl?.createdAt || new Date().toISOString().slice(0, 10),
    });
  }

  return normalized.length > 0
    ? normalized
    : INITIAL_CATEGORIES.map((c) => ({ ...c }));
}

export function normalizeContactMessages(
  stored: unknown,
  backfillMissingSeeds: boolean
): ContactMessage[] {
  if (!Array.isArray(stored)) {
    return [...INITIAL_CONTACT_MESSAGES];
  }

  const seen = new Set<string>();
  const normalized: ContactMessage[] = [];

  for (const entry of stored) {
    if (!entry || typeof entry !== 'object') continue;
    const m = entry as Partial<ContactMessage>;
    if (typeof m.id !== 'string' || !m.id.trim() || seen.has(m.id)) continue;
    seen.add(m.id);

    normalized.push({
      id: m.id,
      name: m.name || 'Visitor',
      email: m.email || '',
      subject: m.subject || 'Care Liaison Inquiry',
      message: m.message || '',
      createdAt: m.createdAt || new Date().toISOString(),
      status:
        m.status === 'unread' || m.status === 'read' || m.status === 'resolved'
          ? m.status
          : 'unread',
    });
  }

  if (backfillMissingSeeds) {
    for (const seed of INITIAL_CONTACT_MESSAGES) {
      if (!seen.has(seed.id)) {
        normalized.push({ ...seed });
      }
    }
  }

  return normalized;
}

export function normalizeUserSession(
  rawUser: unknown,
  accounts: RegisteredAccount[]
): UserSession | null {
  if (!rawUser || typeof rawUser !== 'object') return null;
  const candidate = rawUser as Partial<UserSession>;
  if (typeof candidate.id !== 'string' || typeof candidate.email !== 'string') {
    return null;
  }

  const matchingAccount = accounts.find(
    (acc) =>
      acc.id === candidate.id ||
      acc.email.toLowerCase() === candidate.email!.toLowerCase()
  );

  // If the stored session's account was blocked, clear active session cleanly
  if (matchingAccount?.blocked) {
    return null;
  }

  if (matchingAccount) {
    return {
      id: matchingAccount.id,
      fullName: matchingAccount.fullName,
      email: matchingAccount.email,
      phone: matchingAccount.phone,
      location: matchingAccount.location,
      avatarUrl: matchingAccount.avatarUrl,
      role: matchingAccount.role,
      joinedAt: candidate.joinedAt || matchingAccount.createdAt,
    };
  }

  return {
    id: candidate.id,
    fullName: candidate.fullName || 'VidaCare Member',
    email: candidate.email,
    phone: candidate.phone,
    location: candidate.location,
    avatarUrl: candidate.avatarUrl,
    role: candidate.role || 'Donor',
    joinedAt: candidate.joinedAt || new Date().toISOString().slice(0, 10),
  };
}

export function createDefaultStore(): VidaCareStore {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    campaigns: INITIAL_CAMPAIGNS.map((c) => ({ ...c, updates: [...c.updates] })),
    donations: INITIAL_DONATIONS.map((d) => ({ ...d })),
    savedCampaignIds: ['vc-101'],
    user: null,
    accounts: DEMO_ACCOUNTS.map((a) => ({ ...a })),
    notifications: INITIAL_NOTIFICATIONS.map((n) => ({ ...n })),
    categories: INITIAL_CATEGORIES.map((c) => ({ ...c })),
    contactMessages: INITIAL_CONTACT_MESSAGES.map((m) => ({ ...m })),
    auditLogs: [],
    rememberedIdentifier: '',
  };
}

export function normalizeStorePayload(rawParsed: unknown): VidaCareStore {
  if (!rawParsed || typeof rawParsed !== 'object') {
    return createDefaultStore();
  }

  const parsed = rawParsed as Partial<VidaCareStore>;
  const isLegacySchema =
    typeof parsed.schemaVersion !== 'number' ||
    parsed.schemaVersion < CURRENT_SCHEMA_VERSION;

  const accounts = normalizeAccounts(parsed.accounts);
  const campaigns =
    Array.isArray(parsed.campaigns) && parsed.campaigns.length > 0
      ? normalizeCampaigns(parsed.campaigns, isLegacySchema)
      : isLegacySchema
      ? createDefaultStore().campaigns
      : normalizeCampaigns(parsed.campaigns, false);

  const campaignIds = new Set(campaigns.map((c) => c.id));
  const savedCampaignIds = Array.isArray(parsed.savedCampaignIds)
    ? Array.from(
        new Set(
          parsed.savedCampaignIds.filter(
            (id): id is string => typeof id === 'string' && campaignIds.has(id)
          )
        )
      )
    : [];

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    campaigns,
    donations: normalizeDonations(parsed.donations, isLegacySchema),
    savedCampaignIds,
    user: normalizeUserSession(parsed.user, accounts),
    accounts,
    notifications: normalizeNotifications(parsed.notifications, isLegacySchema),
    categories: normalizeCategories(parsed.categories),
    contactMessages: normalizeContactMessages(parsed.contactMessages, isLegacySchema),
    auditLogs: Array.isArray(parsed.auditLogs)
      ? (parsed.auditLogs as AdminAuditEntry[]).slice(0, 100)
      : [],
    rememberedIdentifier:
      typeof parsed.rememberedIdentifier === 'string'
        ? parsed.rememberedIdentifier
        : '',
  };
}

export function readVidaCareStore(): {
  store: VidaCareStore;
  error?: string;
} {
  const readResult = safeStorageGet(VIDACARE_STORE_KEY);
  if (!readResult.ok) {
    return {
      store: createDefaultStore(),
      error: readResult.error,
    };
  }

  if (!readResult.raw) {
    const seed = createDefaultStore();
    const writeResult = safeStorageSet(VIDACARE_STORE_KEY, JSON.stringify(seed));
    return {
      store: seed,
      error: writeResult.ok ? undefined : writeResult.error,
    };
  }

  const parsedResult = safeParseJSON<unknown>(readResult.raw);
  if (!parsedResult.ok || !parsedResult.value) {
    const fallback = createDefaultStore();
    safeStorageSet(VIDACARE_STORE_KEY, JSON.stringify(fallback));
    return {
      store: fallback,
      error:
        'Saved LocalStorage data was unreadable and has been safely restored to demo defaults.',
    };
  }

  return {
    store: normalizeStorePayload(parsedResult.value),
  };
}

export function writeVidaCareStore(store: VidaCareStore): {
  ok: boolean;
  error?: string;
} {
  const payload: VidaCareStore = {
    ...store,
    campaigns: store.campaigns.map(sanitizeCampaignForPersistence),
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
  return safeStorageSet(VIDACARE_STORE_KEY, JSON.stringify(payload));
}

export function resetVidaCareStore(): {
  store: VidaCareStore;
  ok: boolean;
  error?: string;
} {
  const fresh = createDefaultStore();
  const writeResult = writeVidaCareStore(fresh);
  clearStoredAssistantHistory();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(VIDACARE_RESET_EVENT));
  }
  return {
    store: fresh,
    ok: writeResult.ok,
    error: writeResult.error,
  };
}

/**
 * Assistant chat history LocalStorage utilities
 */
export function readStoredAssistantHistory<T>(fallback: T[]): T[] {
  const res = safeStorageGet(VIDACARE_ASSISTANT_KEY);
  if (!res.ok || !res.raw) return fallback;
  const parsed = safeParseJSON<T[]>(res.raw);
  if (parsed.ok && Array.isArray(parsed.value) && parsed.value.length > 0) {
    return parsed.value;
  }
  return fallback;
}

export function writeStoredAssistantHistory<T>(messages: T[]): void {
  safeStorageSet(VIDACARE_ASSISTANT_KEY, JSON.stringify(messages.slice(-40)));
}

export function clearStoredAssistantHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(VIDACARE_ASSISTANT_KEY);
  } catch {
    // Ignore storage removal errors
  }
}

/**
 * Convenience entity-level collection helpers backed by the unified store
 */
export function getStoredUsers(): RegisteredAccount[] {
  return readVidaCareStore().store.accounts;
}

export function getStoredCampaigns(): MedicalCampaign[] {
  return readVidaCareStore().store.campaigns;
}

export function getStoredDonations(): DonationRecord[] {
  return readVidaCareStore().store.donations;
}

export function getStoredCategories(): CategoryItem[] {
  return readVidaCareStore().store.categories;
}

export function getStoredContactMessages(): ContactMessage[] {
  return readVidaCareStore().store.contactMessages;
}

export function getStoredNotifications(): DashboardNotification[] {
  return readVidaCareStore().store.notifications;
}

export function getStoredCampaignUpdates(campaignId: string): CampaignUpdate[] {
  const match = getStoredCampaigns().find((c) => c.id === campaignId);
  return match ? match.updates : [];
}
