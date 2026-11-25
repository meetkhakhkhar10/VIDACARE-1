import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  Bell,
  BookmarkCheck,
  Building2,
  CheckCircle2,
  Clock,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FileCheck2,
  FileText,
  HeartHandshake,
  LayoutDashboard,
  Lock,
  LogOut,
  Megaphone,
  Plus,
  Receipt,
  Repeat,
  RotateCcw,
  Settings,
  ShieldCheck,
  User as UserIcon,
  XCircle,
} from 'lucide-react';
import { useVidaCare } from '../context/VidaCareContext';
import { DonationRecord, MedicalCampaign } from '../types/campaign';
import { calculateProgress, formatINR } from '../lib/format';
import { SafeImage } from '../components/SafeImage';
import {
  CreateFundraiserModal,
  DonationReceiptModal,
  EditCampaignModal,
} from '../components/dashboard/DashboardModals';
import {
  GlassSurface,
  ProgressMeter,
  VidaButton,
} from '../components/ui/DesignPrimitives';

export interface DashboardPageProps {
  portalMode?: 'campaigner' | 'donor';
}

type DashboardSection =
  | 'overview'
  | 'campaigns'
  | 'donations'
  | 'saved'
  | 'updates'
  | 'profile'
  | 'notifications'
  | 'settings';

const AVATAR_PRESETS = [
  '/src/assets/images/campaign_cardiac_care_1795448745364.jpg',
  '/src/assets/images/campaign_neuro_rehab_1795448745124.jpg',
  '/src/assets/images/campaign_oncology_support_1795448744973.jpg',
  '/src/assets/images/campaign_surgical_mission_1795448745169.jpg',
];

function StatusIndicator({ status }: { status: MedicalCampaign['status'] }) {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#159B79]/25 bg-[#DDF3E9] px-2.5 py-0.5 text-xs font-semibold text-[#123C35]">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#159B79]" aria-hidden="true" />
        <span>Approved</span>
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-[8px] border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
        <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>Rejected</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[8px] border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
      <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>Pending Review</span>
    </span>
  );
}

