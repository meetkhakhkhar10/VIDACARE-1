import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  DEMO_ACCOUNTS,
  VIDACARE_STORE_KEY,
  generateUniqueId,
  getCategoryFallbackImage,
  normalizeStorePayload,
  readVidaCareStore,
  resetVidaCareStore,
  safeParseJSON,
  writeVidaCareStore,
} from '../lib/storage';
import {
  CategoryItem,
  ContactMessage,
  DashboardNotification,
  DonationRecord,
  MedicalCampaign,
  MedicalCategory,
  MedicalDocument,
  PaymentMethodType,
  RegisteredAccount,
  UserRole,
  UserSession,
  VidaCareStore,
} from '../types/campaign';

export { DEMO_ACCOUNTS };

interface RecordDonationInput {
  campaignId: string;
  donorName: string;
  donorEmail?: string;
  donorPhone?: string;
  isAnonymous: boolean;
  amount: number;
  paymentMethod?: PaymentMethodType;
  transactionRef?: string;
  message?: string;
}

interface RegisterAccountInput {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: 'Donor' | 'Patient/Fundraiser';
}

interface UpdateProfileInput {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  avatarUrl?: string;
}

interface CreateCampaignInput {
  title: string;
  patientName: string;
  ageLabel: string;
  condition: string;
  category: MedicalCategory;
  hospitalName: string;
  location: string;
  goalAmount: number;
  summary: string;
  treatmentDetails: string;
  imageUrl?: string;
  documents?: MedicalDocument[];
}

interface EditCampaignInput {
  id: string;
  title: string;
  category?: MedicalCategory;
  condition: string;
  hospitalName: string;
  location: string;
  goalAmount: number;
  summary: string;
}

interface AuthResult {
  ok: boolean;
  error?: string;
  user?: UserSession;
}

interface VidaCareContextValue {
  campaigns: MedicalCampaign[];
  approvedCampaigns: MedicalCampaign[];
  donations: DonationRecord[];
  savedCampaignIds: string[];
  user: UserSession | null;
  accounts: RegisteredAccount[];
  notifications: DashboardNotification[];
  categories: CategoryItem[];
  activeCategories: CategoryItem[];
  contactMessages: ContactMessage[];
  rememberedIdentifier: string;
  totalRaisedPlatform: number;
  totalDonorsPlatform: number;
  storageError: string | null;
  clearStorageError: () => void;
  toggleSavedCampaign: (campaignId: string) => void;
  getCampaignById: (id: string) => MedicalCampaign | undefined;
  recordDonation: (input: RecordDonationInput) => DonationRecord | null;
  isEmailRegistered: (email: string) => boolean;
  findAccountByIdentifier: (identifier: string) => RegisteredAccount | undefined;
  registerAccount: (input: RegisterAccountInput) => AuthResult;
  authenticateMock: (
    identifier: string,
    password: string,
    rememberMe: boolean
  ) => AuthResult;
  updateAccountPasswordMock: (
    identifier: string,
    newPassword: string
  ) => { ok: boolean; error?: string };
  updateUserProfile: (input: UpdateProfileInput) => { ok: boolean; error?: string };
  changeCurrentUserPassword: (
    currentPassword: string,
    newPassword: string
  ) => { ok: boolean; error?: string };
  createUserCampaign: (input: CreateCampaignInput) => MedicalCampaign | null;
  updateUserCampaign: (input: EditCampaignInput) => { ok: boolean; error?: string };
  postCampaignUpdate: (
    campaignId: string,
    title: string,
    summary: string
  ) => { ok: boolean; error?: string };
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
  approveCampaign: (
    campaignId: string,
    verifiedByNote?: string
  ) => { ok: boolean; error?: string };
  rejectCampaign: (
    campaignId: string,
    reason: string
  ) => { ok: boolean; error?: string };
  removeCampaign: (campaignId: string) => { ok: boolean; error?: string };
  toggleBlockAccount: (
    accountId: string,
    reason?: string
  ) => { ok: boolean; error?: string };
  addCategory: (
    name: string,
    description: string,
    displayTitle?: string
  ) => { ok: boolean; error?: string };
  updateCategory: (
    id: string,
    name: string,
    description: string,
    displayTitle?: string
  ) => { ok: boolean; error?: string };
  toggleCategoryActive: (id: string) => { ok: boolean; error?: string };
  deleteCategory: (id: string) => { ok: boolean; error?: string };
  submitContactMessage: (input: {
    name: string;
    email: string;
    subject?: string;
    message: string;
  }) => ContactMessage;
  markContactMessageStatus: (
    id: string,
    status: ContactMessage['status']
  ) => void;
  deleteContactMessage: (id: string) => void;
  getDashboardPathForRole: (role?: UserRole) => string;
  signInMock: (email: string, fullName?: string, roleOverride?: UserRole) => void;
  signOutMock: () => void;
  resetDemoStore: () => void;
}

