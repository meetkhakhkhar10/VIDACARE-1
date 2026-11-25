import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  Eye,
  EyeOff,
  FolderKanban,
  HeartHandshake,
  Lock,
  LogOut,
  Mail,
  MessageSquare,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Tag,
  Trash2,
  UserCheck,
  UserX,
  Users,
  XCircle,
} from 'lucide-react';
import { useVidaCare } from '../context/VidaCareContext';
import {
  CategoryItem,
  ContactMessage,
  MedicalCampaign,
  RegisteredAccount,
} from '../types/campaign';
import { calculateProgress, formatINR } from '../lib/format';
import { SafeImage } from '../components/SafeImage';
import {
  GlassSurface,
  ProgressMeter,
  VidaButton,
} from '../components/ui/DesignPrimitives';
import {
  CampaignInspectorModal,
  CategoryFormModal,
  ConfirmActionModal,
  MessageInspectorModal,
  RejectCampaignModal,
  UserInspectorModal,
} from '../components/admin/AdminModals';
import { AdminAnalyticsSection } from '../components/admin/AdminAnalyticsSection';
import { adminService } from '../services/adminService';
import { VerificationRequest, VerificationStatus } from '../types/api';

type AdminSection =
  | 'overview'
  | 'campaigns'
  | 'verifications'
  | 'users'
  | 'donations'
  | 'categories'
  | 'messages'
  | 'analytics'
  | 'settings';

const PAGE_SIZE = 5;

function CampaignStatusText({ status }: { status: MedicalCampaign['status'] }) {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-300">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>Approved</span>
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-300">
        <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>Rejected</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-300">
      <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>Pending</span>
    </span>
  );
}