interface RecurringPreference {
  cadence: 'off' | '500' | '1000' | '2500';
  category: string;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ portalMode }) => {
  const {
    campaigns,
    approvedCampaigns,
    donations,
    savedCampaignIds,
    activeCategories,
    notifications,
    user,
    authenticateMock,
    updateUserProfile,
    changeCurrentUserPassword,
    createUserCampaign,
    updateUserCampaign,
    postCampaignUpdate,
    toggleSavedCampaign,
    markNotificationRead,
    markAllNotificationsRead,
    signOutMock,
    resetDemoStore,
    storageError,
    clearStorageError,
  } = useVidaCare();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Determine active portal: explicit route prop -> ?view=fundraiser -> user role
  const activePortal: 'campaigner' | 'donor' = useMemo(() => {
    if (portalMode) return portalMode;
    if (searchParams.get('view') === 'fundraiser') return 'campaigner';
    if (
      user?.role === 'Patient/Fundraiser' ||
      user?.role === 'Care Coordinator'
    ) {
      return 'campaigner';
    }
    return 'donor';
  }, [portalMode, searchParams, user?.role]);

  const [activeSection, setActiveSection] = useState<DashboardSection>('overview');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<MedicalCampaign | null>(null);
  const [receiptDonation, setReceiptDonation] = useState<DonationRecord | null>(null);
  const [confirmDemoReset, setConfirmDemoReset] = useState(false);
  const [notifFilterUnread, setNotifFilterUnread] = useState(false);
  const updateLockRef = useRef(false);

  // Profile form state
  const [profName, setProfName] = useState('');
  const [profEmail, setProfEmail] = useState('');
  const [profPhone, setProfPhone] = useState('');
  const [profLocation, setProfLocation] = useState('');
  const [profAvatar, setProfAvatar] = useState('');
  const [profMsg, setProfMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );

  // Campaign Update composer state
  const [updateCampaignId, setUpdateCampaignId] = useState('');
  const [updateTitle, setUpdateTitle] = useState('');
  const [updateSummary, setUpdateSummary] = useState('');
  const [updateFeedback, setUpdateFeedback] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);

  // Change password state
  const [currPw, setCurrPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwFeedback, setPwFeedback] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);

  // Local Recurring Giving Simulation Preference (Donor Portal)
  const [recurringPref, setRecurringPref] = useState<RecurringPreference>({
    cadence: 'off',
    category: 'All Specialties',
  });
  const [recurringSavedMsg, setRecurringSavedMsg] = useState('');

  useEffect(() => {
    if (user) {
      setProfName(user.fullName || '');
      setProfEmail(user.email || '');
      setProfPhone(user.phone || '');
      setProfLocation(user.location || '');
      setProfAvatar(user.avatarUrl || AVATAR_PRESETS[0]);
      try {
        const raw = window.localStorage.getItem(
          `vidacare_recurring_pref_v1_${user.id}`
        );
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<RecurringPreference>;
          if (parsed.cadence) {
            setRecurringPref({
              cadence: parsed.cadence,
              category: parsed.category || 'All Specialties',
            });
          }
        }
      } catch {
        // Ignore storage read failure
      }
    }
  }, [user]);

  // Support URL deep-links such as ?action=create or ?section=donations
  useEffect(() => {
    if (!user) return;
    const actionParam = searchParams.get('action');
    const sectionParam = searchParams.get('section') as DashboardSection | null;
    const validSections: DashboardSection[] = [
      'overview',
      'campaigns',
      'donations',
      'saved',
      'updates',
      'profile',
      'notifications',
      'settings',
    ];
    let changed = false;
    const nextParams = new URLSearchParams(searchParams);

    if (sectionParam && validSections.includes(sectionParam)) {
      setActiveSection(sectionParam);
      nextParams.delete('section');
      changed = true;
    }
    if (actionParam === 'create') {
      setActiveSection('campaigns');
      setShowCreateModal(true);
      nextParams.delete('action');
      changed = true;
    }
    if (changed) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [user, searchParams, setSearchParams]);

  // Reset portal-specific sections if user switches between Campaigner and Donor portals
  useEffect(() => {
    if (activePortal === 'donor' && activeSection === 'campaigns') {
      setActiveSection('overview');
    } else if (activePortal === 'campaigner' && activeSection === 'saved') {
      setActiveSection('overview');
    }
  }, [activePortal, activeSection]);

  // User-owned campaigns
  const myCampaigns = useMemo(() => {
    if (!user) return [];
    const emailLower = user.email.toLowerCase();
    return campaigns.filter(
      (c) =>
        c.creatorId === user.id ||
        (c.creatorEmail && c.creatorEmail.toLowerCase() === emailLower)
    );
  }, [campaigns, user]);

  const myApprovedCampaigns = useMemo(
    () => myCampaigns.filter((c) => c.status === 'approved'),
    [myCampaigns]
  );

  useEffect(() => {
    if (myApprovedCampaigns.length > 0 && !updateCampaignId) {
      setUpdateCampaignId(myApprovedCampaigns[0].id);
    }
  }, [myApprovedCampaigns, updateCampaignId]);

  // User's donations
  const myDonations = useMemo(() => {
    if (!user) return [];
    const emailLower = user.email.toLowerCase();
    return donations.filter(
      (d) =>
        d.donorId === user.id ||
        (d.donorEmail && d.donorEmail.toLowerCase() === emailLower)
    );
  }, [donations, user]);

  // Saved campaigns
  const savedCampaigns = useMemo(
    () => approvedCampaigns.filter((c) => savedCampaignIds.includes(c.id)),
    [approvedCampaigns, savedCampaignIds]
  );

  // Updates from campaigns the user donated to or saved
  const supportedCampaignIds = useMemo(() => {
    const ids = new Set<string>(savedCampaignIds);
    myDonations.forEach((d) => ids.add(d.campaignId));
    return ids;
  }, [myDonations, savedCampaignIds]);

  const supportedUpdates = useMemo(() => {
    return approvedCampaigns
      .filter((c) => supportedCampaignIds.has(c.id))
      .flatMap((c) =>
        c.updates.map((u) => ({
          ...u,
          campaignId: c.id,
          campaignTitle: c.title,
          hospitalName: c.hospitalName,
        }))
      );
  }, [approvedCampaigns, supportedCampaignIds]);

  // User notifications
  const myNotifications = useMemo(() => {
    if (!user) return [];
    return notifications.filter((n) => n.userId === user.id);
  }, [notifications, user]);

  const visibleNotifications = useMemo(
    () =>
      notifFilterUnread
        ? myNotifications.filter((n) => !n.read)
        : myNotifications,
    [myNotifications, notifFilterUnread]
  );

  const unreadCount = useMemo(
    () => myNotifications.filter((n) => !n.read).length,
    [myNotifications]
  );

  // Metrics
  const totalDonatedAmount = useMemo(
    () => myDonations.reduce((sum, d) => sum + d.amount, 0),
    [myDonations]
  );

  const uniqueSupportedCount = useMemo(
    () => new Set(myDonations.map((d) => d.campaignId)).size,
    [myDonations]
  );

  const tax80GEligibleTotal = useMemo(
    () =>
      myDonations
        .filter((d) => d.wants80GReceipt)
        .reduce((sum, d) => sum + d.amount, 0),
    [myDonations]
  );

  const latestPanOnFile = useMemo(
    () => myDonations.find((d) => d.panNumber)?.panNumber || '',
    [myDonations]
  );

  const totalAmountRaised = useMemo(
    () => myCampaigns.reduce((sum, c) => sum + c.raisedAmount, 0),
    [myCampaigns]
  );

  const totalCampaignSupporters = useMemo(
    () => myCampaigns.reduce((sum, c) => sum + c.donorCount, 0),
    [myCampaigns]
  );

  const pendingCount = useMemo(
    () => myCampaigns.filter((c) => c.status === 'pending').length,
    [myCampaigns]
  );

  const rejectedCount = useMemo(
    () => myCampaigns.filter((c) => c.status === 'rejected').length,
    [myCampaigns]
  );

  // Unauthenticated gate with quick demo sign-in
  if (!user) {
    return (
      <section className="min-h-[calc(100vh-72px)] bg-[#F8FAF7] py-16 sm:py-20">
        <div className="mx-auto max-w-[780px] px-4 sm:px-6 lg:px-8">
          <GlassSurface className="flex flex-col gap-6 p-8 sm:p-12">
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#159B79]">
                Sign In Required
              </p>
              <h1 className="font-display text-3xl font-bold text-[#123C35] sm:text-4xl">
                Access Your VidaCare Portal
              </h1>
              <p className="text-sm leading-relaxed text-[#414846] sm:text-base">
                Sign in to open your Donor Impact Portal or Campaigner Workspace to track
                contributions, tax summaries, medical fundraisers, and hospital milestone
                updates.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <VidaButton to="/login" variant="primary">
                Sign In
              </VidaButton>
              <VidaButton to="/signup" variant="secondary">
                Create Account
              </VidaButton>
            </div>

            <div className="border-t border-[#123C35]/10 pt-6">
              <p className="text-xs font-medium text-[#414846]">
                Explore immediately with a seeded demo profile (LocalStorage):
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() =>
                    authenticateMock('elena@vidacare.org', 'MayaCare@2026', true)
                  }
                  className="inline-flex min-h-[42px] items-center rounded-[10px] border border-[#159B79]/35 bg-[#DDF3E9] px-4 py-2 text-xs font-semibold text-[#123C35] transition-colors hover:bg-[#159B79] hover:text-white"
                >
                  Preview as Elena Alvarez (Campaigner)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    authenticateMock('donor@vidacare.org', 'CareDonor@2026', true)
                  }
                  className="inline-flex min-h-[42px] items-center rounded-[10px] border border-[#123C35]/20 bg-[#F8FAF7] px-4 py-2 text-xs font-semibold text-[#123C35] transition-colors hover:bg-[#123C35] hover:text-white"
                >
                  Preview as Dr. Samuel Vance (Donor)
                </button>
              </div>
            </div>
          </GlassSurface>
        </div>
      </section>
    );
  }

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfMsg(null);
    if (!profName.trim() || !profEmail.includes('@')) {
      setProfMsg({ type: 'err', text: 'Enter a valid full name and email address.' });
      return;
    }
    const res = updateUserProfile({
      fullName: profName,
      email: profEmail,
      phone: profPhone,
      location: profLocation,
      avatarUrl: profAvatar,
    });
    if (!res.ok) {
      setProfMsg({ type: 'err', text: res.error || 'Could not save profile.' });
      return;
    }
    setProfMsg({ type: 'ok', text: 'Profile updated across your workspace.' });
  };

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024 * 1.5) {
      setProfMsg({ type: 'err', text: 'Please select an image under 1.5 MB.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProfAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePostUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (updateLockRef.current) return;
    setUpdateFeedback(null);
    if (!updateCampaignId) {
      setUpdateFeedback({ type: 'err', text: 'Select an approved campaign.' });
      return;
    }
    if (!updateTitle.trim() || !updateSummary.trim()) {
      setUpdateFeedback({
        type: 'err',
        text: 'Please provide both an update title and milestone summary.',
      });
      return;
    }
    updateLockRef.current = true;
    const res = postCampaignUpdate(updateCampaignId, updateTitle, updateSummary);
    window.setTimeout(() => {
      updateLockRef.current = false;
    }, 300);
    if (!res.ok) {
      setUpdateFeedback({ type: 'err', text: res.error || 'Failed to post update.' });
      return;
    }
    setUpdateTitle('');
    setUpdateSummary('');
    setUpdateFeedback({
      type: 'ok',
      text: 'Clinical update published and visible on the public campaign page.',
    });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPwFeedback(null);
    if (!currPw) {
      setPwFeedback({ type: 'err', text: 'Enter your current password.' });
      return;
    }
    if (newPw.length < 8 || !/[A-Za-z]/.test(newPw) || !/\d/.test(newPw)) {
      setPwFeedback({
        type: 'err',
        text: 'New password must be at least 8 characters with letters and numbers.',
      });
      return;
    }
    if (newPw !== confirmPw) {
      setPwFeedback({ type: 'err', text: 'New passwords do not match.' });
      return;
    }
    const res = changeCurrentUserPassword(currPw, newPw);
    if (!res.ok) {
      setPwFeedback({ type: 'err', text: res.error || 'Password update failed.' });
      return;
    }
    setCurrPw('');
    setNewPw('');
    setConfirmPw('');
    setPwFeedback({
      type: 'ok',
      text: 'Demo password updated in shared LocalStorage.',
    });
  };

  const handleSaveRecurringPref = (next: RecurringPreference) => {
    setRecurringPref(next);
    try {
      window.localStorage.setItem(
        `vidacare_recurring_pref_v1_${user.id}`,
        JSON.stringify(next)
      );
      setRecurringSavedMsg('Preference saved locally.');
      window.setTimeout(() => setRecurringSavedMsg(''), 2500);
    } catch {
      setRecurringSavedMsg('Could not persist preference locally.');
    }
  };

  const handleExportContributionCsv = () => {
    if (myDonations.length === 0) return;
    const header = [
      'Receipt Reference',
      'Date',
      'Campaign',
      'Method',
      'Campaign Amount (INR)',
      'Platform Tip (INR)',
      '80G Requested',
      'PAN',
      'Status',
    ];
    const rows = myDonations.map((d) => [
      d.transactionRef || d.id.toUpperCase(),
      d.timestamp.slice(0, 10),
      `"${d.campaignTitle.replace(/"/g, '""')}"`,
      d.paymentMethod || 'UPI',
      String(d.amount),
      String(d.platformTipAmount || 0),
      d.wants80GReceipt ? 'Yes' : 'No',
      d.panNumber || '',
      d.paymentStatus || 'Completed',
    ]);
    const csvContent = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vidacare-contributions-${user.fullName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleLogout = () => {
    signOutMock();
    navigate('/login');
  };

  const navItems: Array<{
    id: DashboardSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> =
    activePortal === 'campaigner'
      ? [
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          {
            id: 'campaigns',
            label: 'My Campaigns',
            icon: HeartHandshake,
            badge: myCampaigns.length > 0 ? myCampaigns.length : undefined,
          },
          { id: 'updates', label: 'Clinical Updates', icon: Megaphone },
          { id: 'donations', label: 'My Contributions', icon: Receipt },
          { id: 'profile', label: 'My Profile', icon: UserIcon },
          {
            id: 'notifications',
            label: 'Notifications',
            icon: Bell,
            badge: unreadCount > 0 ? unreadCount : undefined,
          },
          { id: 'settings', label: 'Account Settings', icon: Settings },
        ]
      : [
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          {
            id: 'donations',
            label: 'Contribution Ledger',
            icon: Receipt,
            badge: myDonations.length > 0 ? myDonations.length : undefined,
          },
          {
            id: 'saved',
            label: 'Saved Campaigns',
            icon: BookmarkCheck,
            badge: savedCampaigns.length > 0 ? savedCampaigns.length : undefined,
          },
          { id: 'updates', label: 'Supported Updates', icon: Megaphone },
          { id: 'profile', label: 'My Profile', icon: UserIcon },
          {
            id: 'notifications',
            label: 'Notifications',
            icon: Bell,
            badge: unreadCount > 0 ? unreadCount : undefined,
          },
          { id: 'settings', label: 'Account Settings', icon: Settings },
        ];

  const userAvatar = user.avatarUrl || AVATAR_PRESETS[0];

  return (
    <section className="min-h-[calc(100vh-72px)] bg-[#F8FAF7] py-8 sm:py-10">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        {/* Top Portal Bar */}
        <div className="mb-6 flex flex-col justify-between gap-4 border-b border-[#123C35]/12 pb-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#159B79]">
              {activePortal === 'campaigner'
                ? 'Campaigner Workspace'
                : 'Donor Impact Portal'}
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold text-[#123C35] sm:text-3xl">
              {activePortal === 'campaigner'
                ? 'Patient Fundraiser Operations'
                : 'Your Healthcare Giving Ledger'}
            </h1>
          </div>

          <div
            role="navigation"
            aria-label="Portal switch"
            className="inline-flex w-fit items-center gap-1 rounded-[10px] border border-[#123C35]/15 bg-white p-1"
          >
            <Link
              to="/dashboard/donor"
              className={`inline-flex min-h-[36px] items-center rounded-[8px] px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                activePortal === 'donor'
                  ? 'bg-[#123C35] text-white'
                  : 'text-[#414846] hover:text-[#123C35]'
              }`}
            >
              Donor Impact Portal
            </Link>
            <Link
              to="/dashboard/campaigner"
              className={`inline-flex min-h-[36px] items-center rounded-[8px] px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                activePortal === 'campaigner'
                  ? 'bg-[#123C35] text-white'
                  : 'text-[#414846] hover:text-[#123C35]'
              }`}
            >
              Campaigner Portal
            </Link>
          </div>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-12">
          {/* Desktop Sidebar Navigation */}
          <aside className="hidden lg:col-span-3 lg:block lg:sticky lg:top-24">
            <GlassSurface className="flex flex-col gap-6 p-5">
              {/* Profile Snapshot */}
              <div className="flex items-center gap-3.5 border-b border-[#123C35]/10 pb-5">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-[#159B79]/35 bg-[#DDF3E9]">
                  <SafeImage
                    src={userAvatar}
                    alt={user.fullName}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#131E1C]">
                    {user.fullName}
                  </p>
                  <p className="truncate text-xs font-medium text-[#159B79]">
                    {user.role}
                  </p>
                </div>
              </div>

              {/* Navigation Links */}
              <nav aria-label="Portal sections" className="flex flex-col gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveSection(item.id)}
                      className={`flex min-h-[42px] w-full items-center justify-between gap-3 rounded-[10px] px-3.5 py-2 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#159B79] ${
                        active
                          ? 'border border-[#159B79]/30 bg-[#DDF3E9] text-[#123C35] font-semibold'
                          : 'border border-transparent text-[#414846] hover:bg-[#F8FAF7] hover:text-[#123C35]'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 truncate">
                        <Icon
                          className={`h-4 w-4 shrink-0 ${
                            active ? 'text-[#159B79]' : 'text-[#414846]'
                          }`}
                          aria-hidden="true"
                        />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {item.badge !== undefined && (
                        <span className="vc-numeric rounded-[6px] bg-[#123C35] px-2 py-0.5 text-[11px] font-semibold text-white">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* Sidebar Quick Actions & Logout */}
              <div className="flex flex-col gap-2.5 border-t border-[#123C35]/10 pt-5">
                {activePortal === 'campaigner' ? (
                  <>
                    <Link
                      to="/start-fundraiser"
                      className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-[10px] bg-[#123C35] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#159B79] whitespace-nowrap"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      <span>Start 6-Step Fundraiser</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(true)}
                      className="inline-flex min-h-[40px] w-full items-center justify-center rounded-[10px] border border-[#123C35]/15 bg-[#F8FAF7] px-3 py-2 text-xs font-semibold text-[#123C35] transition-colors hover:bg-[#DDF3E9] whitespace-nowrap"
                    >
                      Quick Create Modal
                    </button>
                  </>
                ) : (
                  <Link
                    to="/campaigns"
                    className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-[10px] bg-[#123C35] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#159B79] whitespace-nowrap"
                  >
                    <span>Explore Verified Cases</span>
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-1 inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Sign Out</span>
                </button>
              </div>
            </GlassSurface>
          </aside>

          {/* Main Dashboard Viewport */}
          <div className="flex min-w-0 flex-col gap-6 lg:col-span-9">
            {/* Mobile & Tablet Horizontal Navigation */}
            <div className="flex flex-col gap-3 lg:hidden">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-[#159B79]/35 bg-[#DDF3E9]">
                    <SafeImage
                      src={userAvatar}
                      alt={user.fullName}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#131E1C]">
                      {user.fullName}
                    </p>
                    <p className="text-xs font-medium text-[#159B79]">{user.role}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-[10px] border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Sign Out</span>
                </button>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {navItems.map((item) => {
                  const active = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveSection(item.id)}
                      className={`min-h-[38px] rounded-[10px] px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                        active
                          ? 'bg-[#123C35] text-white'
                          : 'border border-[#123C35]/15 bg-white text-[#414846] hover:bg-[#DDF3E9] hover:text-[#123C35]'
                      }`}
                    >
                      {item.label}
                      {item.badge ? ` (${item.badge})` : ''}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Storage Warning Banner */}
            {storageError && (
              <div
                role="alert"
                className="flex items-center justify-between gap-3 rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900"
              >
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
                  <span>{storageError}</span>
                </span>
                <button
                  type="button"
                  onClick={clearStorageError}
                  className="shrink-0 font-semibold text-amber-900 underline-offset-2 hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* 1. OVERVIEW SECTION (CAMPAIGNER OR DONOR) */}
            {activeSection === 'overview' && (
              <div className="flex flex-col gap-6">
                {/* Identity Summary Banner */}
                <GlassSurface className="flex flex-col justify-between gap-6 p-6 sm:flex-row sm:items-center sm:p-7">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-[#159B79]/35 bg-[#DDF3E9]">
                      <SafeImage
                        src={userAvatar}
                        alt={user.fullName}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#159B79]">
                        {user.role}
                      </p>
                      <h2 className="mt-0.5 truncate font-display text-2xl font-bold text-[#123C35]">
                        Welcome back, {user.fullName}
                      </h2>
                      <p className="mt-1 truncate text-xs text-[#414846]">
                        {user.email}
                        {user.location ? ` · ${user.location}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 shrink-0">
                    {activePortal === 'campaigner' ? (
                      <>
                        <VidaButton
                          to="/start-fundraiser"
                          variant="primary"
                          className="min-h-[42px] px-4 py-2 text-xs"
                        >
                          + Start 6-Step Fundraiser
                        </VidaButton>
                        <button
                          type="button"
                          onClick={() => setShowCreateModal(true)}
                          className="inline-flex min-h-[42px] items-center rounded-[10px] border border-[#123C35]/20 bg-[#F8FAF7] px-4 py-2 text-xs font-semibold text-[#123C35] transition-colors hover:bg-[#DDF3E9] whitespace-nowrap"
                        >
                          Quick Modal
                        </button>
                      </>
                    ) : (
                      <>
                        <VidaButton
                          to="/campaigns"
                          variant="primary"
                          className="min-h-[42px] px-4 py-2 text-xs"
                        >
                          Explore Verified Cases
                        </VidaButton>
                        <button
                          type="button"
                          onClick={() => setActiveSection('donations')}
                          className="inline-flex min-h-[42px] items-center rounded-[10px] border border-[#123C35]/20 bg-[#F8FAF7] px-4 py-2 text-xs font-semibold text-[#123C35] transition-colors hover:bg-[#DDF3E9] whitespace-nowrap"
                        >
                          Tax Summary &amp; Ledger
                        </button>
                      </>
                    )}
                  </div>
                </GlassSurface>

                {/* KPI Strip */}
                {activePortal === 'campaigner' ? (
                  <div className="grid gap-5 sm:grid-cols-3">
                    <GlassSurface className="flex flex-col gap-1.5 p-6">
                      <span className="text-xs font-medium text-[#414846]">
                        Total Funds Raised
                      </span>
                      <span className="vc-numeric font-display text-3xl font-bold text-[#123C35]">
                        {formatINR(totalAmountRaised)}
                      </span>
                      <span className="text-xs text-[#414846]">
                        Across {myCampaigns.length}{' '}
                        {myCampaigns.length === 1 ? 'fundraiser' : 'fundraisers'}
                      </span>
                    </GlassSurface>

                    <GlassSurface className="flex flex-col gap-1.5 p-6">
                      <span className="text-xs font-medium text-[#414846]">
                        Campaign Review Status
                      </span>
                      <span className="vc-numeric font-display text-3xl font-bold text-[#159B79]">
                        {myApprovedCampaigns.length} Live
                      </span>
                      <span className="vc-numeric text-xs text-[#414846]">
                        {pendingCount} pending · {rejectedCount} returned
                      </span>
                    </GlassSurface>

                    <GlassSurface className="flex flex-col gap-1.5 p-6">
                      <span className="text-xs font-medium text-[#414846]">
                        Total Supporters
                      </span>
                      <span className="vc-numeric font-display text-3xl font-bold text-[#123C35]">
                        {totalCampaignSupporters}
                      </span>
                      <span className="text-xs text-[#414846]">
                        Donors contributing across your cases
                      </span>
                    </GlassSurface>
                  </div>
                ) : (
                  <div className="grid gap-5 sm:grid-cols-3">
                    <GlassSurface className="flex flex-col gap-1.5 p-6">
                      <span className="text-xs font-medium text-[#414846]">
                        Total Contributed
                      </span>
                      <span className="vc-numeric font-display text-3xl font-bold text-[#123C35]">
                        {formatINR(totalDonatedAmount)}
                      </span>
                      <span className="vc-numeric text-xs text-[#414846]">
                        Across {myDonations.length}{' '}
                        {myDonations.length === 1 ? 'contribution' : 'contributions'}
                      </span>
                    </GlassSurface>

                    <GlassSurface className="flex flex-col gap-1.5 p-6">
                      <span className="text-xs font-medium text-[#414846]">
                        Campaigns Supported
                      </span>
                      <span className="vc-numeric font-display text-3xl font-bold text-[#159B79]">
                        {uniqueSupportedCount}
                      </span>
                      <span className="text-xs text-[#414846]">
                        Patient care plans backed directly
                      </span>
                    </GlassSurface>

                    <GlassSurface className="flex flex-col gap-1.5 p-6">
                      <span className="text-xs font-medium text-[#414846]">
                        Saved Campaigns
                      </span>
                      <span className="vc-numeric font-display text-3xl font-bold text-[#123C35]">
                        {savedCampaigns.length}
                      </span>
                      <span className="text-xs text-[#414846]">
                        Bookmarked for ongoing monitoring
                      </span>
                    </GlassSurface>
                  </div>
                )}

                {/* Campaigner Settlement & Milestone Card OR Donor Recent Receipts */}
                {activePortal === 'campaigner' ? (
                  <div className="grid gap-6 md:grid-cols-2">
                    <GlassSurface className="flex flex-col gap-4 p-6">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-display text-lg font-bold text-[#123C35]">
                          Hospital Settlement &amp; Verification
                        </h3>
                        <button
                          type="button"
                          onClick={() => setActiveSection('campaigns')}
                          className="text-xs font-semibold text-[#159B79] hover:text-[#123C35]"
                        >
                          Manage all
                        </button>
                      </div>

                      {myCampaigns.length === 0 ? (
                        <div className="flex flex-col items-start gap-3">
                          <p className="text-sm text-[#414846]">
                            You haven’t submitted a patient fundraiser yet. Use our 6-step
                            clinical intake to attach hospital estimates and start raising
                            support.
                          </p>
                          <VidaButton
                            to="/start-fundraiser"
                            variant="secondary"
                            className="min-h-[38px] px-4 py-1.5 text-xs"
                          >
                            Launch 6-Step Intake
                          </VidaButton>
                        </div>
                      ) : (
                        <div className="flex flex-col divide-y divide-[#123C35]/10">
                          {myCampaigns.slice(0, 2).map((c) => {
                            const pct = calculateProgress(c.raisedAmount, c.goalAmount);
                            return (
                              <div key={c.id} className="flex flex-col gap-2.5 py-4 first:pt-0 last:pb-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-[#131E1C]">
                                      {c.title}
                                    </p>
                                    <p className="mt-0.5 text-xs text-[#414846]">
                                      {c.hospitalName} · {c.settlementPreference || 'Direct Hospital Billing'}
                                    </p>
                                  </div>
                                  <StatusIndicator status={c.status} />
                                </div>
                                <ProgressMeter value={pct} />
                                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#414846]">
                                  <span className="vc-numeric font-medium text-[#131E1C]">
                                    {formatINR(c.raisedAmount)} of {formatINR(c.goalAmount)} ({pct}%)
                                  </span>
                                  <span>
                                    {c.hospitalVerified
                                      ? 'Hospital Verified'
                                      : c.status === 'approved'
                                      ? 'Platform Approved'
                                      : `${c.documents?.length || 0} docs attached`}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </GlassSurface>

                    <GlassSurface className="flex flex-col gap-4 p-6">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-display text-lg font-bold text-[#123C35]">
                          Recent Activity &amp; Review Alerts
                        </h3>
                        <button
                          type="button"
                          onClick={() => setActiveSection('notifications')}
                          className="text-xs font-semibold text-[#159B79] hover:text-[#123C35]"
                        >
                          View all
                        </button>
                      </div>
                      {myNotifications.length === 0 ? (
                        <p className="text-sm text-[#414846]">
                          No recent review alerts or donation notifications.
                        </p>
                      ) : (
                        <div className="flex flex-col divide-y divide-[#123C35]/10">
                          {myNotifications.slice(0, 3).map((notif) => (
                            <div key={notif.id} className="py-3 first:pt-0 last:pb-0">
                              <p className="text-xs font-semibold text-[#131E1C]">
                                {notif.title}
                              </p>
                              <p className="mt-1 text-xs leading-relaxed text-[#414846]">
                                {notif.message}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </GlassSurface>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    <GlassSurface className="flex flex-col gap-4 p-6">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-display text-lg font-bold text-[#123C35]">
                          Recent Contributions
                        </h3>
                        <button
                          type="button"
                          onClick={() => setActiveSection('donations')}
                          className="text-xs font-semibold text-[#159B79] hover:text-[#123C35]"
                        >
                          Full ledger
                        </button>
                      </div>
                      {myDonations.length === 0 ? (
                        <div className="flex flex-col items-start gap-3">
                          <p className="text-sm text-[#414846]">
                            You haven’t made a contribution with this account yet.
                          </p>
                          <VidaButton
                            to="/campaigns"
                            variant="secondary"
                            className="min-h-[38px] px-4 py-1.5 text-xs"
                          >
                            Browse Patient Cases
                          </VidaButton>
                        </div>
                      ) : (
                        <div className="flex flex-col divide-y divide-[#123C35]/10">
                          {myDonations.slice(0, 3).map((d) => (
                            <div
                              key={d.id}
                              className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                            >
                              <div className="min-w-0">
                                <Link
                                  to={`/campaigns/${d.campaignId}`}
                                  className="block truncate text-xs font-semibold text-[#123C35] hover:text-[#159B79]"
                                >
                                  {d.campaignTitle}
                                </Link>
                                <p className="vc-numeric mt-0.5 text-[11px] text-[#414846]">
                                  {d.timestamp.slice(0, 10)} · {d.paymentMethod || 'UPI'}
                                </p>
                              </div>
                              <div className="flex items-center gap-2.5 shrink-0">
                                <span className="vc-numeric text-xs font-semibold text-[#123C35]">
                                  {formatINR(d.amount)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setReceiptDonation(d)}
                                  className="rounded-[8px] border border-[#123C35]/18 bg-[#F8FAF7] px-2.5 py-1 text-[11px] font-semibold text-[#123C35] hover:bg-[#DDF3E9]"
                                >
                                  Receipt
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </GlassSurface>

                    <GlassSurface className="flex flex-col gap-4 p-6">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-display text-lg font-bold text-[#123C35]">
                          Bookmarked Campaigns
                        </h3>
                        <button
                          type="button"
                          onClick={() => setActiveSection('saved')}
                          className="text-xs font-semibold text-[#159B79] hover:text-[#123C35]"
                        >
                          Manage saved
                        </button>
                      </div>
                      {savedCampaigns.length === 0 ? (
                        <p className="text-sm text-[#414846]">
                          Bookmark any patient campaign from the directory to monitor
                          hospital progress updates here.
                        </p>
                      ) : (
                        <div className="flex flex-col divide-y divide-[#123C35]/10">
                          {savedCampaigns.slice(0, 2).map((c) => {
                            const pct = calculateProgress(c.raisedAmount, c.goalAmount);
                            return (
                              <div
                                key={c.id}
                                className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <Link
                                    to={`/campaigns/${c.id}`}
                                    className="truncate text-xs font-semibold text-[#123C35] hover:text-[#159B79]"
                                  >
                                    {c.title}
                                  </Link>
                                  <span className="vc-numeric shrink-0 text-xs font-semibold text-[#159B79]">
                                    {pct}%
                                  </span>
                                </div>
                                <ProgressMeter value={pct} />
                                <p className="vc-numeric text-[11px] text-[#414846]">
                                  {formatINR(c.raisedAmount)} raised of{' '}
                                  {formatINR(c.goalAmount)}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </GlassSurface>
                  </div>
                )}
              </div>
            )}

            {/* 2. MY CAMPAIGNS SECTION (CAMPAIGNER PORTAL) */}
            {activeSection === 'campaigns' && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#159B79]">
                      Fundraiser Management
                    </p>
                    <h2 className="mt-1 font-display text-2xl font-bold text-[#123C35]">
                      My Medical Campaigns
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    <VidaButton
                      to="/start-fundraiser"
                      variant="primary"
                      className="min-h-[40px] px-4 py-2 text-xs"
                    >
                      + 6-Step Fundraiser
                    </VidaButton>
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(true)}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-[10px] border border-[#123C35]/20 bg-white px-4 py-2 text-xs font-semibold text-[#123C35] transition-colors hover:bg-[#DDF3E9]"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Quick Modal</span>
                    </button>
                  </div>
                </div>

                {myCampaigns.length === 0 ? (
                  <GlassSurface className="flex flex-col items-start gap-3 p-10">
                    <h3 className="font-display text-xl font-bold text-[#123C35]">
                      No campaigns created yet
                    </h3>
                    <p className="max-w-md text-sm text-[#414846]">
                      Launch a clinical-review medical fundraiser with hospital cost
                      estimates and settlement details.
                    </p>
                    <VidaButton to="/start-fundraiser" variant="primary" className="mt-1">
                      Start 6-Step Fundraiser
                    </VidaButton>
                  </GlassSurface>
                ) : (
                  <div className="flex flex-col gap-4">
                    {myCampaigns.map((c) => {
                      const pct = calculateProgress(c.raisedAmount, c.goalAmount);
                      const canEdit = c.status === 'approved' || c.status === 'pending';
                      return (
                        <GlassSurface key={c.id} className="p-6">
                          <div className="flex flex-col gap-5 md:flex-row md:items-center">
                            <div className="h-28 w-full shrink-0 overflow-hidden rounded-[12px] border border-[#123C35]/10 bg-[#DDF3E9] md:w-44">
                              <SafeImage
                                src={c.imageUrl}
                                alt={c.title}
                                className="h-full w-full object-cover"
                              />
                            </div>

                            <div className="flex min-w-0 flex-1 flex-col gap-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <StatusIndicator status={c.status} />
                                <span className="vc-numeric text-xs text-[#414846]">
                                  Submitted {c.createdAt}
                                </span>
                              </div>

                              <div>
                                <h3 className="font-display text-xl font-bold text-[#123C35]">
                                  {c.title}
                                </h3>
                                <p className="mt-0.5 text-xs text-[#414846]">
                                  {c.patientName} · {c.condition} · {c.hospitalName}
                                </p>
                              </div>

                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#414846]">
                                <span className="inline-flex items-center gap-1.5">
                                  <Building2
                                    className="h-3.5 w-3.5 text-[#159B79]"
                                    aria-hidden="true"
                                  />
                                  <span>
                                    {c.settlementPreference || 'Direct Hospital Billing'}
                                  </span>
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                  <FileText
                                    className="h-3.5 w-3.5 text-[#159B79]"
                                    aria-hidden="true"
                                  />
                                  <span className="vc-numeric">
                                    {c.documents?.length || 0} clinical documents
                                  </span>
                                </span>
                              </div>

                              {c.rejectionReason && (
                                <p
                                  className={`rounded-[10px] border p-3 text-xs ${
                                    c.status === 'rejected'
                                      ? 'border-red-200 bg-red-50 text-red-800'
                                      : 'border-amber-200 bg-amber-50 text-amber-900'
                                  }`}
                                >
                                  Review note: {c.rejectionReason}
                                </p>
                              )}

                              <div className="flex flex-col gap-2">
                                <ProgressMeter value={pct} />
                                <div className="vc-numeric flex flex-wrap items-center justify-between gap-2 text-xs">
                                  <span className="font-medium text-[#131E1C]">
                                    {formatINR(c.raisedAmount)} raised of{' '}
                                    {formatINR(c.goalAmount)}
                                  </span>
                                  <span className="font-semibold text-[#159B79]">
                                    {pct}% · {c.donorCount} donors
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex shrink-0 flex-row gap-2.5 md:flex-col">
                              {c.status === 'approved' && (
                                <Link
                                  to={`/campaigns/${c.id}`}
                                  className="inline-flex min-h-[38px] items-center justify-center rounded-[10px] border border-[#159B79]/35 bg-[#DDF3E9] px-4 py-1.5 text-xs font-semibold text-[#123C35] transition-colors hover:bg-[#159B79] hover:text-white whitespace-nowrap"
                                >
                                  View Public
                                </Link>
                              )}
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => setEditingCampaign(c)}
                                  className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-[10px] border border-[#123C35]/20 bg-[#F8FAF7] px-4 py-1.5 text-xs font-semibold text-[#123C35] transition-colors hover:bg-[#DDF3E9]"
                                >
                                  <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span>Edit</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </GlassSurface>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 3. CONTRIBUTION LEDGER & 80G TAX SUMMARY */}
            {activeSection === 'donations' && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#159B79]">
                      Contribution Ledger
                    </p>
                    <h2 className="mt-1 font-display text-2xl font-bold text-[#123C35]">
                      Donations &amp; Receipts
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {myDonations.length > 0 && (
                      <button
                        type="button"
                        onClick={handleExportContributionCsv}
                        className="inline-flex min-h-[40px] items-center gap-2 rounded-[10px] border border-[#123C35]/20 bg-white px-4 py-2 text-xs font-semibold text-[#123C35] transition-colors hover:bg-[#DDF3E9]"
                      >
                        <Download className="h-3.5 w-3.5 text-[#159B79]" aria-hidden="true" />
                        <span>Export CSV</span>
                      </button>
                    )}
                    <VidaButton
                      to="/campaigns"
                      variant="secondary"
                      className="min-h-[40px] px-4 py-2 text-xs"
                    >
                      Explore Cases
                    </VidaButton>
                  </div>
                </div>

                {myDonations.length === 0 ? (
                  <GlassSurface className="flex flex-col items-start gap-3 p-10">
                    <h3 className="font-display text-xl font-bold text-[#123C35]">
                      No contributions recorded yet
                    </h3>
                    <p className="max-w-md text-sm text-[#414846]">
                      Contributions made while signed in (or matching your account email)
                      appear here with printable receipts and tax summaries.
                    </p>
                    <VidaButton to="/campaigns" variant="primary">
                      Explore Patient Campaigns
                    </VidaButton>
                  </GlassSurface>
                ) : (
                  <GlassSurface className="overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b border-[#123C35]/10 bg-[#F8FAF7] text-xs text-[#414846]">
                          <tr>
                            <th className="px-6 py-3.5 font-semibold">Campaign</th>
                            <th className="px-6 py-3.5 font-semibold">Date</th>
                            <th className="px-6 py-3.5 font-semibold">Rail</th>
                            <th className="px-6 py-3.5 font-semibold">Status</th>
                            <th className="px-6 py-3.5 text-right font-semibold">Amount</th>
                            <th className="px-6 py-3.5 text-right font-semibold">Receipt</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#123C35]/10">
                          {myDonations.map((d) => (
                            <tr
                              key={d.id}
                              className="transition-colors hover:bg-[#F8FAF7]"
                            >
                              <td className="px-6 py-4">
                                <Link
                                  to={`/campaigns/${d.campaignId}`}
                                  className="font-semibold text-[#123C35] hover:text-[#159B79]"
                                >
                                  {d.campaignTitle}
                                </Link>
                                <p className="mt-0.5 text-[11px] text-[#414846]">
                                  {d.isAnonymous ? 'Anonymous public listing' : 'Public donor wall'}
                                  {d.wants80GReceipt ? ' · 80G requested' : ''}
                                </p>
                              </td>
                              <td className="vc-numeric px-6 py-4 text-xs text-[#414846]">
                                {d.timestamp.slice(0, 10)}
                              </td>
                              <td className="px-6 py-4 text-xs text-[#414846]">
                                {d.paymentMethod || 'UPI'}
                              </td>
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#DDF3E9] px-2.5 py-0.5 text-xs font-semibold text-[#123C35]">
                                  <ShieldCheck
                                    className="h-3.5 w-3.5 text-[#159B79]"
                                    aria-hidden="true"
                                  />
                                  <span>{d.paymentStatus || 'Completed'}</span>
                                </span>
                              </td>
                              <td className="vc-numeric px-6 py-4 text-right font-semibold text-[#123C35]">
                                {formatINR(d.amount)}
                                {Boolean(d.platformTipAmount && d.platformTipAmount > 0) && (
                                  <span className="block text-[11px] font-normal text-[#414846]">
                                    +{formatINR(d.platformTipAmount || 0)} tip
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => setReceiptDonation(d)}
                                  className="inline-flex min-h-[34px] items-center gap-1.5 rounded-[8px] border border-[#123C35]/20 bg-[#F8FAF7] px-3 py-1 text-xs font-semibold text-[#123C35] transition-colors hover:bg-[#DDF3E9]"
                                >
                                  <FileCheck2
                                    className="h-3.5 w-3.5 text-[#159B79]"
                                    aria-hidden="true"
                                  />
                                  <span>Receipt</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </GlassSurface>
                )}

                {/* 80G Annual Summary + Recurring Giving Preference (Donor Simulation Tools) */}
                <div className="grid gap-6 md:grid-cols-2">
                  <GlassSurface className="flex flex-col justify-between gap-4 p-6">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-display text-lg font-bold text-[#123C35]">
                          80G Annual Tax Summary
                        </h3>
                        <span className="text-[11px] font-medium text-[#414846]">
                          Demo Preview
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-[#414846]">
                        Tracks contributions flagged for 80G tax receipt generation during
                        checkout. Individual certificates depend on verified charitable trust
                        eligibility.
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-3 border-t border-[#123C35]/10 pt-3">
                        <div>
                          <p className="text-[11px] text-[#414846]">80G Flagged Total</p>
                          <p className="vc-numeric mt-0.5 text-lg font-bold text-[#123C35]">
                            {formatINR(tax80GEligibleTotal)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-[#414846]">PAN on Latest Request</p>
                          <p className="vc-numeric mt-0.5 text-sm font-semibold text-[#131E1C]">
                            {latestPanOnFile || 'Not provided'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {myDonations.length > 0 && (
                      <div className="flex flex-wrap gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            setReceiptDonation(
                              myDonations.find((d) => d.wants80GReceipt) || myDonations[0]
                            )
                          }
                          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-[10px] border border-[#159B79]/35 bg-[#DDF3E9] px-3.5 py-1.5 text-xs font-semibold text-[#123C35] hover:bg-[#159B79] hover:text-white"
                        >
                          <FileCheck2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Open Printable Receipt</span>
                        </button>
                      </div>
                    )}
                  </GlassSurface>

                  <GlassSurface className="flex flex-col justify-between gap-4 p-6">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-[#123C35]">
                          <Repeat className="h-4 w-4 text-[#159B79]" aria-hidden="true" />
                          <span>Recurring Giving Preference</span>
                        </h3>
                        <span className="text-[11px] font-medium text-[#414846]">
                          Local Demo Setting
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-[#414846]">
                        Set your preferred monthly medical support cadence and specialty
                        focus. Saved locally—no real bank mandate is created.
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {(
                          [
                            { id: 'off', label: 'Paused' },
                            { id: '500', label: '₹500 / mo' },
                            { id: '1000', label: '₹1,000 / mo' },
                            { id: '2500', label: '₹2,500 / mo' },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() =>
                              handleSaveRecurringPref({
                                ...recurringPref,
                                cadence: opt.id,
                              })
                            }
                            className={`vc-numeric min-h-[34px] rounded-[8px] border px-3 py-1 text-xs font-semibold transition-colors ${
                              recurringPref.cadence === opt.id
                                ? 'border-[#123C35] bg-[#123C35] text-white'
                                : 'border-[#123C35]/18 bg-[#F8FAF7] text-[#123C35] hover:bg-[#DDF3E9]'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="donor-recurring-cat"
                          className="text-xs font-semibold text-[#131E1C]"
                        >
                          Preferred Care Specialty
                        </label>
                        <select
                          id="donor-recurring-cat"
                          value={recurringPref.category}
                          onChange={(e) =>
                            handleSaveRecurringPref({
                              ...recurringPref,
                              category: e.target.value,
                            })
                          }
                          className="vc-input"
                        >
                          <option value="All Specialties">All Medical Specialties</option>
                          {activeCategories.map((cat) => (
                            <option key={cat.id} value={cat.name}>
                              {cat.displayTitle || cat.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {recurringSavedMsg && (
                      <p role="status" className="text-xs font-medium text-[#159B79]">
                        {recurringSavedMsg}
                      </p>
                    )}
                  </GlassSurface>
                </div>
              </div>
            )}

            {/* 4. SAVED CAMPAIGNS SECTION (DONOR PORTAL) */}
            {activeSection === 'saved' && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#159B79]">
                      Watchlist
                    </p>
                    <h2 className="mt-1 font-display text-2xl font-bold text-[#123C35]">
                      Saved Campaigns
                    </h2>
                  </div>
                  <VidaButton
                    to="/campaigns"
                    variant="secondary"
                    className="min-h-[40px] px-4 py-2 text-xs"
                  >
                    Browse All Cases
                  </VidaButton>
                </div>

                {savedCampaigns.length === 0 ? (
                  <GlassSurface className="flex flex-col items-start gap-3 p-10">
                    <h3 className="font-display text-xl font-bold text-[#123C35]">
                      No saved fundraisers yet
                    </h3>
                    <p className="max-w-md text-sm text-[#414846]">
                      Use the bookmark icon on any campaign card to keep track of a
                      patient’s funding progress and hospital updates.
                    </p>
                    <VidaButton to="/campaigns" variant="primary">
                      Explore Campaigns
                    </VidaButton>
                  </GlassSurface>
                ) : (
                  <div className="grid gap-5 md:grid-cols-2">
                    {savedCampaigns.map((c) => {
                      const pct = calculateProgress(c.raisedAmount, c.goalAmount);
                      return (
                        <GlassSurface key={c.id} className="flex flex-col justify-between gap-4 p-5">
                          <div className="flex gap-4">
                            <div className="h-20 w-24 shrink-0 overflow-hidden rounded-[10px] border border-[#123C35]/10 bg-[#DDF3E9]">
                              <SafeImage
                                src={c.imageUrl}
                                alt={c.title}
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-medium text-[#159B79]">
                                {c.category} · {c.location}
                              </p>
                              <Link
                                to={`/campaigns/${c.id}`}
                                className="mt-0.5 block font-display text-base font-bold text-[#123C35] hover:text-[#159B79]"
                              >
                                {c.title}
                              </Link>
                              <p className="mt-0.5 truncate text-xs text-[#414846]">
                                {c.hospitalName}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <ProgressMeter value={pct} />
                            <div className="vc-numeric flex justify-between text-xs text-[#414846]">
                              <span className="font-semibold text-[#131E1C]">
                                {formatINR(c.raisedAmount)} raised
                              </span>
                              <span>Goal: {formatINR(c.goalAmount)}</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#123C35]/10 pt-3">
                            <div className="flex gap-2">
                              <VidaButton
                                to={`/donate/${c.id}`}
                                variant="primary"
                                className="min-h-[36px] px-3.5 py-1.5 text-xs"
                              >
                                Donate Now
                              </VidaButton>
                              <Link
                                to={`/campaigns/${c.id}`}
                                className="inline-flex min-h-[36px] items-center rounded-[10px] border border-[#123C35]/18 bg-[#F8FAF7] px-3 py-1.5 text-xs font-semibold text-[#123C35] hover:bg-[#DDF3E9]"
                              >
                                View Case
                              </Link>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleSavedCampaign(c.id)}
                              className="text-xs font-medium text-[#414846] hover:text-red-700"
                            >
                              Remove
                            </button>
                          </div>
                        </GlassSurface>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 5. CAMPAIGN UPDATES SECTION (COMPOSER IN CAMPAIGNER / FEED IN DONOR) */}
            {activeSection === 'updates' && activePortal === 'campaigner' && (
              <div className="flex flex-col gap-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#159B79]">
                    Supporter Communication
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-bold text-[#123C35]">
                    Post Clinical Milestone Updates
                  </h2>
                </div>

                {myApprovedCampaigns.length === 0 ? (
                  <GlassSurface className="flex flex-col items-start gap-3 p-10">
                    <h3 className="font-display text-xl font-bold text-[#123C35]">
                      No approved campaigns available for updates
                    </h3>
                    <p className="max-w-md text-sm text-[#414846]">
                      Only approved fundraisers can publish milestone updates to
                      supporters. Check My Campaigns to monitor pending reviews.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveSection('campaigns')}
                      className="mt-1 rounded-[10px] border border-[#123C35]/20 bg-[#F8FAF7] px-4 py-2 text-xs font-semibold text-[#123C35] transition-colors hover:bg-[#DDF3E9]"
                    >
                      Go to My Campaigns
                    </button>
                  </GlassSurface>
                ) : (
                  <>
                    <GlassSurface className="p-6 sm:p-8">
                      <form
                        onSubmit={handlePostUpdate}
                        noValidate
                        className="flex flex-col gap-4"
                      >
                        <div className="flex flex-col gap-1.5">
                          <label
                            htmlFor="upd-campaign"
                            className="text-xs font-semibold text-[#131E1C]"
                          >
                            Select Approved Campaign
                          </label>
                          <select
                            id="upd-campaign"
                            value={updateCampaignId}
                            onChange={(e) => setUpdateCampaignId(e.target.value)}
                            className="vc-input"
                          >
                            {myApprovedCampaigns.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.title}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label
                            htmlFor="upd-title"
                            className="text-xs font-semibold text-[#131E1C]"
                          >
                            Update Headline
                          </label>
                          <input
                            id="upd-title"
                            type="text"
                            value={updateTitle}
                            onChange={(e) => setUpdateTitle(e.target.value)}
                            placeholder="e.g., Post-surgical milestone cleared by care team"
                            className="vc-input"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label
                            htmlFor="upd-summary"
                            className="text-xs font-semibold text-[#131E1C]"
                          >
                            Patient Progress Details
                          </label>
                          <textarea
                            id="upd-summary"
                            rows={4}
                            value={updateSummary}
                            onChange={(e) => setUpdateSummary(e.target.value)}
                            placeholder="Share clear hospital updates with your supporters..."
                            className="vc-input py-3"
                          />
                        </div>

                        {updateFeedback && (
                          <p
                            role="status"
                            className={`text-xs font-medium ${
                              updateFeedback.type === 'ok'
                                ? 'text-[#159B79]'
                                : 'text-red-700'
                            }`}
                          >
                            {updateFeedback.text}
                          </p>
                        )}

                        <div>
                          <VidaButton type="submit" variant="primary">
                            Publish Update
                          </VidaButton>
                        </div>
                      </form>
                    </GlassSurface>

                    <GlassSurface className="flex flex-col gap-4 p-6 sm:p-8">
                      <h3 className="font-display text-xl font-bold text-[#123C35]">
                        Published Updates
                      </h3>
                      {myApprovedCampaigns.flatMap((c) => c.updates).length === 0 ? (
                        <p className="text-sm text-[#414846]">
                          No clinical updates published yet.
                        </p>
                      ) : (
                        <div className="flex flex-col divide-y divide-[#123C35]/10">
                          {myApprovedCampaigns.flatMap((c) =>
                            c.updates.map((u) => (
                              <div key={u.id} className="py-4 first:pt-0 last:pb-0">
                                <div className="flex flex-wrap items-center gap-2 text-xs text-[#414846]">
                                  <span className="vc-numeric font-medium text-[#123C35]">
                                    {u.date}
                                  </span>
                                  <span aria-hidden="true">·</span>
                                  <span className="font-medium text-[#159B79]">{c.title}</span>
                                </div>
                                <h4 className="mt-1 text-sm font-semibold text-[#131E1C]">
                                  {u.title}
                                </h4>
                                <p className="mt-1 text-xs leading-relaxed text-[#414846]">
                                  {u.summary}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </GlassSurface>
                  </>
                )}
              </div>
            )}

            {activeSection === 'updates' && activePortal === 'donor' && (
              <div className="flex flex-col gap-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#159B79]">
                    Bedside Progress
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-bold text-[#123C35]">
                    Updates from Supported &amp; Saved Campaigns
                  </h2>
                </div>

                {supportedUpdates.length === 0 ? (
                  <GlassSurface className="flex flex-col items-start gap-3 p-10">
                    <h3 className="font-display text-xl font-bold text-[#123C35]">
                      No supported campaign updates yet
                    </h3>
                    <p className="max-w-md text-sm text-[#414846]">
                      When you contribute to or bookmark a patient campaign, all hospital
                      and recovery milestones posted by the family appear here.
                    </p>
                    <VidaButton to="/campaigns" variant="primary">
                      Explore Verified Cases
                    </VidaButton>
                  </GlassSurface>
                ) : (
                  <GlassSurface className="divide-y divide-[#123C35]/10 p-6 sm:p-8">
                    {supportedUpdates.map((item) => (
                      <div key={item.id} className="py-5 first:pt-0 last:pb-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Link
                            to={`/campaigns/${item.campaignId}`}
                            className="text-xs font-semibold text-[#159B79] hover:text-[#123C35]"
                          >
                            {item.campaignTitle}
                          </Link>
                          <span className="vc-numeric text-xs text-[#414846]">
                            {item.date}
                          </span>
                        </div>
                        <h3 className="mt-1.5 font-display text-lg font-bold text-[#123C35]">
                          {item.title}
                        </h3>
                        <p className="mt-1 text-sm leading-relaxed text-[#414846]">
                          {item.summary}
                        </p>
                        <p className="mt-2 text-xs text-[#414846]">
                          {item.hospitalName} · Posted by {item.author}
                        </p>
                      </div>
                    ))}
                  </GlassSurface>
                )}
              </div>
            )}

            {/* 6. MY PROFILE SECTION */}
            {activeSection === 'profile' && (
              <GlassSurface className="flex flex-col gap-6 p-6 sm:p-8">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#159B79]">
                    Personal Information
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-bold text-[#123C35]">
                    My Profile
                  </h2>
                </div>

                <form onSubmit={handleSaveProfile} noValidate className="flex flex-col gap-6">
                  <div className="flex flex-col gap-4 border-b border-[#123C35]/10 pb-6 sm:flex-row sm:items-center">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-[#159B79]/35 bg-[#DDF3E9]">
                      <SafeImage
                        src={profAvatar}
                        alt={profName || user.fullName}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col gap-2.5">
                      <p className="text-xs font-medium text-[#414846]">
                        Profile Photo (Upload local file or pick preset)
                      </p>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <label className="inline-flex min-h-[38px] cursor-pointer items-center rounded-[10px] border border-[#123C35]/20 bg-[#F8FAF7] px-3.5 py-1.5 text-xs font-semibold text-[#123C35] transition-colors hover:bg-[#DDF3E9]">
                          <span>Upload Image</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarFileUpload}
                            className="sr-only"
                          />
                        </label>
                        {AVATAR_PRESETS.map((preset, idx) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setProfAvatar(preset)}
                            aria-label={`Select preset portrait ${idx + 1}`}
                            className={`h-9 w-9 overflow-hidden rounded-full border-2 transition-transform hover:scale-105 ${
                              profAvatar === preset
                                ? 'border-[#159B79] ring-2 ring-[#159B79]/25'
                                : 'border-[#123C35]/20'
                            }`}
                          >
                            <SafeImage
                              src={preset}
                              alt={`Preset ${idx + 1}`}
                              className="h-full w-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="prof-name" className="text-xs font-semibold text-[#131E1C]">
                        Full Name
                      </label>
                      <input
                        id="prof-name"
                        type="text"
                        value={profName}
                        onChange={(e) => setProfName(e.target.value)}
                        className="vc-input"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="prof-email" className="text-xs font-semibold text-[#131E1C]">
                        Email Address
                      </label>
                      <input
                        id="prof-email"
                        type="email"
                        value={profEmail}
                        onChange={(e) => setProfEmail(e.target.value)}
                        className="vc-input"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="prof-phone" className="text-xs font-semibold text-[#131E1C]">
                        Mobile Number
                      </label>
                      <input
                        id="prof-phone"
                        type="tel"
                        value={profPhone}
                        onChange={(e) => setProfPhone(e.target.value)}
                        className="vc-input vc-numeric"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="prof-loc" className="text-xs font-semibold text-[#131E1C]">
                        Location
                      </label>
                      <input
                        id="prof-loc"
                        type="text"
                        value={profLocation}
                        onChange={(e) => setProfLocation(e.target.value)}
                        placeholder="City, State"
                        className="vc-input"
                      />
                    </div>
                  </div>

                  {profMsg && (
                    <p
                      role="status"
                      className={`text-xs font-medium ${
                        profMsg.type === 'ok' ? 'text-[#159B79]' : 'text-red-700'
                      }`}
                    >
                      {profMsg.text}
                    </p>
                  )}

                  <div>
                    <VidaButton type="submit" variant="primary">
                      Save Profile
                    </VidaButton>
                  </div>
                </form>
              </GlassSurface>
            )}

            {/* 7. NOTIFICATIONS SECTION */}
            {activeSection === 'notifications' && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#159B79]">
                      Inbox &amp; Review Alerts
                    </p>
                    <h2 className="mt-1 font-display text-2xl font-bold text-[#123C35]">
                      Notifications
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setNotifFilterUnread((v) => !v)}
                      className={`inline-flex min-h-[38px] items-center rounded-[10px] border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                        notifFilterUnread
                          ? 'border-[#123C35] bg-[#123C35] text-white'
                          : 'border-[#123C35]/20 bg-white text-[#123C35] hover:bg-[#DDF3E9]'
                      }`}
                    >
                      {notifFilterUnread ? 'Showing Unread' : `Unread Only (${unreadCount})`}
                    </button>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllNotificationsRead}
                        className="inline-flex min-h-[38px] items-center rounded-[10px] border border-[#123C35]/20 bg-white px-4 py-1.5 text-xs font-semibold text-[#123C35] transition-colors hover:bg-[#DDF3E9]"
                      >
                        Mark All as Read
                      </button>
                    )}
                  </div>
                </div>

                {visibleNotifications.length === 0 ? (
                  <GlassSurface className="p-10 text-sm text-[#414846]">
                    {notifFilterUnread
                      ? 'No unread notifications right now.'
                      : 'You are all caught up—no notifications right now.'}
                  </GlassSurface>
                ) : (
                  <div className="flex flex-col gap-3">
                    {visibleNotifications.map((notif) => (
                      <GlassSurface
                        key={notif.id}
                        className={`flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center ${
                          !notif.read ? 'border-[#159B79]/40 bg-[#F0FCF8]/60' : ''
                        }`}
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span
                              className={`font-semibold ${
                                notif.type === 'approval'
                                  ? 'text-[#159B79]'
                                  : notif.type === 'rejection'
                                  ? 'text-red-700'
                                  : 'text-[#123C35]'
                              }`}
                            >
                              {notif.type === 'approval'
                                ? 'Campaign Approved'
                                : notif.type === 'rejection'
                                ? 'Review Feedback'
                                : notif.type === 'donation'
                                ? 'Donation Alert'
                                : 'Account Update'}
                            </span>
                            <span aria-hidden="true" className="text-[#414846]/50">
                              ·
                            </span>
                            <span className="vc-numeric text-[#414846]">
                              {notif.createdAt.slice(0, 10)}
                            </span>
                            {!notif.read && (
                              <>
                                <span aria-hidden="true" className="text-[#414846]/50">
                                  ·
                                </span>
                                <span className="font-semibold text-[#159B79]">Unread</span>
                              </>
                            )}
                          </div>
                          <h3 className="text-sm font-semibold text-[#131E1C]">
                            {notif.title}
                          </h3>
                          <p className="text-xs leading-relaxed text-[#414846]">
                            {notif.message}
                          </p>
                        </div>

                        {!notif.read && (
                          <button
                            type="button"
                            onClick={() => markNotificationRead(notif.id)}
                            className="inline-flex min-h-[36px] shrink-0 items-center rounded-[10px] border border-[#123C35]/20 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#123C35] transition-colors hover:bg-[#DDF3E9]"
                          >
                            Mark Read
                          </button>
                        )}
                      </GlassSurface>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 8. ACCOUNT SETTINGS SECTION */}
            {activeSection === 'settings' && (
              <div className="flex flex-col gap-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#159B79]">
                    Preferences &amp; Security
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-bold text-[#123C35]">
                    Account Settings
                  </h2>
                </div>

                <GlassSurface className="flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#123C35]">
                      Profile Details
                    </h3>
                    <p className="mt-1 text-xs text-[#414846]">
                      Signed in as {user.fullName} ({user.email}) · {user.role}
                    </p>
                  </div>
                  <VidaButton
                    type="button"
                    variant="secondary"
                    onClick={() => setActiveSection('profile')}
                  >
                    Edit Profile
                  </VidaButton>
                </GlassSurface>

                <GlassSurface className="flex flex-col gap-5 p-6 sm:p-8">
                  <div className="flex items-center gap-2.5">
                    <Lock className="h-4 w-4 text-[#159B79]" aria-hidden="true" />
                    <h3 className="font-display text-xl font-bold text-[#123C35]">
                      Change Demo Password
                    </h3>
                  </div>

                  <form
                    onSubmit={handleChangePassword}
                    noValidate
                    className="flex max-w-md flex-col gap-4"
                  >
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="st-curr" className="text-xs font-semibold text-[#131E1C]">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          id="st-curr"
                          type={showPw ? 'text' : 'password'}
                          value={currPw}
                          onChange={(e) => setCurrPw(e.target.value)}
                          className="vc-input pr-11"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw((s) => !s)}
                          aria-label={showPw ? 'Hide passwords' : 'Show passwords'}
                          className="absolute top-1/2 right-2.5 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#414846] hover:text-[#123C35]"
                        >
                          {showPw ? (
                            <EyeOff className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <Eye className="h-4 w-4" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="st-new" className="text-xs font-semibold text-[#131E1C]">
                        New Password
                      </label>
                      <input
                        id="st-new"
                        type={showPw ? 'text' : 'password'}
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        placeholder="Min 8 chars, letters & numbers"
                        className="vc-input"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="st-conf" className="text-xs font-semibold text-[#131E1C]">
                        Confirm New Password
                      </label>
                      <input
                        id="st-conf"
                        type={showPw ? 'text' : 'password'}
                        value={confirmPw}
                        onChange={(e) => setConfirmPw(e.target.value)}
                        className="vc-input"
                      />
                    </div>

                    {pwFeedback && (
                      <p
                        role="status"
                        className={`text-xs font-medium ${
                          pwFeedback.type === 'ok' ? 'text-[#159B79]' : 'text-red-700'
                        }`}
                      >
                        {pwFeedback.text}
                      </p>
                    )}

                    <div>
                      <VidaButton type="submit" variant="primary">
                        Update Demo Password
                      </VidaButton>
                    </div>
                  </form>
                </GlassSurface>

                <GlassSurface className="flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#123C35]">
                      Reset Demo Data
                    </h3>
                    <p className="mt-1 text-xs text-[#414846]">
                      Restores seeded campaigns, donations, categories, messages, and
                      demo accounts in LocalStorage for fresh testing.
                    </p>
                  </div>
                  {!confirmDemoReset ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDemoReset(true)}
                      className="inline-flex min-h-[42px] shrink-0 items-center gap-2 rounded-[10px] border border-amber-300 bg-amber-50 px-5 py-2 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100"
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      <span>Reset Demo Data</span>
                    </button>
                  ) : (
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmDemoReset(false)}
                        className="inline-flex min-h-[40px] items-center rounded-[10px] border border-[#123C35]/20 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#414846] hover:bg-[#F8FAF7]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmDemoReset(false);
                          resetDemoStore();
                          navigate('/login');
                        }}
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-[10px] bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Confirm Reset</span>
                      </button>
                    </div>
                  )}
                </GlassSurface>

                <GlassSurface className="flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#123C35]">
                      Sign Out of VidaCare
                    </h3>
                    <p className="mt-1 text-xs text-[#414846]">
                      Ends your current browser session while keeping saved LocalStorage
                      records intact.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex min-h-[42px] items-center gap-2 rounded-[10px] border border-red-200 bg-red-50 px-5 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    <span>Sign Out</span>
                  </button>
                </GlassSurface>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateFundraiserModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={(input) => {
          const created = createUserCampaign(input);
          if (created) {
            setActiveSection('campaigns');
          }
          return created;
        }}
      />

      <EditCampaignModal
        campaign={editingCampaign}
        onClose={() => setEditingCampaign(null)}
        onSave={(input) => updateUserCampaign(input)}
      />

      <DonationReceiptModal
        donation={receiptDonation}
        user={user}
        onClose={() => setReceiptDonation(null)}
      />
    </section>
  );
};