const VidaCareContext = createContext<VidaCareContextValue | undefined>(undefined);

function normalizePhoneDigits(phone: string): string {
  return phone.replace(/[\s\-()+]/g, '');
}

export function VidaCareProvider({ children }: { children: React.ReactNode }) {
  const initialReadRef = useRef<{ store: VidaCareStore; error?: string } | null>(
    null
  );
  if (!initialReadRef.current) {
    initialReadRef.current = readVidaCareStore();
  }

  const [store, setStore] = useState<VidaCareStore>(initialReadRef.current.store);
  const [storageError, setStorageError] = useState<string | null>(
    initialReadRef.current.error ?? null
  );

  const skipNextPersistRef = useRef(false);
  const lastDonationGuardRef = useRef<{
    fingerprint: string;
    txRef: string;
    ts: number;
  } | null>(null);
  const lastCampaignGuardRef = useRef<{
    fingerprint: string;
    ts: number;
  } | null>(null);
  const lastContactGuardRef = useRef<{
    fingerprint: string;
    record: ContactMessage;
    ts: number;
  } | null>(null);
  const sessionBlobUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    const writeRes = writeVidaCareStore(store);
    if (!writeRes.ok && writeRes.error) {
      setStorageError(writeRes.error);
    }
  }, [store]);

  // Synchronize shared LocalStorage updates across open browser tabs
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorageSync = (e: StorageEvent) => {
      if (e.key !== VIDACARE_STORE_KEY) return;
      if (!e.newValue) {
        const { store: fresh } = readVidaCareStore();
        skipNextPersistRef.current = true;
        setStore(fresh);
        return;
      }
      const parsed = safeParseJSON<unknown>(e.newValue);
      if (parsed.ok && parsed.value) {
        skipNextPersistRef.current = true;
        setStore(normalizeStorePayload(parsed.value));
      }
    };

    window.addEventListener('storage', handleStorageSync);
    return () => window.removeEventListener('storage', handleStorageSync);
  }, []);

  const clearStorageError = () => setStorageError(null);

  const approvedCampaigns = useMemo(
    () => store.campaigns.filter((c) => c.status === 'approved'),
    [store.campaigns]
  );

  const toggleSavedCampaign = (campaignId: string) => {
    setStore((prev) => {
      const exists = prev.savedCampaignIds.includes(campaignId);
      return {
        ...prev,
        savedCampaignIds: exists
          ? prev.savedCampaignIds.filter((id) => id !== campaignId)
          : [...prev.savedCampaignIds, campaignId],
      };
    });
  };

  const getCampaignById = (id: string) =>
    store.campaigns.find((item) => item.id === id || item.slug === id);

  const recordDonation = (input: RecordDonationInput): DonationRecord | null => {
    const target = store.campaigns.find(
      (c) => c.id === input.campaignId && c.status === 'approved'
    );
    const roundedAmount = Math.round(input.amount);
    if (!target || !Number.isFinite(roundedAmount) || roundedAmount <= 0) {
      return null;
    }

    const txRef =
      input.transactionRef?.trim() ||
      `VC-SIM-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const normalizedEmail = (
      input.donorEmail?.trim() ||
      store.user?.email ||
      ''
    ).toLowerCase();
    const normalizedName = input.donorName.trim().toLowerCase();
    const fingerprint = `${target.id}|${roundedAmount}|${normalizedEmail || normalizedName}`;
    const now = Date.now();

    // Prevent duplicate donation submissions caused by repeated clicks or duplicate txRef
    if (store.donations.some((d) => d.transactionRef && d.transactionRef === txRef)) {
      return null;
    }
    if (
      lastDonationGuardRef.current &&
      (lastDonationGuardRef.current.txRef === txRef ||
        (lastDonationGuardRef.current.fingerprint === fingerprint &&
          now - lastDonationGuardRef.current.ts < 5000))
    ) {
      return null;
    }
    lastDonationGuardRef.current = { fingerprint, txRef, ts: now };

    const matchedAccount = normalizedEmail
      ? store.accounts.find((a) => a.email.toLowerCase() === normalizedEmail)
      : undefined;

    const donorId = matchedAccount?.id ?? store.user?.id;
    const timestamp = new Date().toISOString();

    const newDonation: DonationRecord = {
      id: generateUniqueId('don'),
      campaignId: target.id,
      campaignTitle: target.title,
      donorId,
      donorName: input.isAnonymous
        ? 'Anonymous Donor'
        : input.donorName.trim() || 'Compassionate Supporter',
      donorEmail: input.donorEmail?.trim() || store.user?.email || undefined,
      donorPhone: input.donorPhone?.trim() || undefined,
      isAnonymous: input.isAnonymous,
      amount: roundedAmount,
      paymentMethod: input.paymentMethod,
      paymentStatus: 'Completed',
      transactionRef: txRef,
      message: input.message?.trim() || undefined,
      timestamp,
    };

    const newNotifications: DashboardNotification[] = [];
    if (donorId) {
      newNotifications.push({
        id: generateUniqueId('notif-don'),
        userId: donorId,
        type: 'donation',
        title: `Donation Receipt Ready (${txRef})`,
        message: `Your ₹${newDonation.amount.toLocaleString('en-IN')} contribution to ${target.title} was recorded.`,
        campaignId: target.id,
        createdAt: timestamp,
        read: false,
      });
    }
    if (target.creatorId && target.creatorId !== donorId) {
      newNotifications.push({
        id: generateUniqueId('notif-cr'),
        userId: target.creatorId,
        type: 'donation',
        title: `New ₹${newDonation.amount.toLocaleString('en-IN')} Contribution Received`,
        message: `${newDonation.isAnonymous ? 'An anonymous donor' : newDonation.donorName} supported ${target.title}.`,
        campaignId: target.id,
        createdAt: timestamp,
        read: false,
      });
    }

    setStore((prev) => {
      if (
        prev.donations.some(
          (d) =>
            d.id === newDonation.id ||
            (d.transactionRef && d.transactionRef === txRef)
        )
      ) {
        return prev;
      }
      return {
        ...prev,
        campaigns: prev.campaigns.map((c) =>
          c.id === target.id
            ? {
                ...c,
                raisedAmount: c.raisedAmount + newDonation.amount,
                donorCount: c.donorCount + 1,
              }
            : c
        ),
        donations: [newDonation, ...prev.donations],
        notifications: [...newNotifications, ...prev.notifications],
      };
    });

    return newDonation;
  };

  const isEmailRegistered = (email: string): boolean => {
    const target = email.trim().toLowerCase();
    return store.accounts.some((acc) => acc.email.toLowerCase() === target);
  };

  const findAccountByIdentifier = (
    identifier: string
  ): RegisteredAccount | undefined => {
    const trimmed = identifier.trim();
    const lower = trimmed.toLowerCase();
    const digits = normalizePhoneDigits(trimmed);

    return store.accounts.find((acc) => {
      if (acc.email.toLowerCase() === lower) return true;
      if (digits.length >= 10) {
        const accDigits = normalizePhoneDigits(acc.phone);
        return (
          accDigits === digits ||
          accDigits.slice(-10) === digits.slice(-10)
        );
      }
      return false;
    });
  };

  const registerAccount = (input: RegisterAccountInput): AuthResult => {
    const cleanEmail = input.email.trim().toLowerCase();
    if (isEmailRegistered(cleanEmail)) {
      return {
        ok: false,
        error: 'An account with this email address is already registered.',
      };
    }

    const newAccount: RegisteredAccount = {
      id: generateUniqueId('acc'),
      fullName: input.fullName.trim(),
      email: cleanEmail,
      phone: input.phone.trim(),
      location: '',
      avatarUrl: '',
      password: input.password,
      role: input.role,
      blocked: false,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    const session: UserSession = {
      id: newAccount.id,
      fullName: newAccount.fullName,
      email: newAccount.email,
      phone: newAccount.phone,
      location: '',
      avatarUrl: '',
      role: newAccount.role,
      joinedAt: newAccount.createdAt,
    };

    const welcomeNotification: DashboardNotification = {
      id: generateUniqueId('notif-welcome'),
      userId: newAccount.id,
      type: 'info',
      title: 'Welcome to VidaCare',
      message: `Your ${newAccount.role} account is ready. Complete your profile or explore verified medical campaigns.`,
      createdAt: new Date().toISOString(),
      read: false,
    };

    setStore((prev) => {
      if (prev.accounts.some((acc) => acc.email.toLowerCase() === cleanEmail)) {
        return prev;
      }
      return {
        ...prev,
        accounts: [newAccount, ...prev.accounts],
        user: session,
        notifications: [welcomeNotification, ...prev.notifications],
        rememberedIdentifier: newAccount.email,
      };
    });

    return { ok: true, user: session };
  };

  const authenticateMock = (
    identifier: string,
    password: string,
    rememberMe: boolean
  ): AuthResult => {
    const account = findAccountByIdentifier(identifier);
    if (!account) {
      return {
        ok: false,
        error: 'No demo account matched that email or mobile number.',
      };
    }
    if (account.blocked) {
      return {
        ok: false,
        error:
          'This demo account is currently blocked by an administrator. Contact support or try another demo profile.',
      };
    }
    if (account.password !== password) {
      return {
        ok: false,
        error: 'Incorrect password. Please check your credentials or reset it.',
      };
    }

    const session: UserSession = {
      id: account.id,
      fullName: account.fullName,
      email: account.email,
      phone: account.phone,
      location: account.location ?? '',
      avatarUrl: account.avatarUrl ?? '',
      role: account.role,
      joinedAt: account.createdAt,
    };

    setStore((prev) => ({
      ...prev,
      user: session,
      rememberedIdentifier: rememberMe ? identifier.trim() : '',
    }));

    return { ok: true, user: session };
  };

  const updateAccountPasswordMock = (
    identifier: string,
    newPassword: string
  ): { ok: boolean; error?: string } => {
    const account = findAccountByIdentifier(identifier);
    if (!account) {
      return { ok: false, error: 'Account could not be located.' };
    }

    setStore((prev) => ({
      ...prev,
      accounts: prev.accounts.map((acc) =>
        acc.id === account.id ? { ...acc, password: newPassword } : acc
      ),
    }));

    return { ok: true };
  };

  const updateUserProfile = (
    input: UpdateProfileInput
  ): { ok: boolean; error?: string } => {
    if (!store.user) {
      return { ok: false, error: 'You must be signed in to update your profile.' };
    }
    const cleanEmail = input.email.trim().toLowerCase();
    const conflict = store.accounts.find(
      (a) => a.email.toLowerCase() === cleanEmail && a.id !== store.user!.id
    );
    if (conflict) {
      return { ok: false, error: 'That email is already used by another account.' };
    }

    const updatedSession: UserSession = {
      ...store.user,
      fullName: input.fullName.trim(),
      email: cleanEmail,
      phone: input.phone.trim(),
      location: input.location.trim(),
      avatarUrl: input.avatarUrl ?? store.user.avatarUrl,
    };

    setStore((prev) => ({
      ...prev,
      user: updatedSession,
      accounts: prev.accounts.map((acc) =>
        acc.id === updatedSession.id
          ? {
              ...acc,
              fullName: updatedSession.fullName,
              email: updatedSession.email,
              phone: updatedSession.phone ?? acc.phone,
              location: updatedSession.location,
              avatarUrl: updatedSession.avatarUrl,
            }
          : acc
      ),
      campaigns: prev.campaigns.map((c) =>
        c.creatorId === updatedSession.id
          ? {
              ...c,
              creatorEmail: updatedSession.email,
              organizerName: updatedSession.fullName,
            }
          : c
      ),
      donations: prev.donations.map((d) =>
        d.donorId === updatedSession.id
          ? {
              ...d,
              donorEmail: updatedSession.email,
              donorName: d.isAnonymous ? 'Anonymous Donor' : updatedSession.fullName,
            }
          : d
      ),
    }));

    return { ok: true };
  };

  const changeCurrentUserPassword = (
    currentPassword: string,
    newPassword: string
  ): { ok: boolean; error?: string } => {
    if (!store.user) {
      return { ok: false, error: 'Not signed in.' };
    }
    const account = store.accounts.find((a) => a.id === store.user!.id);
    if (!account) {
      return { ok: false, error: 'Account record not found.' };
    }
    if (account.password !== currentPassword) {
      return { ok: false, error: 'Current password is incorrect.' };
    }

    setStore((prev) => ({
      ...prev,
      accounts: prev.accounts.map((acc) =>
        acc.id === account.id ? { ...acc, password: newPassword } : acc
      ),
    }));

    return { ok: true };
  };

  const createUserCampaign = (
    input: CreateCampaignInput
  ): MedicalCampaign | null => {
    if (!store.user) return null;

    const cleanTitle = input.title.trim();
    const cleanPatient = input.patientName.trim();
    const titleLower = cleanTitle.toLowerCase();
    const patientLower = cleanPatient.toLowerCase();
    const fingerprint = `${store.user.id}|${titleLower}|${patientLower}`;
    const now = Date.now();

    // Prevent duplicate campaign records from repeated clicks or identical active submissions
    const duplicateExists = store.campaigns.some(
      (c) =>
        (c.creatorId === store.user!.id ||
          c.creatorEmail?.toLowerCase() === store.user!.email.toLowerCase()) &&
        c.status !== 'rejected' &&
        c.title.trim().toLowerCase() === titleLower
    );
    if (duplicateExists) {
      return null;
    }
    if (
      lastCampaignGuardRef.current &&
      lastCampaignGuardRef.current.fingerprint === fingerprint &&
      now - lastCampaignGuardRef.current.ts < 8000
    ) {
      return null;
    }
    lastCampaignGuardRef.current = { fingerprint, ts: now };

    const slugBase = cleanTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const id = generateUniqueId('vc-usr');

    const resolvedImageUrl =
      input.imageUrl?.trim() || getCategoryFallbackImage(input.category);
    if (resolvedImageUrl.startsWith('blob:')) {
      sessionBlobUrlsRef.current.add(resolvedImageUrl);
    }
    const attachedDocs = (input.documents ?? []).map((doc) => {
      if (doc.previewUrl?.startsWith('blob:')) {
        sessionBlobUrlsRef.current.add(doc.previewUrl);
      }
      return { ...doc };
    });

    const created: MedicalCampaign = {
      id,
      slug: `${slugBase || 'campaign'}-${id.slice(-4)}`,
      creatorId: store.user.id,
      creatorEmail: store.user.email,
      title: cleanTitle,
      patientName: cleanPatient,
      ageLabel: input.ageLabel.trim() || 'Patient',
      condition: input.condition.trim(),
      category: input.category,
      hospitalName: input.hospitalName.trim(),
      location: input.location.trim(),
      organizerName: store.user.fullName,
      organizerRelation: 'Family / Coordinator',
      summary: input.summary.trim(),
      treatmentDetails: input.treatmentDetails.trim() || input.summary.trim(),
      story: [input.summary.trim()],
      imageUrl: resolvedImageUrl,
      goalAmount: Math.round(input.goalAmount),
      raisedAmount: 0,
      donorCount: 0,
      daysRemaining: 30,
      verifiedBy: 'Pending Hospital Verification',
      status: 'pending',
      featured: false,
      isUrgent: false,
      createdAt: new Date().toISOString().slice(0, 10),
      updates: [],
      documents: attachedDocs,
    };

    const notif: DashboardNotification = {
      id: generateUniqueId('notif-new'),
      userId: store.user.id,
      type: 'info',
      title: `Fundraiser Submitted: ${created.title}`,
      message:
        'Your campaign is currently Pending clinical verification before appearing in public listings.',
      campaignId: created.id,
      createdAt: new Date().toISOString(),
      read: false,
    };

    setStore((prev) => {
      if (
        prev.campaigns.some(
          (c) =>
            c.id === created.id ||
            ((c.creatorId === created.creatorId ||
              c.creatorEmail?.toLowerCase() === created.creatorEmail?.toLowerCase()) &&
              c.status !== 'rejected' &&
              c.title.trim().toLowerCase() === titleLower)
        )
      ) {
        return prev;
      }
      return {
        ...prev,
        campaigns: [created, ...prev.campaigns],
        notifications: [notif, ...prev.notifications],
      };
    });

    return created;
  };

  const updateUserCampaign = (
    input: EditCampaignInput
  ): { ok: boolean; error?: string } => {
    if (!store.user) {
      return { ok: false, error: 'Sign in required.' };
    }
    const target = store.campaigns.find((c) => c.id === input.id);
    if (!target) {
      return { ok: false, error: 'Campaign not found.' };
    }
    const owns =
      target.creatorId === store.user.id ||
      target.creatorEmail?.toLowerCase() === store.user.email.toLowerCase();
    if (!owns) {
      return { ok: false, error: 'You can only edit your own campaigns.' };
    }
    if (target.status === 'rejected') {
      return {
        ok: false,
        error: 'Rejected campaigns cannot be edited directly.',
      };
    }

    const cleanTitle = input.title.trim();
    const cleanSummary = input.summary.trim();

    setStore((prev) => ({
      ...prev,
      campaigns: prev.campaigns.map((c) => {
        if (c.id !== input.id) return c;
        const nextStory =
          !c.story || c.story.length === 0
            ? [cleanSummary]
            : c.story.length === 1 || c.story[0] === c.summary
            ? [cleanSummary, ...c.story.slice(1)]
            : [cleanSummary, ...c.story];
        return {
          ...c,
          title: cleanTitle,
          category: input.category?.trim() || c.category,
          condition: input.condition.trim(),
          hospitalName: input.hospitalName.trim(),
          location: input.location.trim(),
          goalAmount: Math.round(input.goalAmount),
          summary: cleanSummary,
          treatmentDetails:
            c.treatmentDetails === c.summary ? cleanSummary : c.treatmentDetails,
          story: nextStory,
        };
      }),
      donations: prev.donations.map((d) =>
        d.campaignId === input.id ? { ...d, campaignTitle: cleanTitle } : d
      ),
    }));

    return { ok: true };
  };

  const postCampaignUpdate = (
    campaignId: string,
    title: string,
    summary: string
  ): { ok: boolean; error?: string } => {
    if (!store.user) {
      return { ok: false, error: 'Sign in required.' };
    }
    const target = store.campaigns.find((c) => c.id === campaignId);
    if (!target) {
      return { ok: false, error: 'Campaign not found.' };
    }
    const owns =
      target.creatorId === store.user.id ||
      target.creatorEmail?.toLowerCase() === store.user.email.toLowerCase();
    if (!owns) {
      return { ok: false, error: 'You can only post updates for your own campaigns.' };
    }
    if (target.status !== 'approved') {
      return {
        ok: false,
        error: 'Updates can only be posted on approved campaigns.',
      };
    }

    const cleanTitle = title.trim();
    const cleanSummary = summary.trim();
    const latest = target.updates[0];
    if (
      latest &&
      latest.title.trim().toLowerCase() === cleanTitle.toLowerCase() &&
      latest.summary.trim().toLowerCase() === cleanSummary.toLowerCase()
    ) {
      return {
        ok: false,
        error: 'This exact clinical update was already published.',
      };
    }

    const formattedDate = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });

    const newUpdate = {
      id: generateUniqueId('upd'),
      date: formattedDate,
      title: cleanTitle,
      summary: cleanSummary,
      author: store.user.fullName,
    };

    setStore((prev) => ({
      ...prev,
      campaigns: prev.campaigns.map((c) =>
        c.id === campaignId
          ? { ...c, updates: [newUpdate, ...c.updates] }
          : c
      ),
    }));

    return { ok: true };
  };

  const markNotificationRead = (notificationId: string) => {
    setStore((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      ),
    }));
  };

  const markAllNotificationsRead = () => {
    if (!store.user) return;
    setStore((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.userId === store.user!.id ? { ...n, read: true } : n
      ),
    }));
  };

  const approveCampaign = (
    campaignId: string,
    verifiedByNote?: string
  ): { ok: boolean; error?: string } => {
    if (store.user?.role !== 'Admin') {
      return { ok: false, error: 'Admin access required.' };
    }
    const target = store.campaigns.find((c) => c.id === campaignId);
    if (!target) {
      return { ok: false, error: 'Campaign not found.' };
    }

    const notif: DashboardNotification | null = target.creatorId
      ? {
          id: generateUniqueId('notif-app'),
          userId: target.creatorId,
          type: 'approval',
          title: `Campaign Approved: ${target.title}`,
          message:
            'Your campaign passed administrative review and is now live in public listings.',
          campaignId: target.id,
          createdAt: new Date().toISOString(),
          read: false,
        }
      : null;

    setStore((prev) => ({
      ...prev,
      campaigns: prev.campaigns.map((c) =>
        c.id === campaignId
          ? {
              ...c,
              status: 'approved',
              rejectionReason: undefined,
              verifiedBy:
                verifiedByNote?.trim() ||
                (c.verifiedBy.includes('Pending') ||
                c.verifiedBy.includes('Incomplete')
                  ? 'VidaCare Clinical Review Desk'
                  : c.verifiedBy),
              documents: c.documents?.map((d) => ({ ...d, verified: true })),
            }
          : c
      ),
      notifications: notif ? [notif, ...prev.notifications] : prev.notifications,
    }));

    return { ok: true };
  };

  const rejectCampaign = (
    campaignId: string,
    reason: string
  ): { ok: boolean; error?: string } => {
    if (store.user?.role !== 'Admin') {
      return { ok: false, error: 'Admin access required.' };
    }
    const cleanReason = reason.trim();
    if (!cleanReason) {
      return { ok: false, error: 'Please provide a rejection reason.' };
    }
    const target = store.campaigns.find((c) => c.id === campaignId);
    if (!target) {
      return { ok: false, error: 'Campaign not found.' };
    }

    const notif: DashboardNotification | null = target.creatorId
      ? {
          id: generateUniqueId('notif-rej'),
          userId: target.creatorId,
          type: 'rejection',
          title: `Campaign Rejected: ${target.title}`,
          message: `Review note: ${cleanReason}`,
          campaignId: target.id,
          createdAt: new Date().toISOString(),
          read: false,
        }
      : null;

    setStore((prev) => ({
      ...prev,
      campaigns: prev.campaigns.map((c) =>
        c.id === campaignId
          ? {
              ...c,
              status: 'rejected',
              rejectionReason: cleanReason,
              verifiedBy: 'Declined in Admin Review',
            }
          : c
      ),
      notifications: notif ? [notif, ...prev.notifications] : prev.notifications,
    }));

    return { ok: true };
  };

  const removeCampaign = (
    campaignId: string
  ): { ok: boolean; error?: string } => {
    if (store.user?.role !== 'Admin') {
      return { ok: false, error: 'Admin access required.' };
    }
    const target = store.campaigns.find((c) => c.id === campaignId);
    if (!target) {
      return { ok: false, error: 'Campaign not found.' };
    }

    const notif: DashboardNotification | null = target.creatorId
      ? {
          id: generateUniqueId('notif-rem'),
          userId: target.creatorId,
          type: 'rejection',
          title: `Campaign Removed: ${target.title}`,
          message:
            'This campaign was removed during an administrative compliance audit.',
          createdAt: new Date().toISOString(),
          read: false,
        }
      : null;

    setStore((prev) => ({
      ...prev,
      campaigns: prev.campaigns.filter((c) => c.id !== campaignId),
      savedCampaignIds: prev.savedCampaignIds.filter((id) => id !== campaignId),
      notifications: notif ? [notif, ...prev.notifications] : prev.notifications,
    }));

    return { ok: true };
  };

  const toggleBlockAccount = (
    accountId: string,
    reason?: string
  ): { ok: boolean; error?: string } => {
    if (store.user?.role !== 'Admin') {
      return { ok: false, error: 'Admin access required.' };
    }
    const target = store.accounts.find((a) => a.id === accountId);
    if (!target) {
      return { ok: false, error: 'Account not found.' };
    }
    if (target.id === store.user.id || target.role === 'Admin') {
      return { ok: false, error: 'Administrator accounts cannot be blocked.' };
    }
    const nextBlocked = !target.blocked;

    setStore((prev) => ({
      ...prev,
      accounts: prev.accounts.map((a) =>
        a.id === accountId
          ? {
              ...a,
              blocked: nextBlocked,
              blockedReason: nextBlocked
                ? reason?.trim() || 'Suspended during demo moderation review'
                : undefined,
            }
          : a
      ),
    }));

    return { ok: true };
  };

  const addCategory = (
    name: string,
    description: string,
    displayTitle?: string
  ): { ok: boolean; error?: string } => {
    if (store.user?.role !== 'Admin') {
      return { ok: false, error: 'Admin access required.' };
    }
    const cleanName = name.trim();
    if (!cleanName) {
      return { ok: false, error: 'Category name is required.' };
    }
    const exists = store.categories.some(
      (c) => c.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (exists) {
      return { ok: false, error: 'A category with this name already exists.' };
    }
    const item: CategoryItem = {
      id: generateUniqueId('cat'),
      name: cleanName,
      displayTitle: displayTitle?.trim() || cleanName,
      iconKey: 'other',
      description: description.trim() || 'Specialized medical care fundraisers.',
      isActive: true,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setStore((prev) => ({
      ...prev,
      categories: [...prev.categories, item],
    }));
    return { ok: true };
  };

  const updateCategory = (
    id: string,
    name: string,
    description: string,
    displayTitle?: string
  ): { ok: boolean; error?: string } => {
    if (store.user?.role !== 'Admin') {
      return { ok: false, error: 'Admin access required.' };
    }
    const target = store.categories.find((c) => c.id === id);
    if (!target) {
      return { ok: false, error: 'Category not found.' };
    }
    const cleanName = name.trim();
    if (!cleanName) {
      return { ok: false, error: 'Category name cannot be empty.' };
    }
    const conflict = store.categories.some(
      (c) => c.id !== id && c.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (conflict) {
      return { ok: false, error: 'Another category already uses that name.' };
    }

    setStore((prev) => ({
      ...prev,
      categories: prev.categories.map((c) =>
        c.id === id
          ? {
              ...c,
              name: cleanName,
              displayTitle: displayTitle?.trim() || cleanName,
              description: description.trim() || c.description,
            }
          : c
      ),
      campaigns: prev.campaigns.map((camp) =>
        camp.category === target.name ? { ...camp, category: cleanName } : camp
      ),
    }));
    return { ok: true };
  };

  const toggleCategoryActive = (id: string): { ok: boolean; error?: string } => {
    if (store.user?.role !== 'Admin') {
      return { ok: false, error: 'Admin access required.' };
    }
    const target = store.categories.find((c) => c.id === id);
    if (!target) {
      return { ok: false, error: 'Category not found.' };
    }
    const activeCount = store.categories.filter((c) => c.isActive !== false).length;
    if (target.isActive !== false && activeCount <= 1) {
      return {
        ok: false,
        error: 'At least one active medical category must remain enabled.',
      };
    }

    setStore((prev) => ({
      ...prev,
      categories: prev.categories.map((c) =>
        c.id === id ? { ...c, isActive: c.isActive === false } : c
      ),
    }));
    return { ok: true };
  };

  const deleteCategory = (id: string): { ok: boolean; error?: string } => {
    if (store.user?.role !== 'Admin') {
      return { ok: false, error: 'Admin access required.' };
    }
    const target = store.categories.find((c) => c.id === id);
    if (!target) {
      return { ok: false, error: 'Category not found.' };
    }
    const inUseCount = store.campaigns.filter(
      (c) => c.category.toLowerCase() === target.name.toLowerCase()
    ).length;
    if (inUseCount > 0) {
      return {
        ok: false,
        error: `Cannot delete “${target.displayTitle || target.name}” because ${inUseCount} ${
          inUseCount === 1 ? 'campaign is' : 'campaigns are'
        } still using this category. Deactivate it or reassign those campaigns first.`,
      };
    }
    if (store.categories.length <= 1) {
      return {
        ok: false,
        error: 'At least one medical category must remain in the directory.',
      };
    }

    setStore((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== id),
    }));
    return { ok: true };
  };

  const submitContactMessage = (input: {
    name: string;
    email: string;
    subject?: string;
    message: string;
  }): ContactMessage => {
    const cleanEmail = input.email.trim();
    const cleanMessage = input.message.trim();
    const fingerprint = `${cleanEmail.toLowerCase()}|${cleanMessage.toLowerCase()}`;
    const now = Date.now();

    if (
      lastContactGuardRef.current &&
      lastContactGuardRef.current.fingerprint === fingerprint &&
      now - lastContactGuardRef.current.ts < 10000
    ) {
      return lastContactGuardRef.current.record;
    }

    const newMsg: ContactMessage = {
      id: generateUniqueId('msg'),
      name: input.name.trim(),
      email: cleanEmail,
      subject: input.subject?.trim() || 'Care Liaison Inquiry',
      message: cleanMessage,
      createdAt: new Date().toISOString(),
      status: 'unread',
    };
    lastContactGuardRef.current = { fingerprint, record: newMsg, ts: now };

    setStore((prev) => ({
      ...prev,
      contactMessages: [newMsg, ...prev.contactMessages],
    }));
    return newMsg;
  };

  const markContactMessageStatus = (
    id: string,
    status: ContactMessage['status']
  ) => {
    setStore((prev) => ({
      ...prev,
      contactMessages: prev.contactMessages.map((m) =>
        m.id === id ? { ...m, status } : m
      ),
    }));
  };

  const deleteContactMessage = (id: string) => {
    setStore((prev) => ({
      ...prev,
      contactMessages: prev.contactMessages.filter((m) => m.id !== id),
    }));
  };

  const getDashboardPathForRole = (role?: UserRole): string => {
    if (role === 'Admin') return '/admin';
    if (role === 'Patient/Fundraiser') return '/dashboard?view=fundraiser';
    return '/dashboard?view=donor';
  };

  const signInMock = (email: string, fullName?: string, roleOverride?: UserRole) => {
    const matchedAccount = store.accounts.find(
      (a) => a.email.toLowerCase() === email.trim().toLowerCase()
    );
    const role: UserRole =
      roleOverride ||
      (matchedAccount ? matchedAccount.role : (email.toLowerCase().includes('admin') ? 'Admin' : 'Donor'));
    const derivedName =
      fullName?.trim() ||
      matchedAccount?.fullName ||
      email
        .split('@')[0]
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

    setStore((prev) => ({
      ...prev,
      user: {
        id: matchedAccount ? matchedAccount.id : generateUniqueId('usr'),
        fullName: derivedName || 'Care Supporter',
        email: email.trim(),
        role: role,
        joinedAt: matchedAccount?.createdAt || new Date().toISOString().slice(0, 10),
      },
    }));
  };

  const signOutMock = () => {
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem('vidacare_active_session_token');
        window.sessionStorage.removeItem('vidacare_active_session_role');
      }
    } catch {
      // Ignore session clearance errors
    }
    setStore((prev) => ({
      ...prev,
      user: null,
    }));
  };

  const resetDemoStore = () => {
    lastDonationGuardRef.current = null;
    lastCampaignGuardRef.current = null;
    lastContactGuardRef.current = null;
    if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      sessionBlobUrlsRef.current.forEach((blobUrl) => {
        try {
          URL.revokeObjectURL(blobUrl);
        } catch {
          // Ignore revoke failures
        }
      });
    }
    sessionBlobUrlsRef.current.clear();
    const res = resetVidaCareStore();
    setStore(res.store);
    setStorageError(res.ok ? null : res.error ?? null);
  };

  const totalRaisedPlatform = useMemo(
    () => approvedCampaigns.reduce((sum, item) => sum + item.raisedAmount, 0),
    [approvedCampaigns]
  );

  const totalDonorsPlatform = useMemo(
    () => approvedCampaigns.reduce((sum, item) => sum + item.donorCount, 0),
    [approvedCampaigns]
  );

  const activeCategories = useMemo(
    () => store.categories.filter((c) => c.isActive !== false),
    [store.categories]
  );

  return (
    <VidaCareContext.Provider
      value={{
        campaigns: store.campaigns,
        approvedCampaigns,
        donations: store.donations,
        savedCampaignIds: store.savedCampaignIds,
        user: store.user,
        accounts: store.accounts,
        notifications: store.notifications,
        categories: store.categories,
        activeCategories,
        contactMessages: store.contactMessages,
        rememberedIdentifier: store.rememberedIdentifier ?? '',
        totalRaisedPlatform,
        totalDonorsPlatform,
        storageError,
        clearStorageError,
        toggleSavedCampaign,
        getCampaignById,
        recordDonation,
        isEmailRegistered,
        findAccountByIdentifier,
        registerAccount,
        authenticateMock,
        updateAccountPasswordMock,
        updateUserProfile,
        changeCurrentUserPassword,
        createUserCampaign,
        updateUserCampaign,
        postCampaignUpdate,
        markNotificationRead,
        markAllNotificationsRead,
        approveCampaign,
        rejectCampaign,
        removeCampaign,
        toggleBlockAccount,
        addCategory,
        updateCategory,
        toggleCategoryActive,
        deleteCategory,
        submitContactMessage,
        markContactMessageStatus,
        deleteContactMessage,
        getDashboardPathForRole,
        signInMock,
        signOutMock,
        resetDemoStore,
      }}
    >
      {children}
    </VidaCareContext.Provider>
  );
}

export function useVidaCare(): VidaCareContextValue {
  const ctx = useContext(VidaCareContext);
  if (!ctx) {
    throw new Error('useVidaCare must be used inside VidaCareProvider');
  }
  return ctx;
}