function PaginationBar({
  page,
  totalPages,
  totalItems,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (next: number) => void;
}) {
  if (totalItems <= PAGE_SIZE) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t vc-hairline px-5 py-3.5 text-xs text-slate-400">
      <span className="font-mono tabular-nums">
        Page {page} of {totalPages} · {totalItems} records
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/70 text-slate-300 transition-colors hover:border-amber-300/40 hover:text-white disabled:opacity-40 disabled:pointer-events-none"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={`h-8 min-w-[32px] rounded-lg px-2 font-mono text-xs tabular-nums transition-colors ${
              p === page
                ? 'bg-amber-300 font-semibold text-slate-950'
                : 'border border-slate-800 bg-slate-900/70 text-slate-300 hover:border-sky-300/40'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/70 text-slate-300 transition-colors hover:border-amber-300/40 hover:text-white disabled:opacity-40 disabled:pointer-events-none"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export const AdminDashboardPage: React.FC = () => {
  const {
    user,
    campaigns,
    approvedCampaigns,
    accounts,
    donations,
    categories,
    contactMessages,
    authenticateMock,
    signOutMock,
    updateUserProfile,
    approveCampaign,
    rejectCampaign,
    removeCampaign,
    toggleBlockAccount,
    addCategory,
    updateCategory,
    toggleCategoryActive,
    deleteCategory,
    markContactMessageStatus,
    deleteContactMessage,
    resetDemoStore,
    storageError,
    clearStorageError,
  } = useVidaCare();
  const navigate = useNavigate();

  const [section, setSection] = useState<AdminSection>('overview');
  const [bannerNotice, setBannerNotice] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);

  // Campaign Management filters & modals
  const [campSearch, setCampSearch] = useState('');
  const [campStatus, setCampStatus] = useState<'all' | MedicalCampaign['status']>('all');
  const [campCat, setCampCat] = useState('All');
  const [campPage, setCampPage] = useState(1);
  const [inspectCampaign, setInspectCampaign] = useState<MedicalCampaign | null>(null);
  const [rejectTarget, setRejectTarget] = useState<MedicalCampaign | null>(null);

  // User Management filters & modals
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'All' | RegisteredAccount['role']>('All');
  const [userStateFilter, setUserStateFilter] = useState<'All' | 'Active' | 'Blocked'>('All');
  const [userPage, setUserPage] = useState(1);
  const [inspectUser, setInspectUser] = useState<RegisteredAccount | null>(null);

  // Donation Management filters
  const [donSearch, setDonSearch] = useState('');
  const [donMethod, setDonMethod] = useState('All');
  const [donStatus, setDonStatus] = useState('All');
  const [donPage, setDonPage] = useState(1);

  // Category Management modal
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);

  // Contact Messages filters & modal
  const [msgSearch, setMsgSearch] = useState('');
  const [msgFilter, setMsgFilter] = useState<'all' | ContactMessage['status']>('all');
  const [msgPage, setMsgPage] = useState(1);
  const [inspectMessage, setInspectMessage] = useState<ContactMessage | null>(null);

  // Verification Requests state (Google Sheets Verification_Requests)
  const [verRequests, setVerRequests] = useState<VerificationRequest[]>([
    {
      requestId: 'ver-8821',
      userId: 'acc-demo-patient',
      fullName: 'Elena Alvarez',
      email: 'elena@vidacare.org',
      mobile: '+91 98765 00224',
      documentType: 'Hospital Treatment Cost Estimate',
      documentLink: 'https://drive.google.com/file/d/demo_st_jude_estimate/view',
      submittedAt: '2026-11-20T10:30:00Z',
      status: 'Pending',
      remarks: 'Pre-admission estimation from St. Jude Heart Pavilion',
    },
    {
      requestId: 'ver-8822',
      userId: 'acc-demo-carlos',
      fullName: 'Carlos Mendez',
      email: 'carlos.mendez@example.org',
      mobile: '+91 98765 00419',
      documentType: 'Government Identity Proof & Clinical Report',
      documentLink: 'https://drive.google.com/file/d/demo_carlos_id_doc/view',
      submittedAt: '2026-11-22T14:15:00Z',
      status: 'Under Review',
      remarks: 'Awaiting oncology board signature',
    },
  ]);
  const [verStatusFilter, setVerStatusFilter] = useState<'All' | VerificationStatus>('All');
  const [verSearch, setVerSearch] = useState('');
  const [verRemarksModal, setVerRemarksModal] = useState<{
    open: boolean;
    request: VerificationRequest | null;
    decision: VerificationStatus | null;
  }>({
    open: false,
    request: null,
    decision: null,
  });
  const [verRemarksInput, setVerRemarksInput] = useState('');

  const pendingVerificationsCount = useMemo(
    () => verRequests.filter((r) => r.status === 'Pending' || r.status === 'Under Review').length,
    [verRequests]
  );

  const filteredVerifications = useMemo(() => {
    const q = verSearch.trim().toLowerCase();
    return verRequests.filter((r) => {
      if (verStatusFilter !== 'All' && r.status !== verStatusFilter) return false;
      if (!q) return true;
      return (
        r.fullName.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.mobile.includes(q) ||
        r.documentType.toLowerCase().includes(q)
      );
    });
  }, [verRequests, verStatusFilter, verSearch]);

  // Confirmation modal state
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    tone: 'primary' | 'danger';
    action: () => void;
  }>({
    open: false,
    title: '',
    description: '',
    confirmLabel: 'Confirm',
    tone: 'primary',
    action: () => {},
  });

  // Admin Settings profile state
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminLocation, setAdminLocation] = useState('');
  const [settingsFeedback, setSettingsFeedback] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (user && user.role === 'Admin') {
      setAdminName(user.fullName || '');
      setAdminEmail(user.email || '');
      setAdminPhone(user.phone || '');
      setAdminLocation(user.location || '');
    }
  }, [user]);

  // Derived Overview Metrics
  const pendingCampaigns = useMemo(
    () => campaigns.filter((c) => c.status === 'pending'),
    [campaigns]
  );
  const rejectedCampaigns = useMemo(
    () => campaigns.filter((c) => c.status === 'rejected'),
    [campaigns]
  );
  const totalFundsRaisedAll = useMemo(
    () => approvedCampaigns.reduce((sum, c) => sum + c.raisedAmount, 0),
    [approvedCampaigns]
  );
  const totalDonationTxVolume = useMemo(
    () => donations.reduce((sum, d) => sum + d.amount, 0),
    [donations]
  );
  const unreadMessagesCount = useMemo(
    () => contactMessages.filter((m) => m.status === 'unread').length,
    [contactMessages]
  );

  // Filtered Campaigns
  const filteredCampaigns = useMemo(() => {
    const q = campSearch.trim().toLowerCase();
    return campaigns.filter((c) => {
      if (campStatus !== 'all' && c.status !== campStatus) return false;
      if (campCat !== 'All' && c.category !== campCat) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.patientName.toLowerCase().includes(q) ||
        c.hospitalName.toLowerCase().includes(q) ||
        c.organizerName.toLowerCase().includes(q) ||
        c.condition.toLowerCase().includes(q)
      );
    });
  }, [campaigns, campSearch, campStatus, campCat]);

  const campTotalPages = Math.max(1, Math.ceil(filteredCampaigns.length / PAGE_SIZE));
  const pagedCampaigns = useMemo(() => {
    const safePage = Math.min(campPage, campTotalPages);
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredCampaigns.slice(start, start + PAGE_SIZE);
  }, [filteredCampaigns, campPage, campTotalPages]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return accounts.filter((a) => {
      if (userRoleFilter !== 'All' && a.role !== userRoleFilter) return false;
      if (userStateFilter === 'Active' && a.blocked) return false;
      if (userStateFilter === 'Blocked' && !a.blocked) return false;
      if (!q) return true;
      return (
        a.fullName.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.phone.toLowerCase().includes(q) ||
        (a.location || '').toLowerCase().includes(q)
      );
    });
  }, [accounts, userSearch, userRoleFilter, userStateFilter]);

  const userTotalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const pagedUsers = useMemo(() => {
    const safePage = Math.min(userPage, userTotalPages);
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, userPage, userTotalPages]);

  // Filtered Donations
  const filteredDonations = useMemo(() => {
    const q = donSearch.trim().toLowerCase();
    return donations.filter((d) => {
      const method = d.paymentMethod || 'UPI';
      const status = d.paymentStatus || 'Completed';
      if (donMethod !== 'All' && method !== donMethod) return false;
      if (donStatus !== 'All' && status !== donStatus) return false;
      if (!q) return true;
      return (
        (d.isAnonymous ? 'anonymous donor' : d.donorName).toLowerCase().includes(q) ||
        (!d.isAnonymous && (d.donorEmail || '').toLowerCase().includes(q)) ||
        d.campaignTitle.toLowerCase().includes(q) ||
        (d.transactionRef || '').toLowerCase().includes(q)
      );
    });
  }, [donations, donSearch, donMethod, donStatus]);

  const donTotalPages = Math.max(1, Math.ceil(filteredDonations.length / PAGE_SIZE));
  const pagedDonations = useMemo(() => {
    const safePage = Math.min(donPage, donTotalPages);
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredDonations.slice(start, start + PAGE_SIZE);
  }, [filteredDonations, donPage, donTotalPages]);

  // Filtered Contact Messages
  const filteredMessages = useMemo(() => {
    const q = msgSearch.trim().toLowerCase();
    return contactMessages.filter((m) => {
      if (msgFilter !== 'all' && m.status !== msgFilter) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        m.message.toLowerCase().includes(q)
      );
    });
  }, [contactMessages, msgSearch, msgFilter]);

  const msgTotalPages = Math.max(1, Math.ceil(filteredMessages.length / PAGE_SIZE));
  const pagedMessages = useMemo(() => {
    const safePage = Math.min(msgPage, msgTotalPages);
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredMessages.slice(start, start + PAGE_SIZE);
  }, [filteredMessages, msgPage, msgTotalPages]);

  // Protected Admin Route Gate (Mock Frontend Role-Based Access)
  if (!user || user.role !== 'Admin') {
    return (
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-[780px] px-4 sm:px-6 lg:px-8">
          <GlassSurface className="flex flex-col gap-6 p-8 sm:p-12">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-300/35 bg-amber-300/10 text-amber-300">
                <Lock className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium tracking-[0.14em] text-amber-300">
                  Protected Admin Route (Demo Role Check)
                </p>
                <h1 className="font-display text-3xl font-semibold text-slate-50 sm:text-4xl">
                  Administrator Access Required
                </h1>
                <p className="text-sm leading-relaxed text-slate-300/85">
                  {user
                    ? `You are currently signed in as ${user.fullName} (${user.role}). Only accounts with the Admin role can enter the administrative moderation workspace.`
                    : 'Sign in with an Admin role account to review medical campaigns, manage demo user accounts, and view platform analytics.'}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4 text-xs text-slate-400">
              <strong className="text-slate-200">Frontend Demo Notice:</strong>{' '}
              Role checks, document previews, and account controls run strictly in
              browser LocalStorage for demonstration purposes and do not perform
              server-side authentication or clinical verification.
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  authenticateMock('admin@vidacare.org', 'VidaAdmin@2026', true)
                }
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-teal-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-teal-300"
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                <span>Enter Demo Admin Console (Dr. Claire Sterling)</span>
              </button>

              {user ? (
                <VidaButton to="/dashboard" variant="secondary">
                  Return to User Dashboard
                </VidaButton>
              ) : (
                <VidaButton to="/login" variant="secondary">
                  Go to Login
                </VidaButton>
              )}
            </div>
          </GlassSurface>
        </div>
      </section>
    );
  }

  const showToast = (type: 'ok' | 'err', text: string) => {
    setBannerNotice({ type, text });
  };

  const handleRequestApprove = (campaign: MedicalCampaign) => {
    setConfirmState({
      open: true,
      title: 'Approve Medical Campaign',
      description: `Approving “${campaign.title}” will immediately publish it across the public Campaigns directory and notify the organizer.`,
      confirmLabel: 'Approve Campaign',
      tone: 'primary',
      action: () => {
        const res = approveCampaign(campaign.id);
        setConfirmState((prev) => ({ ...prev, open: false }));
        setInspectCampaign(null);
        if (res.ok) {
          showToast('ok', `Approved “${campaign.title}” for public listing.`);
        } else {
          showToast('err', res.error || 'Could not approve campaign.');
        }
      },
    });
  };

  const handleRequestRemoveCampaign = (campaign: MedicalCampaign) => {
    setConfirmState({
      open: true,
      title: 'Remove Suspicious Campaign',
      description: `Permanently remove “${campaign.title}” from the platform? This action immediately deletes the listing from LocalStorage.`,
      confirmLabel: 'Remove Campaign',
      tone: 'danger',
      action: () => {
        const res = removeCampaign(campaign.id);
        setConfirmState((prev) => ({ ...prev, open: false }));
        setInspectCampaign(null);
        if (res.ok) {
          showToast('ok', `Removed “${campaign.title}” from platform listings.`);
        } else {
          showToast('err', res.error || 'Could not remove campaign.');
        }
      },
    });
  };

  const handleRequestToggleBlock = (account: RegisteredAccount) => {
    const blocking = !account.blocked;
    setConfirmState({
      open: true,
      title: blocking ? 'Block Demo Account' : 'Unblock Demo Account',
      description: blocking
        ? `Block ${account.fullName} (${account.email}) from signing into this demo workspace?`
        : `Restore sign-in access for ${account.fullName} (${account.email})?`,
      confirmLabel: blocking ? 'Block Account' : 'Unblock Account',
      tone: blocking ? 'danger' : 'primary',
      action: () => {
        const res = toggleBlockAccount(account.id);
        setConfirmState((prev) => ({ ...prev, open: false }));
        if (res.ok) {
          showToast(
            'ok',
            `${account.fullName} is now ${blocking ? 'blocked' : 'active'}.`
          );
        } else {
          showToast('err', res.error || 'Could not update account status.');
        }
      },
    });
  };

  const handleRequestDeleteCategory = (cat: CategoryItem) => {
    const inUseCount = campaigns.filter(
      (c) => c.category.toLowerCase() === cat.name.toLowerCase()
    ).length;

    if (inUseCount > 0) {
      const res = deleteCategory(cat.id);
      showToast(
        'err',
        res.error ||
          `Cannot delete “${cat.displayTitle || cat.name}” because ${inUseCount} ${
            inUseCount === 1 ? 'campaign is' : 'campaigns are'
          } still using this category. Deactivate it or reassign those campaigns first.`
      );
      return;
    }

    setConfirmState({
      open: true,
      title: 'Delete Medical Category',
      description: `Delete “${cat.displayTitle || cat.name}”? No campaigns currently reference this category.`,
      confirmLabel: 'Delete Category',
      tone: 'danger',
      action: () => {
        const res = deleteCategory(cat.id);
        setConfirmState((prev) => ({ ...prev, open: false }));
        if (res.ok) {
          showToast('ok', `Deleted category “${cat.displayTitle || cat.name}”.`);
        } else {
          showToast('err', res.error || 'Cannot delete this category.');
        }
      },
    });
  };

  const handleRequestDeleteMessage = (msg: ContactMessage) => {
    setConfirmState({
      open: true,
      title: 'Delete Contact Inquiry',
      description: `Delete the message from ${msg.name} (“${msg.subject}”)?`,
      confirmLabel: 'Delete Message',
      tone: 'danger',
      action: () => {
        deleteContactMessage(msg.id);
        setConfirmState((prev) => ({ ...prev, open: false }));
        showToast('ok', `Deleted contact message from ${msg.name}.`);
      },
    });
  };

  const handleSaveAdminProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsFeedback(null);
    if (!adminName.trim() || !adminEmail.includes('@')) {
      setSettingsFeedback({
        type: 'err',
        text: 'Enter a valid administrator name and email address.',
      });
      return;
    }
    const res = updateUserProfile({
      fullName: adminName,
      email: adminEmail,
      phone: adminPhone,
      location: adminLocation,
    });
    if (!res.ok) {
      setSettingsFeedback({
        type: 'err',
        text: res.error || 'Could not update admin profile.',
      });
      return;
    }
    setSettingsFeedback({
      type: 'ok',
      text: 'Administrator profile updated in LocalStorage.',
    });
  };

  const handleLogout = () => {
    signOutMock();
    navigate('/login');
  };

  const handleReviewVerification = async (
    request: VerificationRequest,
    decision: VerificationStatus,
    remarks?: string
  ) => {
    try {
      await adminService.reviewVerification(request.requestId, decision, remarks);
    } catch {
      // Offline fallback
    }

    setVerRequests((prev) =>
      prev.map((r) =>
        r.requestId === request.requestId
          ? {
              ...r,
              status: decision,
              remarks: remarks || r.remarks,
              reviewedAt: new Date().toISOString(),
              reviewedBy: user?.email || 'admin@vidacare.org',
            }
          : r
      )
    );
    showToast(
      'ok',
      `Verification request for ${request.fullName} marked as ${decision}. Decision logged in Activity_Logs.`
    );
    setVerRemarksModal({ open: false, request: null, decision: null });
    setVerRemarksInput('');
  };

  const navItems: Array<{
    id: AdminSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'overview', label: 'Overview', icon: FolderKanban },
    {
      id: 'campaigns',
      label: 'Campaigns',
      icon: HeartHandshake,
      badge: pendingCampaigns.length > 0 ? pendingCampaigns.length : undefined,
    },
    {
      id: 'verifications',
      label: 'Verifications',
      icon: ShieldCheck,
      badge: pendingVerificationsCount > 0 ? pendingVerificationsCount : undefined,
    },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'donations', label: 'Donations', icon: Receipt },
    { id: 'categories', label: 'Categories', icon: Tag },
    {
      id: 'messages',
      label: 'Messages',
      icon: MessageSquare,
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
    },
    { id: 'analytics', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Admin Settings', icon: Settings },
  ];

  const activeNavLabel =
    navItems.find((item) => item.id === section)?.label || 'Overview';

  return (
    <section className="py-8 sm:py-10">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div className="grid items-start gap-8 lg:grid-cols-12">
          {/* Desktop Admin Sidebar */}
          <aside className="hidden lg:col-span-3 lg:block lg:sticky lg:top-24">
            <GlassSurface className="flex flex-col gap-5 p-5">
              {/* Admin Profile Identity */}
              <div className="flex items-center gap-3.5 border-b vc-hairline pb-4">
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-teal-400/40 bg-slate-900">
                  <SafeImage
                    src={
                      user.avatarUrl ||
                      '/src/assets/images/campaign_oncology_support_1795448744973.jpg'
                    }
                    alt={user.fullName}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-50">
                    {user.fullName}
                  </p>
                  <p className="truncate text-xs text-teal-300">
                    VidaCare Admin Console
                  </p>
                </div>
              </div>

              {/* Navigation Links */}
              <nav aria-label="Admin sections" className="flex flex-col gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = section === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSection(item.id);
                        setBannerNotice(null);
                      }}
                      className={`flex min-h-[42px] w-full items-center justify-between gap-2.5 rounded-lg px-3.5 py-2 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                        active
                          ? 'border border-amber-300/35 bg-amber-300/15 text-amber-200'
                          : 'border border-transparent text-slate-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 truncate">
                        <Icon
                          className={`h-4 w-4 shrink-0 ${
                            active ? 'text-amber-300' : 'text-slate-400'
                          }`}
                          aria-hidden="true"
                        />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {item.badge !== undefined && (
                        <span className="font-mono text-xs font-semibold tabular-nums text-amber-300">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              <div className="flex flex-col gap-2 border-t vc-hairline pt-4">
                <Link
                  to="/campaigns"
                  className="inline-flex min-h-[38px] items-center justify-center rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-sky-300/40 hover:text-white"
                >
                  View Public Directory
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex min-h-[38px] items-center justify-center gap-2 rounded-lg border border-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-400 hover:border-rose-400/40 hover:text-rose-200"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Logout</span>
                </button>
              </div>
            </GlassSurface>
          </aside>

          {/* Main Admin Workspace */}
          <div className="flex flex-col gap-6 lg:col-span-9">
            {/* Mobile & Tablet Compact Header */}
            <div className="flex flex-col gap-3 lg:hidden">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-teal-300">
                    VidaCare Admin Console
                  </p>
                  <p className="truncate text-sm font-semibold text-slate-50">
                    {user.fullName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-xs font-medium text-slate-300"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Logout</span>
                </button>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {navItems.map((item) => {
                  const active = section === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSection(item.id);
                        setBannerNotice(null);
                      }}
                      className={`min-h-[38px] rounded-lg px-3.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                        active
                          ? 'bg-amber-300 font-semibold text-slate-950'
                          : 'border border-slate-800 bg-slate-900/70 text-slate-300'
                      }`}
                    >
                      {item.label}
                      {item.badge ? ` (${item.badge})` : ''}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Contextual Breadcrumb Top Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b vc-hairline pb-4">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>VidaCare</span>
                <span aria-hidden="true">/</span>
                <span>Admin Portal</span>
                <span aria-hidden="true">/</span>
                <span className="font-medium text-amber-300">{activeNavLabel}</span>
              </div>
              <span className="text-xs text-slate-400">
                Frontend demo administration (LocalStorage)
              </span>
            </div>

            {/* Storage Error Banner */}
            {storageError && (
              <div
                role="alert"
                className="flex items-center justify-between gap-3 rounded-xl border border-amber-300/35 bg-amber-950/35 px-4 py-3 text-xs text-amber-100"
              >
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
                  <span>{storageError}</span>
                </span>
                <button
                  type="button"
                  onClick={clearStorageError}
                  className="text-amber-200 hover:text-white"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Action Feedback Banner */}
            {bannerNotice && (
              <div
                role="status"
                className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs ${
                  bannerNotice.type === 'ok'
                    ? 'border-teal-400/35 bg-teal-950/35 text-teal-200'
                    : 'border-rose-400/35 bg-rose-950/35 text-rose-200'
                }`}
              >
                <span>{bannerNotice.text}</span>
                <button
                  type="button"
                  onClick={() => setBannerNotice(null)}
                  className="text-slate-300 hover:text-white"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* 1. OVERVIEW SECTION */}
            {section === 'overview' && (
              <div className="flex flex-col gap-6">
                <div>
                  <p className="text-xs font-medium tracking-[0.14em] text-teal-300">
                    Platform Operations Summary
                  </p>
                  <h1 className="mt-1 font-display text-2xl font-semibold text-slate-50 sm:text-3xl">
                    Administrative Overview
                  </h1>
                </div>

                {/* 6 Core Admin KPIs */}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <GlassSurface className="flex flex-col gap-1.5 p-5">
                    <span className="text-xs text-slate-400">Total Users</span>
                    <span className="font-mono text-3xl font-semibold tabular-nums text-sky-300">
                      {accounts.length}
                    </span>
                    <span className="text-xs text-slate-400">
                      {accounts.filter((a) => a.blocked).length} blocked ·{' '}
                      {accounts.filter((a) => !a.blocked).length} active
                    </span>
                  </GlassSurface>

                  <GlassSurface className="flex flex-col gap-1.5 p-5">
                    <span className="text-xs text-slate-400">Total Campaigns</span>
                    <span className="font-mono text-3xl font-semibold tabular-nums text-slate-50">
                      {campaigns.length}
                    </span>
                    <span className="text-xs text-slate-400">
                      {rejectedCampaigns.length} rejected · {categories.length}{' '}
                      categories
                    </span>
                  </GlassSurface>

                  <GlassSurface className="flex flex-col gap-1.5 p-5">
                    <span className="text-xs text-slate-400">Approved Campaigns</span>
                    <span className="font-mono text-3xl font-semibold tabular-nums text-teal-300">
                      {approvedCampaigns.length}
                    </span>
                    <span className="text-xs text-slate-400">
                      Live in public directory
                    </span>
                  </GlassSurface>

                  <GlassSurface className="flex flex-col gap-1.5 p-5">
                    <span className="text-xs text-slate-400">Pending Approvals</span>
                    <span className="font-mono text-3xl font-semibold tabular-nums text-amber-300">
                      {pendingCampaigns.length}
                    </span>
                    <span className="text-xs text-slate-400">
                      Awaiting administrative review
                    </span>
                  </GlassSurface>

                  <GlassSurface className="flex flex-col gap-1.5 p-5">
                    <span className="text-xs text-slate-400">Total Donations</span>
                    <span className="font-mono text-3xl font-semibold tabular-nums text-sky-300">
                      {donations.length}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatINR(totalDonationTxVolume)} logged in ledger
                    </span>
                  </GlassSurface>

                  <GlassSurface className="flex flex-col gap-1.5 p-5">
                    <span className="text-xs text-slate-400">Total Funds Raised</span>
                    <span className="font-mono text-3xl font-semibold tabular-nums text-teal-300">
                      {formatINR(totalFundsRaisedAll)}
                    </span>
                    <span className="text-xs text-slate-400">
                      Cumulative across approved fundraisers
                    </span>
                  </GlassSurface>
                </div>

                {/* Pending Queue & Recent Inquiries */}
                <div className="grid gap-6 lg:grid-cols-12">
                  <GlassSurface className="flex flex-col gap-4 p-6 lg:col-span-7">
                    <div className="flex items-center justify-between">
                      <h2 className="font-display text-xl font-semibold text-slate-50">
                        Pending Approval Queue
                      </h2>
                      <button
                        type="button"
                        onClick={() => {
                          setCampStatus('pending');
                          setSection('campaigns');
                        }}
                        className="text-xs font-medium text-amber-300 hover:text-amber-200"
                      >
                        Review all
                      </button>
                    </div>

                    {pendingCampaigns.length === 0 ? (
                      <p className="text-sm text-slate-400">
                        All submitted fundraisers have been reviewed.
                      </p>
                    ) : (
                      <div className="flex flex-col divide-y divide-slate-800/70">
                        {pendingCampaigns.slice(0, 4).map((c) => (
                          <div
                            key={c.id}
                            className="flex flex-col justify-between gap-3 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-100">
                                {c.title}
                              </p>
                              <p className="text-xs text-slate-400">
                                {c.patientName} · {c.hospitalName} · Goal{' '}
                                <span className="font-mono tabular-nums">
                                  {formatINR(c.goalAmount)}
                                </span>
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => setInspectCampaign(c)}
                                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-sky-300 hover:border-sky-300/40"
                              >
                                Inspect
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRequestApprove(c)}
                                className="rounded-lg bg-teal-400 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-teal-300"
                              >
                                Approve
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </GlassSurface>

                  <GlassSurface className="flex flex-col gap-4 p-6 lg:col-span-5">
                    <div className="flex items-center justify-between">
                      <h2 className="font-display text-xl font-semibold text-slate-50">
                        Inbox Highlights
                      </h2>
                      <button
                        type="button"
                        onClick={() => setSection('messages')}
                        className="text-xs font-medium text-sky-300 hover:text-sky-200"
                      >
                        Open inbox
                      </button>
                    </div>

                    {contactMessages.length === 0 ? (
                      <p className="text-sm text-slate-400">
                        No contact inquiries logged yet.
                      </p>
                    ) : (
                      <div className="flex flex-col divide-y divide-slate-800/70">
                        {contactMessages.slice(0, 3).map((msg) => (
                          <div
                            key={msg.id}
                            className="py-3 first:pt-0 last:pb-0"
                          >
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="font-medium text-slate-100">
                                {msg.name}
                              </span>
                              <span
                                className={`capitalize ${
                                  msg.status === 'unread'
                                    ? 'font-semibold text-amber-300'
                                    : msg.status === 'resolved'
                                    ? 'text-teal-300'
                                    : 'text-sky-300'
                                }`}
                              >
                                {msg.status}
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-xs text-slate-400">
                              {msg.subject} — {msg.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </GlassSurface>
                </div>
              </div>
            )}

            {/* 2. CAMPAIGN MANAGEMENT SECTION */}
            {section === 'campaigns' && (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                  <div>
                    <p className="text-xs font-medium tracking-[0.14em] text-amber-300">
                      Moderation &amp; Verification
                    </p>
                    <h1 className="mt-1 font-display text-2xl font-semibold text-slate-50">
                      Campaign Management
                    </h1>
                  </div>
                  <span className="font-mono text-xs tabular-nums text-slate-400">
                    {filteredCampaigns.length} matching campaigns
                  </span>
                </div>

                {/* Search & Filters */}
                <GlassSurface className="flex flex-col gap-4 p-5">
                  <div className="grid gap-3 md:grid-cols-12">
                    <div className="relative md:col-span-8">
                      <Search
                        className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                        aria-hidden="true"
                      />
                      <input
                        type="search"
                        value={campSearch}
                        onChange={(e) => {
                          setCampSearch(e.target.value);
                          setCampPage(1);
                        }}
                        placeholder="Search by campaign title, patient, hospital, or organizer..."
                        className="min-h-[42px] w-full rounded-lg border border-slate-800 bg-slate-950/75 pr-3.5 pl-10 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-300/60 focus:outline-none"
                      />
                    </div>
                    <div className="md:col-span-4">
                      <select
                        aria-label="Filter campaigns by category"
                        value={campCat}
                        onChange={(e) => {
                          setCampCat(e.target.value);
                          setCampPage(1);
                        }}
                        className="min-h-[42px] w-full rounded-lg border border-slate-800 bg-slate-950/75 px-3 text-sm text-slate-100 focus:border-amber-300/60 focus:outline-none"
                      >
                        <option value="All">All Categories</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.name}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 border-t vc-hairline pt-3">
                    {(
                      [
                        { id: 'all', label: `All (${campaigns.length})` },
                        { id: 'pending', label: `Pending (${pendingCampaigns.length})` },
                        { id: 'approved', label: `Approved (${approvedCampaigns.length})` },
                        { id: 'rejected', label: `Rejected (${rejectedCampaigns.length})` },
                      ] as Array<{ id: 'all' | MedicalCampaign['status']; label: string }>
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          setCampStatus(tab.id);
                          setCampPage(1);
                        }}
                        className={`min-h-[36px] rounded-lg px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                          campStatus === tab.id
                            ? 'bg-amber-300 font-semibold text-slate-950'
                            : 'border border-slate-800 bg-slate-900/70 text-slate-300 hover:border-sky-300/40'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </GlassSurface>

                {pagedCampaigns.length === 0 ? (
                  <GlassSurface className="flex flex-col items-start gap-3 p-10">
                    <h2 className="font-display text-xl font-semibold text-slate-50">
                      No campaigns match your filters
                    </h2>
                    <p className="text-sm text-slate-400">
                      Clear your search query or status filter to view all medical
                      campaigns.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setCampSearch('');
                        setCampStatus('all');
                        setCampCat('All');
                        setCampPage(1);
                      }}
                      className="rounded-lg bg-teal-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-teal-300"
                    >
                      Reset Filters
                    </button>
                  </GlassSurface>
                ) : (
                  <GlassSurface className="overflow-hidden">
                    <div className="divide-y divide-slate-800/75">
                      {pagedCampaigns.map((c) => {
                        const pct = calculateProgress(c.raisedAmount, c.goalAmount);
                        return (
                          <div
                            key={c.id}
                            className="flex flex-col justify-between gap-4 p-5 md:flex-row md:items-center"
                          >
                            <div className="flex items-start gap-4 min-w-0 flex-1">
                              <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-slate-950">
                                <SafeImage
                                  src={c.imageUrl}
                                  alt={c.patientName}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                  <CampaignStatusText status={c.status} />
                                  <span aria-hidden="true" className="text-slate-600">
                                    ·
                                  </span>
                                  <span className="text-sky-300">{c.category}</span>
                                  <span aria-hidden="true" className="text-slate-600">
                                    ·
                                  </span>
                                  <span className="font-mono text-slate-400 tabular-nums">
                                    {c.documents?.length ?? 0} docs
                                  </span>
                                </div>
                                <h3 className="mt-1 truncate font-display text-lg font-semibold text-slate-50">
                                  {c.title}
                                </h3>
                                <p className="text-xs text-slate-400">
                                  {c.patientName} · {c.hospitalName} · Organizer:{' '}
                                  {c.organizerName}
                                </p>
                                <div className="mt-2.5 flex max-w-md items-center gap-3">
                                  <div className="flex-1">
                                    <ProgressMeter value={pct} />
                                  </div>
                                  <span className="font-mono text-xs tabular-nums text-slate-300">
                                    {formatINR(c.raisedAmount)} /{' '}
                                    {formatINR(c.goalAmount)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => setInspectCampaign(c)}
                                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-sky-300 hover:border-sky-300/50"
                              >
                                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>Inspect</span>
                              </button>
                              {c.status !== 'approved' && (
                                <button
                                  type="button"
                                  onClick={() => handleRequestApprove(c)}
                                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-teal-400 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-teal-300"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span>Approve</span>
                                </button>
                              )}
                              {c.status !== 'rejected' && (
                                <button
                                  type="button"
                                  onClick={() => setRejectTarget(c)}
                                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-amber-300/40 bg-amber-300/10 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-300/20"
                                >
                                  <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span>Reject</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRequestRemoveCampaign(c)}
                                aria-label={`Remove campaign ${c.title}`}
                                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-rose-400/35 bg-rose-950/30 px-3 py-1.5 text-xs font-medium text-rose-200 hover:bg-rose-950/60"
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>Remove</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <PaginationBar
                      page={Math.min(campPage, campTotalPages)}
                      totalPages={campTotalPages}
                      totalItems={filteredCampaigns.length}
                      onPageChange={setCampPage}
                    />
                  </GlassSurface>
                )}
              </div>
            )}

            {/* 2B. VERIFICATION REQUESTS WORKFLOW SECTION */}
            {section === 'verifications' && (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                  <div>
                    <p className="text-xs font-medium tracking-[0.14em] text-teal-300">
                      Google Drive &amp; Sheets Verification Workflow
                    </p>
                    <h1 className="mt-1 font-display text-2xl font-semibold text-slate-50">
                      Verification Requests
                    </h1>
                  </div>
                  <span className="font-mono text-xs tabular-nums text-slate-400">
                    {filteredVerifications.length} submitted requests
                  </span>
                </div>

                <GlassSurface className="flex flex-col gap-4 p-5 sm:p-6">
                  {/* Search and Status Filters */}
                  <div className="grid gap-3 sm:grid-cols-12">
                    <div className="relative sm:col-span-7">
                      <Search
                        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                        aria-hidden="true"
                      />
                      <input
                        type="text"
                        value={verSearch}
                        onChange={(e) => setVerSearch(e.target.value)}
                        placeholder="Search by submitter name, email, or document..."
                        className="min-h-[42px] w-full rounded-lg border border-slate-800 bg-slate-950/70 pl-10 pr-3.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-teal-400/60 focus:outline-none focus:ring-2 focus:ring-teal-400/25"
                      />
                    </div>
                    <div className="sm:col-span-5">
                      <select
                        value={verStatusFilter}
                        onChange={(e) => setVerStatusFilter(e.target.value as any)}
                        className="min-h-[42px] w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3.5 text-xs text-slate-200 focus:border-teal-400/60 focus:outline-none focus:ring-2 focus:ring-teal-400/25"
                      >
                        <option value="All">All Statuses ({verRequests.length})</option>
                        <option value="Pending">
                          Pending ({verRequests.filter((r) => r.status === 'Pending').length})
                        </option>
                        <option value="Under Review">
                          Under Review ({verRequests.filter((r) => r.status === 'Under Review').length})
                        </option>
                        <option value="Verified">
                          Verified ({verRequests.filter((r) => r.status === 'Verified').length})
                        </option>
                        <option value="Rejected">
                          Rejected ({verRequests.filter((r) => r.status === 'Rejected').length})
                        </option>
                        <option value="Resubmission Required">
                          Resubmission Required (
                          {verRequests.filter((r) => r.status === 'Resubmission Required').length})
                        </option>
                      </select>
                    </div>
                  </div>

                  {filteredVerifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-xs text-slate-400">
                      <ShieldCheck className="h-8 w-8 text-slate-600" aria-hidden="true" />
                      <p>No verification requests matching your filter criteria.</p>
                    </div>
                  ) : (
                    <div className="divide-y vc-hairline">
                      {filteredVerifications.map((req) => (
                        <div
                          key={req.requestId}
                          className="flex flex-col gap-4 py-4 first:pt-1 last:pb-1 lg:flex-row lg:items-center lg:justify-between"
                        >
                          <div className="flex flex-col gap-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-display text-sm font-semibold text-slate-100">
                                {req.fullName}
                              </span>
                              <span
                                className={`rounded px-2 py-0.5 font-mono text-[11px] font-semibold ${
                                  req.status === 'Verified'
                                    ? 'bg-teal-950/60 text-teal-300 border border-teal-500/30'
                                    : req.status === 'Rejected'
                                    ? 'bg-rose-950/60 text-rose-300 border border-rose-500/30'
                                    : req.status === 'Resubmission Required'
                                    ? 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
                                    : 'bg-sky-950/60 text-sky-300 border border-sky-500/30'
                                }`}
                              >
                                {req.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400">
                              {req.email} · {req.mobile} · Submitted{' '}
                              {new Date(req.submittedAt).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-slate-300">
                              <strong className="text-slate-400">Document:</strong> {req.documentType}
                              {req.remarks && (
                                <span className="ml-2 text-slate-400">
                                  · <span className="italic">"{req.remarks}"</span>
                                </span>
                              )}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {req.documentLink && (
                              <a
                                href={req.documentLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-1 text-xs font-medium text-slate-200 hover:border-sky-400/50 hover:text-white"
                              >
                                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>Inspect Drive File</span>
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                handleReviewVerification(
                                  req,
                                  'Verified',
                                  'Documents verified directly by medical compliance officer'
                                )
                              }
                              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-teal-400/40 bg-teal-950/40 px-3 py-1 text-xs font-medium text-teal-300 hover:bg-teal-950/80"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Verify</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setVerRemarksModal({
                                  open: true,
                                  request: req,
                                  decision: 'Resubmission Required',
                                });
                                setVerRemarksInput(
                                  'Please re-upload clearer hospital letterhead estimate with registration seal.'
                                );
                              }}
                              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-950/40 px-3 py-1 text-xs font-medium text-amber-300 hover:bg-amber-950/80"
                            >
                              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Request Resubmit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setVerRemarksModal({
                                  open: true,
                                  request: req,
                                  decision: 'Rejected',
                                });
                                setVerRemarksInput(
                                  'Document could not be validated with hospital patient billing directory.'
                                );
                              }}
                              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-rose-400/40 bg-rose-950/40 px-3 py-1 text-xs font-medium text-rose-300 hover:bg-rose-950/80"
                            >
                              <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Reject</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </GlassSurface>
              </div>
            )}

            {/* 3. USER MANAGEMENT SECTION */}
            {section === 'users' && (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                  <div>
                    <p className="text-xs font-medium tracking-[0.14em] text-sky-300">
                      Registered Demo Accounts
                    </p>
                    <h1 className="mt-1 font-display text-2xl font-semibold text-slate-50">
                      User Management
                    </h1>
                  </div>
                  <span className="font-mono text-xs tabular-nums text-slate-400">
                    {filteredUsers.length} accounts
                  </span>
                </div>

                <GlassSurface className="grid gap-3 p-5 md:grid-cols-12">
                  <div className="relative md:col-span-6">
                    <Search
                      className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <input
                      type="search"
                      value={userSearch}
                      onChange={(e) => {
                        setUserSearch(e.target.value);
                        setUserPage(1);
                      }}
                      placeholder="Search by name, email, phone, or city..."
                      className="min-h-[42px] w-full rounded-lg border border-slate-800 bg-slate-950/75 pr-3.5 pl-10 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-300/60 focus:outline-none"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <select
                      aria-label="Filter users by role"
                      value={userRoleFilter}
                      onChange={(e) => {
                        setUserRoleFilter(
                          e.target.value as 'All' | RegisteredAccount['role']
                        );
                        setUserPage(1);
                      }}
                      className="min-h-[42px] w-full rounded-lg border border-slate-800 bg-slate-950/75 px-3 text-sm text-slate-100 focus:border-amber-300/60 focus:outline-none"
                    >
                      <option value="All">All Roles</option>
                      <option value="Donor">Donor</option>
                      <option value="Patient/Fundraiser">Patient/Fundraiser</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <select
                      aria-label="Filter users by account status"
                      value={userStateFilter}
                      onChange={(e) => {
                        setUserStateFilter(
                          e.target.value as 'All' | 'Active' | 'Blocked'
                        );
                        setUserPage(1);
                      }}
                      className="min-h-[42px] w-full rounded-lg border border-slate-800 bg-slate-950/75 px-3 text-sm text-slate-100 focus:border-amber-300/60 focus:outline-none"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Active">Active</option>
                      <option value="Blocked">Blocked</option>
                    </select>
                  </div>
                </GlassSurface>

                {pagedUsers.length === 0 ? (
                  <GlassSurface className="flex flex-col items-start gap-3 p-10">
                    <h2 className="font-display text-xl font-semibold text-slate-50">
                      No matching user accounts
                    </h2>
                    <p className="text-sm text-slate-400">
                      Adjust your search text or role filter to view registered demo
                      users.
                    </p>
                  </GlassSurface>
                ) : (
                  <GlassSurface className="overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b vc-hairline text-xs text-slate-400">
                          <tr>
                            <th className="px-5 py-3.5 font-medium">User</th>
                            <th className="px-5 py-3.5 font-medium">Role</th>
                            <th className="px-5 py-3.5 font-medium">Joined</th>
                            <th className="px-5 py-3.5 font-medium">Status</th>
                            <th className="px-5 py-3.5 text-right font-medium">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/70">
                          {pagedUsers.map((acc) => (
                            <tr
                              key={acc.id}
                              className="transition-colors hover:bg-white/[0.02]"
                            >
                              <td className="px-5 py-3.5">
                                <p className="font-medium text-slate-100">
                                  {acc.fullName}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {acc.email}
                                  {acc.location ? ` · ${acc.location}` : ''}
                                </p>
                              </td>
                              <td className="px-5 py-3.5 text-xs text-slate-300">
                                {acc.role}
                              </td>
                              <td className="px-5 py-3.5 font-mono text-xs tabular-nums text-slate-400">
                                {acc.createdAt}
                              </td>
                              <td className="px-5 py-3.5">
                                {acc.blocked ? (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-300">
                                    <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                                    <span>Blocked</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-300">
                                    <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                                    <span>Active</span>
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setInspectUser(acc)}
                                    className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-medium text-sky-300 hover:border-sky-300/50"
                                  >
                                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                                    <span>Profile</span>
                                  </button>
                                  {acc.role !== 'Admin' && (
                                    <button
                                      type="button"
                                      onClick={() => handleRequestToggleBlock(acc)}
                                      className={`inline-flex min-h-[34px] items-center gap-1 rounded-lg px-3 py-1 text-xs font-medium ${
                                        acc.blocked
                                          ? 'border border-teal-400/40 bg-teal-950/30 text-teal-200 hover:bg-teal-950/60'
                                          : 'border border-rose-400/35 bg-rose-950/30 text-rose-200 hover:bg-rose-950/60'
                                      }`}
                                    >
                                      {acc.blocked ? (
                                        <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                                      ) : (
                                        <UserX className="h-3.5 w-3.5" aria-hidden="true" />
                                      )}
                                      <span>{acc.blocked ? 'Unblock' : 'Block'}</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <PaginationBar
                      page={Math.min(userPage, userTotalPages)}
                      totalPages={userTotalPages}
                      totalItems={filteredUsers.length}
                      onPageChange={setUserPage}
                    />
                  </GlassSurface>
                )}
              </div>
            )}

            {/* 4. DONATION MANAGEMENT SECTION */}
            {section === 'donations' && (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                  <div>
                    <p className="text-xs font-medium tracking-[0.14em] text-teal-300">
                      Synchronized Ledger
                    </p>
                    <h1 className="mt-1 font-display text-2xl font-semibold text-slate-50">
                      Donation Management
                    </h1>
                  </div>
                  <div className="font-mono text-xs tabular-nums text-slate-300">
                    Filtered Total:{' '}
                    <span className="font-semibold text-amber-300">
                      {formatINR(
                        filteredDonations.reduce((sum, d) => sum + d.amount, 0)
                      )}
                    </span>
                  </div>
                </div>

                <GlassSurface className="grid gap-3 p-5 md:grid-cols-12">
                  <div className="relative md:col-span-6">
                    <Search
                      className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <input
                      type="search"
                      value={donSearch}
                      onChange={(e) => {
                        setDonSearch(e.target.value);
                        setDonPage(1);
                      }}
                      placeholder="Search donor, campaign, email, or reference ID..."
                      className="min-h-[42px] w-full rounded-lg border border-slate-800 bg-slate-950/75 pr-3.5 pl-10 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-300/60 focus:outline-none"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <select
                      aria-label="Filter donations by payment method"
                      value={donMethod}
                      onChange={(e) => {
                        setDonMethod(e.target.value);
                        setDonPage(1);
                      }}
                      className="min-h-[42px] w-full rounded-lg border border-slate-800 bg-slate-950/75 px-3 text-sm text-slate-100 focus:border-amber-300/60 focus:outline-none"
                    >
                      <option value="All">All Payment Methods</option>
                      <option value="UPI">UPI</option>
                      <option value="Debit/Credit Card">Debit/Credit Card</option>
                      <option value="Net Banking">Net Banking</option>
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <select
                      aria-label="Filter donations by payment status"
                      value={donStatus}
                      onChange={(e) => {
                        setDonStatus(e.target.value);
                        setDonPage(1);
                      }}
                      className="min-h-[42px] w-full rounded-lg border border-slate-800 bg-slate-950/75 px-3 text-sm text-slate-100 focus:border-amber-300/60 focus:outline-none"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Completed">Completed</option>
                      <option value="Pending">Pending</option>
                      <option value="Failed">Failed</option>
                    </select>
                  </div>
                </GlassSurface>

                {pagedDonations.length === 0 ? (
                  <GlassSurface className="p-10 text-sm text-slate-400">
                    No donation transactions match your current filters.
                  </GlassSurface>
                ) : (
                  <GlassSurface className="overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b vc-hairline text-xs text-slate-400">
                          <tr>
                            <th className="px-5 py-3.5 font-medium">Donor</th>
                            <th className="px-5 py-3.5 font-medium">Campaign</th>
                            <th className="px-5 py-3.5 font-medium">Method &amp; Ref</th>
                            <th className="px-5 py-3.5 font-medium">Date</th>
                            <th className="px-5 py-3.5 font-medium">Status</th>
                            <th className="px-5 py-3.5 text-right font-medium">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/70">
                          {pagedDonations.map((d) => (
                            <tr
                              key={d.id}
                              className="transition-colors hover:bg-white/[0.02]"
                            >
                              <td className="px-5 py-3.5">
                                <p className="font-medium text-slate-100">
                                  {d.isAnonymous ? 'Anonymous Donor' : d.donorName}
                                  {d.isAnonymous && (
                                    <span className="ml-1.5 text-[11px] font-normal text-slate-400">
                                      (Publicly Anonymous)
                                    </span>
                                  )}
                                </p>
                                {d.isAnonymous ? (
                                  <p className="text-xs text-slate-500">
                                    Email hidden for anonymous gift
                                  </p>
                                ) : (
                                  d.donorEmail && (
                                    <p className="text-xs text-slate-400">
                                      {d.donorEmail}
                                    </p>
                                  )
                                )}
                              </td>
                              <td className="px-5 py-3.5 max-w-[230px]">
                                <Link
                                  to={`/campaigns/${d.campaignId}`}
                                  className="line-clamp-1 text-xs font-medium text-sky-300 hover:text-amber-200"
                                >
                                  {d.campaignTitle}
                                </Link>
                              </td>
                              <td className="px-5 py-3.5">
                                <p className="text-xs text-slate-200">
                                  {d.paymentMethod || 'UPI'}
                                </p>
                                <p className="font-mono text-[11px] text-slate-400">
                                  {d.transactionRef || d.id.toUpperCase()}
                                </p>
                              </td>
                              <td className="px-5 py-3.5 font-mono text-xs tabular-nums text-slate-400">
                                {d.timestamp.slice(0, 10)}
                              </td>
                              <td className="px-5 py-3.5">
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-300">
                                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span>{d.paymentStatus || 'Completed'}</span>
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-right font-mono font-semibold tabular-nums text-amber-300">
                                {formatINR(d.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <PaginationBar
                      page={Math.min(donPage, donTotalPages)}
                      totalPages={donTotalPages}
                      totalItems={filteredDonations.length}
                      onPageChange={setDonPage}
                    />
                  </GlassSurface>
                )}
              </div>
            )}

            {/* 5. CATEGORY MANAGEMENT SECTION */}
            {section === 'categories' && (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-xs font-medium tracking-[0.14em] text-amber-300">
                      Medical Directory Taxonomy
                    </p>
                    <h1 className="mt-1 font-display text-2xl font-semibold text-slate-50">
                      Category Management
                    </h1>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategory(null);
                      setCatModalOpen(true);
                    }}
                    className="inline-flex min-h-[40px] w-fit items-center gap-2 rounded-lg bg-teal-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-teal-300"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    <span>Add Category</span>
                  </button>
                </div>

                {categories.length === 0 ? (
                  <GlassSurface className="p-10 text-sm text-slate-400">
                    No medical categories defined. Add your first category above.
                  </GlassSurface>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {categories.map((cat) => {
                      const catCampaigns = campaigns.filter(
                        (c) => c.category.toLowerCase() === cat.name.toLowerCase()
                      );
                      const catRaised = catCampaigns.reduce(
                        (s, c) => s + c.raisedAmount,
                        0
                      );
                      const isActive = cat.isActive !== false;
                      const displayLabel = cat.displayTitle || cat.name;
                      return (
                        <GlassSurface
                          key={cat.id}
                          className={`flex flex-col justify-between gap-4 p-6 ${
                            !isActive ? 'opacity-80 border-slate-800/80' : ''
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h2 className="font-display text-xl font-semibold text-slate-50">
                                  {displayLabel}
                                </h2>
                                {displayLabel !== cat.name && (
                                  <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                                    Filter key: {cat.name}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <span
                                  className={`inline-flex items-center gap-1 text-xs font-medium ${
                                    isActive ? 'text-teal-300' : 'text-slate-400'
                                  }`}
                                >
                                  {isActive ? (
                                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                                  ) : (
                                    <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                                  )}
                                  <span>{isActive ? 'Active' : 'Inactive'}</span>
                                </span>
                                <span className="font-mono text-xs tabular-nums text-amber-300">
                                  {catCampaigns.length}{' '}
                                  {catCampaigns.length === 1 ? 'campaign' : 'campaigns'}
                                </span>
                              </div>
                            </div>
                            <p className="mt-2.5 text-xs leading-relaxed text-slate-400">
                              {cat.description}
                            </p>
                            {catCampaigns.length > 0 && (
                              <p className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] text-amber-300/90">
                                <ShieldAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                <span>
                                  In use by {catCampaigns.length}{' '}
                                  {catCampaigns.length === 1 ? 'campaign' : 'campaigns'} — deactivate instead of deleting
                                </span>
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 border-t vc-hairline pt-4">
                            <span className="font-mono text-xs tabular-nums text-teal-300">
                              {formatINR(catRaised)} raised
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const res = toggleCategoryActive(cat.id);
                                  if (res.ok) {
                                    showToast(
                                      'ok',
                                      `${isActive ? 'Deactivated' : 'Activated'} category “${displayLabel}”.`
                                    );
                                  } else {
                                    showToast('err', res.error || 'Could not update category status.');
                                  }
                                }}
                                className={`inline-flex min-h-[34px] items-center gap-1 rounded-lg border px-3 py-1 text-xs font-medium transition-colors ${
                                  isActive
                                    ? 'border-slate-700 bg-slate-900 text-slate-300 hover:border-amber-300/40 hover:text-amber-200'
                                    : 'border-teal-400/40 bg-teal-950/35 text-teal-200 hover:bg-teal-950/60'
                                }`}
                              >
                                {isActive ? (
                                  <>
                                    <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                                    <span>Deactivate</span>
                                  </>
                                ) : (
                                  <>
                                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                                    <span>Activate</span>
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCategory(cat);
                                  setCatModalOpen(true);
                                }}
                                className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-medium text-slate-200 hover:border-amber-300/40"
                              >
                                <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRequestDeleteCategory(cat)}
                                title={
                                  catCampaigns.length > 0
                                    ? 'Cannot delete while campaigns still use this category'
                                    : 'Delete category'
                                }
                                className={`inline-flex min-h-[34px] items-center gap-1 rounded-lg border px-3 py-1 text-xs font-medium ${
                                  catCampaigns.length > 0
                                    ? 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-rose-400/40 hover:text-rose-200'
                                    : 'border-rose-400/35 bg-rose-950/30 text-rose-200 hover:bg-rose-950/60'
                                }`}
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        </GlassSurface>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 6. CONTACT MESSAGES SECTION */}
            {section === 'messages' && (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                  <div>
                    <p className="text-xs font-medium tracking-[0.14em] text-sky-300">
                      Care Liaison Desk Inbox
                    </p>
                    <h1 className="mt-1 font-display text-2xl font-semibold text-slate-50">
                      Contact Messages
                    </h1>
                  </div>
                  <span className="font-mono text-xs tabular-nums text-slate-400">
                    {unreadMessagesCount} unread · {contactMessages.length} total
                  </span>
                </div>

                <GlassSurface className="flex flex-col gap-4 p-5">
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <input
                      type="search"
                      value={msgSearch}
                      onChange={(e) => {
                        setMsgSearch(e.target.value);
                        setMsgPage(1);
                      }}
                      placeholder="Search by sender name, email, subject, or message text..."
                      className="min-h-[42px] w-full rounded-lg border border-slate-800 bg-slate-950/75 pr-3.5 pl-10 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-300/60 focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 border-t vc-hairline pt-3">
                    {(
                      [
                        { id: 'all', label: 'All' },
                        { id: 'unread', label: 'Unread' },
                        { id: 'read', label: 'Read' },
                        { id: 'resolved', label: 'Resolved' },
                      ] as Array<{ id: 'all' | ContactMessage['status']; label: string }>
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          setMsgFilter(tab.id);
                          setMsgPage(1);
                        }}
                        className={`min-h-[36px] rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
                          msgFilter === tab.id
                            ? 'bg-amber-300 font-semibold text-slate-950'
                            : 'border border-slate-800 bg-slate-900/70 text-slate-300 hover:border-sky-300/40'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </GlassSurface>

                {pagedMessages.length === 0 ? (
                  <GlassSurface className="p-10 text-sm text-slate-400">
                    No contact messages match your active filters.
                  </GlassSurface>
                ) : (
                  <GlassSurface className="overflow-hidden">
                    <div className="divide-y divide-slate-800/70">
                      {pagedMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span
                                className={`font-medium capitalize ${
                                  msg.status === 'resolved'
                                    ? 'text-teal-300'
                                    : msg.status === 'read'
                                    ? 'text-sky-300'
                                    : 'text-amber-300'
                                }`}
                              >
                                {msg.status}
                              </span>
                              <span aria-hidden="true" className="text-slate-600">
                                ·
                              </span>
                              <span className="font-medium text-slate-200">
                                {msg.name}
                              </span>
                              <span aria-hidden="true" className="text-slate-600">
                                ·
                              </span>
                              <span className="text-slate-400">{msg.email}</span>
                              <span aria-hidden="true" className="text-slate-600">
                                ·
                              </span>
                              <span className="font-mono text-slate-400 tabular-nums">
                                {msg.createdAt.slice(0, 10)}
                              </span>
                            </div>
                            <h3 className="mt-1 text-sm font-semibold text-slate-50">
                              {msg.subject}
                            </h3>
                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-300/85">
                              {msg.message}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => setInspectMessage(msg)}
                              className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-medium text-sky-300 hover:border-sky-300/50"
                            >
                              <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>View</span>
                            </button>
                            {msg.status === 'unread' && (
                              <button
                                type="button"
                                onClick={() => {
                                  markContactMessageStatus(msg.id, 'read');
                                  showToast('ok', `Marked inquiry from ${msg.name} as read.`);
                                }}
                                className="inline-flex min-h-[34px] items-center rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-medium text-slate-200 hover:border-sky-300/40"
                              >
                                Mark Read
                              </button>
                            )}
                            {msg.status !== 'resolved' && (
                              <button
                                type="button"
                                onClick={() => {
                                  markContactMessageStatus(msg.id, 'resolved');
                                  showToast('ok', `Marked inquiry from ${msg.name} as resolved.`);
                                }}
                                className="inline-flex min-h-[34px] items-center rounded-lg bg-teal-400 px-3 py-1 text-xs font-semibold text-slate-950 hover:bg-teal-300"
                              >
                                Resolve
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRequestDeleteMessage(msg)}
                              aria-label={`Delete message from ${msg.name}`}
                              className="inline-flex min-h-[34px] items-center rounded-lg border border-rose-400/35 bg-rose-950/30 px-2.5 py-1 text-xs text-rose-200 hover:bg-rose-950/60"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <PaginationBar
                      page={Math.min(msgPage, msgTotalPages)}
                      totalPages={msgTotalPages}
                      totalItems={filteredMessages.length}
                      onPageChange={setMsgPage}
                    />
                  </GlassSurface>
                )}
              </div>
            )}

            {/* 7. REPORTS & ANALYTICS SECTION */}
            {section === 'analytics' && (
              <AdminAnalyticsSection
                campaigns={campaigns}
                donations={donations}
                accounts={accounts}
                categories={categories}
              />
            )}

            {/* 8. ADMIN SETTINGS SECTION */}
            {section === 'settings' && (
              <div className="flex flex-col gap-6">
                <div>
                  <p className="text-xs font-medium tracking-[0.14em] text-teal-300">
                    Administrator Profile &amp; Session
                  </p>
                  <h1 className="mt-1 font-display text-2xl font-semibold text-slate-50">
                    Admin Settings
                  </h1>
                </div>

                <GlassSurface className="p-6 sm:p-8">
                  <form
                    onSubmit={handleSaveAdminProfile}
                    noValidate
                    className="flex flex-col gap-5"
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="adm-name" className="text-xs font-medium text-slate-300">
                          Administrator Full Name
                        </label>
                        <input
                          id="adm-name"
                          type="text"
                          value={adminName}
                          onChange={(e) => setAdminName(e.target.value)}
                          className="min-h-[42px] rounded-lg border border-slate-800 bg-slate-950/75 px-3.5 text-sm text-slate-100 focus:border-amber-300/60 focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="adm-email" className="text-xs font-medium text-slate-300">
                          Admin Email
                        </label>
                        <input
                          id="adm-email"
                          type="email"
                          value={adminEmail}
                          onChange={(e) => setAdminEmail(e.target.value)}
                          className="min-h-[42px] rounded-lg border border-slate-800 bg-slate-950/75 px-3.5 text-sm text-slate-100 focus:border-amber-300/60 focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="adm-phone" className="text-xs font-medium text-slate-300">
                          Contact Phone
                        </label>
                        <input
                          id="adm-phone"
                          type="tel"
                          value={adminPhone}
                          onChange={(e) => setAdminPhone(e.target.value)}
                          className="min-h-[42px] rounded-lg border border-slate-800 bg-slate-950/75 px-3.5 font-mono text-sm text-slate-100 focus:border-amber-300/60 focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="adm-loc" className="text-xs font-medium text-slate-300">
                          Operations Office
                        </label>
                        <input
                          id="adm-loc"
                          type="text"
                          value={adminLocation}
                          onChange={(e) => setAdminLocation(e.target.value)}
                          className="min-h-[42px] rounded-lg border border-slate-800 bg-slate-950/75 px-3.5 text-sm text-slate-100 focus:border-amber-300/60 focus:outline-none"
                        />
                      </div>
                    </div>

                    {settingsFeedback && (
                      <p
                        role="status"
                        className={`text-xs ${
                          settingsFeedback.type === 'ok'
                            ? 'text-teal-300'
                            : 'text-rose-300'
                        }`}
                      >
                        {settingsFeedback.text}
                      </p>
                    )}

                    <div>
                      <VidaButton type="submit" variant="primary">
                        Save Admin Profile
                      </VidaButton>
                    </div>
                  </form>
                </GlassSurface>

                <GlassSurface className="flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="font-display text-lg font-semibold text-slate-50">
                      Reset Demo Platform Data
                    </h2>
                    <p className="mt-1 text-xs text-slate-400">
                      Clears test modifications in LocalStorage and restores the
                      initial seeded campaigns, accounts, donations, categories,
                      and inbox inquiries.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmState({
                        open: true,
                        title: 'Reset All Demo Data',
                        description:
                          'Restore all VidaCare LocalStorage records (campaigns, donations, accounts, categories, messages, and notifications) back to initial demo defaults and sign out?',
                        confirmLabel: 'Reset Demo Store',
                        tone: 'danger',
                        action: () => {
                          setConfirmState((prev) => ({ ...prev, open: false }));
                          resetDemoStore();
                          navigate('/login');
                        },
                      })
                    }
                    className="inline-flex min-h-[42px] shrink-0 items-center gap-2 rounded-lg border border-amber-300/40 bg-amber-300/10 px-5 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-300/20"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    <span>Reset Demo Data</span>
                  </button>
                </GlassSurface>

                <GlassSurface className="flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="font-display text-lg font-semibold text-slate-50">
                      End Administrator Session
                    </h2>
                    <p className="mt-1 text-xs text-slate-400">
                      Logs out of the demo Admin Console while preserving shared
                      LocalStorage records.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex min-h-[42px] items-center gap-2 rounded-lg border border-rose-400/40 bg-rose-950/30 px-5 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-950/50"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    <span>Logout</span>
                  </button>
                </GlassSurface>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <CampaignInspectorModal
        campaign={inspectCampaign}
        onClose={() => setInspectCampaign(null)}
        onApprove={handleRequestApprove}
        onReject={(c) => {
          setInspectCampaign(null);
          setRejectTarget(c);
        }}
      />

      <RejectCampaignModal
        campaign={rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirmReject={(campaignId, reason) => {
          const res = rejectCampaign(campaignId, reason);
          if (res.ok) {
            showToast('ok', 'Campaign rejected and creator notified.');
          } else {
            showToast('err', res.error || 'Could not reject campaign.');
          }
        }}
      />

      <UserInspectorModal
        account={inspectUser}
        campaigns={campaigns}
        donations={donations}
        onClose={() => setInspectUser(null)}
        onToggleBlock={handleRequestToggleBlock}
      />

      <CategoryFormModal
        open={catModalOpen}
        editingCategory={editingCategory}
        onClose={() => {
          setCatModalOpen(false);
          setEditingCategory(null);
        }}
        onSave={(name, description, displayTitle, id) => {
          const res = id
            ? updateCategory(id, name, description, displayTitle)
            : addCategory(name, description, displayTitle);
          if (res.ok) {
            showToast(
              'ok',
              id
                ? `Updated category “${displayTitle?.trim() || name}”.`
                : `Added category “${displayTitle?.trim() || name}”.`
            );
          }
          return res;
        }}
      />

      <MessageInspectorModal
        message={inspectMessage}
        onClose={() => setInspectMessage(null)}
        onStatusChange={(id, status) => {
          markContactMessageStatus(id, status);
          showToast('ok', `Message marked as ${status}.`);
        }}
      />

      <ConfirmActionModal
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel={confirmState.confirmLabel}
        tone={confirmState.tone}
        onCancel={() => setConfirmState((prev) => ({ ...prev, open: false }))}
        onConfirm={confirmState.action}
      />

      {verRemarksModal.open && verRemarksModal.request && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setVerRemarksModal({ open: false, request: null, decision: null })}
        >
          <GlassSurface className="w-full max-w-md p-6">
            <div onClick={(e) => e.stopPropagation()} className="flex flex-col gap-4">
              <h3 className="font-display text-lg font-semibold text-slate-100">
                {verRemarksModal.decision === 'Resubmission Required'
                  ? 'Request Verification Resubmission'
                  : 'Reject Verification Request'}
              </h3>
              <p className="text-xs text-slate-400">
                Provide clinical reviewer remarks for {verRemarksModal.request.fullName} (
                {verRemarksModal.request.email}). This note will be recorded in Google Sheets and displayed to the user.
              </p>
              <textarea
                rows={3}
                value={verRemarksInput}
                onChange={(e) => setVerRemarksInput(e.target.value)}
                placeholder="Enter review notes or missing requirement..."
                className="w-full rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-teal-400 focus:outline-none"
              />
              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setVerRemarksModal({ open: false, request: null, decision: null })}
                  className="rounded-lg border border-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleReviewVerification(
                      verRemarksModal.request!,
                      verRemarksModal.decision!,
                      verRemarksInput
                    )
                  }
                  className="rounded-lg bg-teal-400 px-3.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-teal-300"
                >
                  Confirm Decision
                </button>
              </div>
            </div>
          </GlassSurface>
        </div>
      )}
    </section>
  );
};
