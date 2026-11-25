import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  Edit3,
  Eye,
  EyeOff,
  FileCheck2,
  HeartHandshake,
  LayoutDashboard,
  Lock,
  LogOut,
  Megaphone,
  Plus,
  Receipt,
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

type DashboardSection =
  | 'overview'
  | 'profile'
  | 'campaigns'
  | 'donations'
  | 'updates'
  | 'notifications'
  | 'settings';

const AVATAR_PRESETS = [
  '/src/assets/images/campaign_cardiac_care_1795448745364.jpg',
  '/src/assets/images/campaign_neuro_rehab_1795448745124.jpg',
  '/src/assets/images/campaign_oncology_support_1795448744973.jpg',
  '/src/assets/images/campaign_surgical_mission_1795448745169.jpg',
];

function StatusBadge({ status }: { status: MedicalCampaign['status'] }) {
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

export const DashboardPage: React.FC = () => {
  const {
    campaigns,
    donations,
    notifications,
    user,
    authenticateMock,
    updateUserProfile,
    changeCurrentUserPassword,
    createUserCampaign,
    updateUserCampaign,
    postCampaignUpdate,
    markNotificationRead,
    markAllNotificationsRead,
    signOutMock,
    resetDemoStore,
    storageError,
    clearStorageError,
  } = useVidaCare();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeSection, setActiveSection] = useState<DashboardSection>('overview');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<MedicalCampaign | null>(
    null
  );
  const [receiptDonation, setReceiptDonation] = useState<DonationRecord | null>(
    null
  );
  const [confirmDemoReset, setConfirmDemoReset] = useState(false);
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

  useEffect(() => {
    if (user) {
      setProfName(user.fullName || '');
      setProfEmail(user.email || '');
      setProfPhone(user.phone || '');
      setProfLocation(user.location || '');
      setProfAvatar(user.avatarUrl || AVATAR_PRESETS[0]);
    }
  }, [user]);

  // Support URL deep-links such as ?action=create or ?section=donations
  useEffect(() => {
    if (!user) return;
    const actionParam = searchParams.get('action');
    const sectionParam = searchParams.get('section') as DashboardSection | null;
    const validSections: DashboardSection[] = [
      'overview',
      'profile',
      'campaigns',
      'donations',
      'updates',
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

  // Filter campaigns belonging ONLY to logged-in user
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

  // Filter donations belonging ONLY to logged-in user
  const myDonations = useMemo(() => {
    if (!user) return [];
    const emailLower = user.email.toLowerCase();
    return donations.filter(
      (d) =>
        d.donorId === user.id ||
        (d.donorEmail && d.donorEmail.toLowerCase() === emailLower)
    );
  }, [donations, user]);

  // Filter notifications belonging ONLY to logged-in user
  const myNotifications = useMemo(() => {
    if (!user) return [];
    return notifications.filter((n) => n.userId === user.id);
  }, [notifications, user]);

  const unreadCount = useMemo(
    () => myNotifications.filter((n) => !n.read).length,
    [myNotifications]
  );

  const totalDonatedAmount = useMemo(
    () => myDonations.reduce((sum, d) => sum + d.amount, 0),
    [myDonations]
  );

  const totalAmountRaised = useMemo(
    () => myCampaigns.reduce((sum, c) => sum + c.raisedAmount, 0),
    [myCampaigns]
  );

  // Unauthenticated gate with quick demo login options
  if (!user) {
    return (
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-[780px] px-4 sm:px-6 lg:px-8">
          <GlassSurface className="flex flex-col gap-6 p-8 sm:p-12">
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium tracking-[0.14em] text-amber-300">
                Sign In Required
              </p>
              <h1 className="font-display text-3xl font-semibold text-slate-50 sm:text-4xl">
                Access Your VidaCare Dashboard
              </h1>
              <p className="text-sm leading-relaxed text-slate-300/85 sm:text-base">
                Sign in with your account to view your profile, manage created
                fundraisers, track donations and receipts, or post campaign
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

            <div className="border-t vc-hairline pt-6">
              <p className="text-xs font-medium text-slate-400">
                Or explore immediately with a seeded demo profile (LocalStorage):
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() =>
                    authenticateMock('elena@vidacare.org', 'MayaCare@2026', true)
                  }
                  className="inline-flex min-h-[40px] items-center rounded-lg border border-amber-300/40 bg-amber-300/10 px-4 py-2 text-xs font-medium text-amber-200 transition-colors hover:bg-amber-300/20"
                >
                  Preview as Elena Alvarez (Patient / Fundraiser)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    authenticateMock('donor@vidacare.org', 'CareDonor@2026', true)
                  }
                  className="inline-flex min-h-[40px] items-center rounded-lg border border-sky-300/40 bg-sky-400/10 px-4 py-2 text-xs font-medium text-sky-200 transition-colors hover:bg-sky-400/20"
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

  const handleLogout = () => {
    signOutMock();
    navigate('/login');
  };

  const navItems: Array<{
    id: DashboardSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'profile', label: 'My Profile', icon: UserIcon },
    { id: 'campaigns', label: 'My Campaigns', icon: HeartHandshake },
    { id: 'donations', label: 'My Donations', icon: Receipt },
    { id: 'updates', label: 'Campaign Updates', icon: Megaphone },
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
    <section className="py-8 sm:py-12">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="grid items-start gap-8 lg:grid-cols-12">
          {/* Desktop Sidebar Navigation */}
          <aside className="hidden lg:col-span-3 lg:block lg:sticky lg:top-24">
            <GlassSurface className="flex flex-col gap-6 p-5">
              {/* Profile Snapshot */}
              <div className="flex items-center gap-3.5 border-b vc-hairline pb-5">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-amber-300/35 bg-slate-900">
                  <SafeImage
                    src={userAvatar}
                    alt={user.fullName}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-50">
                    {user.fullName}
                  </p>
                  <p className="truncate text-xs text-amber-300">{user.role}</p>
                </div>
              </div>

              {/* Navigation Links */}
              <nav aria-label="Dashboard sections" className="flex flex-col gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveSection(item.id)}
                      className={`flex min-h-[42px] w-full items-center justify-between gap-3 rounded-lg px-3.5 py-2 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                        active
                          ? 'bg-amber-300/15 text-amber-200 border border-amber-300/30'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white border border-transparent'
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

              {/* Sidebar Quick Actions & Logout */}
              <div className="flex flex-col gap-2.5 border-t vc-hairline pt-5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-lg bg-teal-400 px-3 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-teal-300"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span>Create Fundraiser</span>
                </button>
                <Link
                  to="/campaigns"
                  className="inline-flex min-h-[40px] w-full items-center justify-center rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-sky-300/40 hover:text-white"
                >
                  Explore Campaigns
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-1 inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-lg border border-slate-800/80 px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:border-rose-400/40 hover:text-rose-200"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Logout</span>
                </button>
              </div>
            </GlassSurface>
          </aside>

          {/* Main Dashboard Viewport */}
          <div className="flex flex-col gap-6 lg:col-span-9">
            {/* Mobile & Tablet Horizontal Navigation */}
            <div className="flex flex-col gap-3 lg:hidden">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-amber-300/35">
                    <SafeImage
                      src={userAvatar}
                      alt={user.fullName}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-50">
                      {user.fullName}
                    </p>
                    <p className="text-xs text-amber-300">{user.role}</p>
                  </div>
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
                  const active = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveSection(item.id)}
                      className={`min-h-[38px] rounded-lg px-3.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                        active
                          ? 'bg-amber-300 text-slate-950 font-semibold'
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

            {/* Storage Warning Banner */}
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
                  className="shrink-0 font-medium text-amber-200 hover:text-white"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* 1. OVERVIEW SECTION */}
            {activeSection === 'overview' && (
              <div className="flex flex-col gap-6">
                {/* Welcome Header + Quick Actions */}
                <GlassSurface className="flex flex-col justify-between gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-amber-300/40 bg-slate-900">
                      <SafeImage
                        src={userAvatar}
                        alt={user.fullName}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-medium tracking-[0.14em] text-amber-300">
                        {user.role} Dashboard
                      </p>
                      <h1 className="mt-0.5 font-display text-2xl font-semibold text-slate-50 sm:text-3xl">
                        Welcome, {user.fullName}
                      </h1>
                      <p className="mt-1 text-xs text-slate-400">
                        {user.email}
                        {user.location ? ` · ${user.location}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(true)}
                      className="inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-teal-400 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-teal-300"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      <span>Create Fundraiser</span>
                    </button>
                    <VidaButton
                      to="/campaigns"
                      variant="secondary"
                      className="min-h-[42px] px-4 py-2 text-xs"
                    >
                      Explore Campaigns
                    </VidaButton>
                  </div>
                </GlassSurface>

                {/* 3 Statistic Summary Cards */}
                <div className="grid gap-5 sm:grid-cols-3">
                  <GlassSurface className="flex flex-col gap-2 p-6">
                    <span className="text-xs font-medium text-slate-400">
                      Total Donations
                    </span>
                    <span className="font-mono text-3xl font-semibold tabular-nums text-sky-300">
                      {formatINR(totalDonatedAmount)}
                    </span>
                    <span className="text-xs text-slate-400">
                      Across {myDonations.length}{' '}
                      {myDonations.length === 1 ? 'contribution' : 'contributions'}
                    </span>
                  </GlassSurface>

                  <GlassSurface className="flex flex-col gap-2 p-6">
                    <span className="text-xs font-medium text-slate-400">
                      My Campaigns
                    </span>
                    <span className="font-mono text-3xl font-semibold tabular-nums text-amber-300">
                      {myCampaigns.length}
                    </span>
                    <span className="text-xs text-slate-400">
                      {myApprovedCampaigns.length} approved ·{' '}
                      {myCampaigns.filter((c) => c.status === 'pending').length}{' '}
                      pending
                    </span>
                  </GlassSurface>

                  <GlassSurface className="flex flex-col gap-2 p-6">
                    <span className="text-xs font-medium text-slate-400">
                      Total Amount Raised
                    </span>
                    <span className="font-mono text-3xl font-semibold tabular-nums text-teal-300">
                      {formatINR(totalAmountRaised)}
                    </span>
                    <span className="text-xs text-slate-400">
                      Collected across your campaigns
                    </span>
                  </GlassSurface>
                </div>

                {/* Overview Snapshot: Recent Notifications & Active Campaigns */}
                <div className="grid gap-6 md:grid-cols-2">
                  <GlassSurface className="flex flex-col gap-4 p-6">
                    <div className="flex items-center justify-between">
                      <h2 className="font-display text-lg font-semibold text-slate-50">
                        Recent Activity &amp; Alerts
                      </h2>
                      <button
                        type="button"
                        onClick={() => setActiveSection('notifications')}
                        className="text-xs font-medium text-sky-300 hover:text-sky-200"
                      >
                        View all
                      </button>
                    </div>
                    {myNotifications.length === 0 ? (
                      <p className="text-sm text-slate-400">
                        No recent alerts for your account.
                      </p>
                    ) : (
                      <div className="flex flex-col divide-y divide-slate-800/70">
                        {myNotifications.slice(0, 3).map((notif) => (
                          <div key={notif.id} className="py-3 first:pt-0 last:pb-0">
                            <p className="text-xs font-semibold text-slate-100">
                              {notif.title}
                            </p>
                            <p className="mt-1 text-xs leading-relaxed text-slate-400">
                              {notif.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </GlassSurface>

                  <GlassSurface className="flex flex-col gap-4 p-6">
                    <div className="flex items-center justify-between">
                      <h2 className="font-display text-lg font-semibold text-slate-50">
                        Your Campaign Progress
                      </h2>
                      <button
                        type="button"
                        onClick={() => setActiveSection('campaigns')}
                        className="text-xs font-medium text-amber-300 hover:text-amber-200"
                      >
                        Manage
                      </button>
                    </div>
                    {myCampaigns.length === 0 ? (
                      <div className="flex flex-col items-start gap-3">
                        <p className="text-sm text-slate-400">
                          You haven’t created a medical fundraiser yet.
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowCreateModal(true)}
                          className="text-xs font-medium text-teal-300 hover:text-teal-200"
                        >
                          + Start your first fundraiser
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {myCampaigns.slice(0, 2).map((c) => {
                          const pct = calculateProgress(c.raisedAmount, c.goalAmount);
                          return (
                            <div
                              key={c.id}
                              className="flex flex-col gap-2 rounded-xl border border-slate-800/80 bg-slate-950/55 p-4"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-sm font-medium text-slate-100">
                                  {c.title}
                                </p>
                                <StatusBadge status={c.status} />
                              </div>
                              <ProgressMeter value={pct} />
                              <div className="flex justify-between font-mono text-xs tabular-nums text-slate-400">
                                <span>{formatINR(c.raisedAmount)} raised</span>
                                <span>Goal: {formatINR(c.goalAmount)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </GlassSurface>
                </div>
              </div>
            )}

            {/* 2. MY PROFILE SECTION */}
            {activeSection === 'profile' && (
              <GlassSurface className="flex flex-col gap-6 p-6 sm:p-8">
                <div>
                  <p className="text-xs font-medium tracking-[0.14em] text-sky-300">
                    Personal Information
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-semibold text-slate-50">
                    My Profile
                  </h2>
                </div>

                <form onSubmit={handleSaveProfile} noValidate className="flex flex-col gap-6">
                  {/* Profile Avatar Picker & Upload */}
                  <div className="flex flex-col gap-4 border-b vc-hairline pb-6 sm:flex-row sm:items-center">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-amber-300/40 bg-slate-900">
                      <SafeImage
                        src={profAvatar}
                        alt={profName || user.fullName}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col gap-2.5">
                      <p className="text-xs font-medium text-slate-300">
                        Profile Photo (Upload local file or pick preset)
                      </p>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <label className="inline-flex min-h-[36px] cursor-pointer items-center rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-amber-300/50">
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
                                ? 'border-amber-300'
                                : 'border-slate-700'
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
                      <label htmlFor="prof-name" className="text-xs font-medium text-slate-300">
                        Full Name
                      </label>
                      <input
                        id="prof-name"
                        type="text"
                        value={profName}
                        onChange={(e) => setProfName(e.target.value)}
                        className="min-h-[44px] rounded-lg border border-slate-800 bg-slate-950/75 px-3.5 text-sm text-slate-100 focus:border-amber-300/60 focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="prof-email" className="text-xs font-medium text-slate-300">
                        Email Address
                      </label>
                      <input
                        id="prof-email"
                        type="email"
                        value={profEmail}
                        onChange={(e) => setProfEmail(e.target.value)}
                        className="min-h-[44px] rounded-lg border border-slate-800 bg-slate-950/75 px-3.5 text-sm text-slate-100 focus:border-amber-300/60 focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="prof-phone" className="text-xs font-medium text-slate-300">
                        Mobile Number
                      </label>
                      <input
                        id="prof-phone"
                        type="tel"
                        value={profPhone}
                        onChange={(e) => setProfPhone(e.target.value)}
                        className="min-h-[44px] rounded-lg border border-slate-800 bg-slate-950/75 px-3.5 font-mono text-sm text-slate-100 focus:border-amber-300/60 focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="prof-loc" className="text-xs font-medium text-slate-300">
                        Location
                      </label>
                      <input
                        id="prof-loc"
                        type="text"
                        value={profLocation}
                        onChange={(e) => setProfLocation(e.target.value)}
                        placeholder="City, State"
                        className="min-h-[44px] rounded-lg border border-slate-800 bg-slate-950/75 px-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-300/60 focus:outline-none"
                      />
                    </div>
                  </div>

                  {profMsg && (
                    <p
                      role="status"
                      className={`text-xs ${
                        profMsg.type === 'ok' ? 'text-teal-300' : 'text-rose-300'
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

            {/* 3. MY CAMPAIGNS SECTION */}
            {activeSection === 'campaigns' && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-xs font-medium tracking-[0.14em] text-amber-300">
                      Fundraiser Management
                    </p>
                    <h2 className="mt-1 font-display text-2xl font-semibold text-slate-50">
                      My Campaigns
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex min-h-[42px] w-fit items-center gap-2 rounded-lg bg-teal-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-teal-300"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    <span>Create Fundraiser</span>
                  </button>
                </div>

                {myCampaigns.length === 0 ? (
                  <GlassSurface className="flex flex-col items-start gap-3 p-10">
                    <h3 className="font-display text-xl font-semibold text-slate-50">
                      No campaigns created yet
                    </h3>
                    <p className="max-w-md text-sm text-slate-400">
                      Start a verified medical fundraiser to gather community
                      support for hospital treatments or recovery care.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(true)}
                      className="mt-1 inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-teal-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-teal-300"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      <span>Create Fundraiser</span>
                    </button>
                  </GlassSurface>
                ) : (
                  <div className="flex flex-col gap-4">
                    {myCampaigns.map((c) => {
                      const pct = calculateProgress(c.raisedAmount, c.goalAmount);
                      const canEdit = c.status === 'approved' || c.status === 'pending';
                      return (
                        <GlassSurface key={c.id} className="p-6">
                          <div className="flex flex-col gap-5 md:flex-row md:items-center">
                            <div className="h-28 w-full shrink-0 overflow-hidden rounded-xl border border-white/10 bg-slate-950 md:w-40">
                              <SafeImage
                                src={c.imageUrl}
                                alt={c.title}
                                className="h-full w-full object-cover"
                              />
                            </div>

                            <div className="flex flex-1 flex-col gap-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <StatusBadge status={c.status} />
                                <span className="font-mono text-xs tabular-nums text-slate-400">
                                  Created {c.createdAt}
                                </span>
                              </div>

                              <div>
                                <h3 className="font-display text-xl font-semibold text-slate-50">
                                  {c.title}
                                </h3>
                                <p className="mt-0.5 text-xs text-slate-400">
                                  {c.patientName} · {c.condition} · {c.hospitalName}
                                </p>
                              </div>

                              {c.status === 'rejected' && c.rejectionReason && (
                                <p className="rounded-lg border border-rose-400/30 bg-rose-950/30 p-3 text-xs text-rose-200">
                                  Review note: {c.rejectionReason}
                                </p>
                              )}

                              <div className="flex flex-col gap-2">
                                <ProgressMeter value={pct} />
                                <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs tabular-nums">
                                  <span className="text-slate-200">
                                    {formatINR(c.raisedAmount)} raised of{' '}
                                    {formatINR(c.goalAmount)}
                                  </span>
                                  <span className="text-amber-300">{pct}%</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-row gap-2.5 md:flex-col shrink-0">
                              {c.status === 'approved' && (
                                <Link
                                  to={`/campaigns/${c.id}`}
                                  className="inline-flex min-h-[38px] items-center justify-center rounded-lg border border-sky-400/40 bg-sky-400/10 px-4 py-1.5 text-xs font-medium text-sky-200 hover:bg-sky-400/20"
                                >
                                  View Public
                                </Link>
                              )}
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => setEditingCampaign(c)}
                                  className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/70 px-4 py-1.5 text-xs font-medium text-slate-200 hover:border-amber-300/50 hover:text-amber-200"
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

            {/* 4. MY DONATIONS SECTION */}
            {activeSection === 'donations' && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-xs font-medium tracking-[0.14em] text-sky-300">
                      Contribution Ledger
                    </p>
                    <h2 className="mt-1 font-display text-2xl font-semibold text-slate-50">
                      My Donations
                    </h2>
                  </div>
                  <VidaButton
                    to="/campaigns"
                    variant="secondary"
                    className="min-h-[40px] px-4 py-2 text-xs"
                  >
                    Explore Campaigns
                  </VidaButton>
                </div>

                {myDonations.length === 0 ? (
                  <GlassSurface className="flex flex-col items-start gap-3 p-10">
                    <h3 className="font-display text-xl font-semibold text-slate-50">
                      No donations recorded yet
                    </h3>
                    <p className="max-w-md text-sm text-slate-400">
                      Contributions made while signed in (or using your account
                      email) appear here with downloadable receipts.
                    </p>
                    <VidaButton to="/campaigns" variant="primary">
                      Explore Campaigns
                    </VidaButton>
                  </GlassSurface>
                ) : (
                  <GlassSurface className="overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b vc-hairline text-xs text-slate-400">
                          <tr>
                            <th className="px-6 py-3.5 font-medium">Campaign</th>
                            <th className="px-6 py-3.5 font-medium">Date</th>
                            <th className="px-6 py-3.5 font-medium">Payment Status</th>
                            <th className="px-6 py-3.5 text-right font-medium">Amount</th>
                            <th className="px-6 py-3.5 text-right font-medium">Receipt</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/70">
                          {myDonations.map((d) => (
                            <tr
                              key={d.id}
                              className="transition-colors hover:bg-white/[0.02]"
                            >
                              <td className="px-6 py-4">
                                <Link
                                  to={`/campaigns/${d.campaignId}`}
                                  className="font-medium text-slate-100 hover:text-amber-200"
                                >
                                  {d.campaignTitle}
                                </Link>
                                {d.isAnonymous && (
                                  <p className="text-[11px] text-slate-400">
                                    Donated anonymously
                                  </p>
                                )}
                              </td>
                              <td className="px-6 py-4 font-mono text-xs tabular-nums text-slate-400">
                                {d.timestamp.slice(0, 10)}
                              </td>
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-300">
                                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span>{d.paymentStatus || 'Completed'}</span>
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right font-mono font-semibold tabular-nums text-amber-300">
                                {formatINR(d.amount)}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => setReceiptDonation(d)}
                                  className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-1 text-xs font-medium text-sky-300 hover:border-sky-300/50 hover:text-white"
                                >
                                  <FileCheck2 className="h-3.5 w-3.5" aria-hidden="true" />
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
              </div>
            )}

            {/* 5. CAMPAIGN UPDATES SECTION */}
            {activeSection === 'updates' && (
              <div className="flex flex-col gap-6">
                <div>
                  <p className="text-xs font-medium tracking-[0.14em] text-teal-300">
                    Supporter Communication
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-semibold text-slate-50">
                    Post Campaign Updates
                  </h2>
                </div>

                {myApprovedCampaigns.length === 0 ? (
                  <GlassSurface className="flex flex-col items-start gap-3 p-10">
                    <h3 className="font-display text-xl font-semibold text-slate-50">
                      No approved campaigns available for updates
                    </h3>
                    <p className="max-w-md text-sm text-slate-400">
                      Only approved fundraisers can publish milestone updates to
                      supporters. Check My Campaigns to monitor pending reviews
                      or create a new fundraiser.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveSection('campaigns')}
                      className="mt-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-medium text-amber-300"
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
                            className="text-xs font-medium text-slate-300"
                          >
                            Select Approved Campaign
                          </label>
                          <select
                            id="upd-campaign"
                            value={updateCampaignId}
                            onChange={(e) => setUpdateCampaignId(e.target.value)}
                            className="min-h-[44px] rounded-lg border border-slate-800 bg-slate-950/75 px-3 text-sm text-slate-100 focus:border-amber-300/60 focus:outline-none"
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
                            className="text-xs font-medium text-slate-300"
                          >
                            Update Headline
                          </label>
                          <input
                            id="upd-title"
                            type="text"
                            value={updateTitle}
                            onChange={(e) => setUpdateTitle(e.target.value)}
                            placeholder="e.g., Post-surgical milestone cleared by care team"
                            className="min-h-[44px] rounded-lg border border-slate-800 bg-slate-950/75 px-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-300/60 focus:outline-none"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label
                            htmlFor="upd-summary"
                            className="text-xs font-medium text-slate-300"
                          >
                            Patient Progress Details
                          </label>
                          <textarea
                            id="upd-summary"
                            rows={4}
                            value={updateSummary}
                            onChange={(e) => setUpdateSummary(e.target.value)}
                            placeholder="Share encouraging clinical updates with your donors..."
                            className="rounded-lg border border-slate-800 bg-slate-950/75 p-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-300/60 focus:outline-none"
                          />
                        </div>

                        {updateFeedback && (
                          <p
                            role="status"
                            className={`text-xs ${
                              updateFeedback.type === 'ok'
                                ? 'text-teal-300'
                                : 'text-rose-300'
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

                    {/* Existing updates history */}
                    <GlassSurface className="flex flex-col gap-4 p-6 sm:p-8">
                      <h3 className="font-display text-xl font-semibold text-slate-50">
                        Published Updates
                      </h3>
                      {myApprovedCampaigns.flatMap((c) =>
                        c.updates.map((u) => ({ ...u, campaignTitle: c.title }))
                      ).length === 0 ? (
                        <p className="text-sm text-slate-400">
                          No updates published yet.
                        </p>
                      ) : (
                        <div className="flex flex-col divide-y divide-slate-800/70">
                          {myApprovedCampaigns.flatMap((c) =>
                            c.updates.map((u) => (
                              <div key={u.id} className="py-4 first:pt-0 last:pb-0">
                                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                                  <span className="font-mono text-amber-300">
                                    {u.date}
                                  </span>
                                  <span aria-hidden="true">·</span>
                                  <span className="text-sky-300">{c.title}</span>
                                </div>
                                <h4 className="mt-1 text-sm font-semibold text-slate-100">
                                  {u.title}
                                </h4>
                                <p className="mt-1 text-xs leading-relaxed text-slate-300/85">
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

            {/* 6. NOTIFICATIONS SECTION */}
            {activeSection === 'notifications' && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-xs font-medium tracking-[0.14em] text-amber-300">
                      Inbox &amp; Review Alerts
                    </p>
                    <h2 className="mt-1 font-display text-2xl font-semibold text-slate-50">
                      Notifications
                    </h2>
                  </div>

                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllNotificationsRead}
                      className="inline-flex min-h-[38px] w-fit items-center rounded-lg border border-slate-700 bg-slate-900/70 px-4 py-1.5 text-xs font-medium text-sky-300 hover:border-sky-300/50"
                    >
                      Mark All as Read
                    </button>
                  )}
                </div>

                {myNotifications.length === 0 ? (
                  <GlassSurface className="p-10 text-sm text-slate-400">
                    You are all caught up—no notifications right now.
                  </GlassSurface>
                ) : (
                  <div className="flex flex-col gap-3">
                    {myNotifications.map((notif) => (
                      <GlassSurface
                        key={notif.id}
                        className={`flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center ${
                          !notif.read ? 'border-amber-300/35' : ''
                        }`}
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-xs">
                            <span
                              className={`font-medium ${
                                notif.type === 'approval'
                                  ? 'text-teal-300'
                                  : notif.type === 'rejection'
                                  ? 'text-rose-300'
                                  : 'text-sky-300'
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
                            <span aria-hidden="true" className="text-slate-600">
                              ·
                            </span>
                            <span className="font-mono text-slate-400 tabular-nums">
                              {notif.createdAt.slice(0, 10)}
                            </span>
                            {!notif.read && (
                              <>
                                <span aria-hidden="true" className="text-slate-600">
                                  ·
                                </span>
                                <span className="font-medium text-amber-300">
                                  Unread
                                </span>
                              </>
                            )}
                          </div>
                          <h3 className="text-sm font-semibold text-slate-100">
                            {notif.title}
                          </h3>
                          <p className="text-xs leading-relaxed text-slate-300/85">
                            {notif.message}
                          </p>
                        </div>

                        {!notif.read && (
                          <button
                            type="button"
                            onClick={() => markNotificationRead(notif.id)}
                            className="inline-flex min-h-[36px] shrink-0 items-center rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-teal-400/50 hover:text-teal-200"
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

            {/* 7. ACCOUNT SETTINGS SECTION */}
            {activeSection === 'settings' && (
              <div className="flex flex-col gap-6">
                <div>
                  <p className="text-xs font-medium tracking-[0.14em] text-sky-300">
                    Preferences &amp; Security
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-semibold text-slate-50">
                    Account Settings
                  </h2>
                </div>

                <GlassSurface className="flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="font-display text-lg font-semibold text-slate-50">
                      Profile Details
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
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
                    <Lock className="h-4 w-4 text-amber-300" aria-hidden="true" />
                    <h3 className="font-display text-xl font-semibold text-slate-50">
                      Change Demo Password
                    </h3>
                  </div>

                  <form
                    onSubmit={handleChangePassword}
                    noValidate
                    className="flex max-w-md flex-col gap-4"
                  >
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="st-curr" className="text-xs font-medium text-slate-300">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          id="st-curr"
                          type={showPw ? 'text' : 'password'}
                          value={currPw}
                          onChange={(e) => setCurrPw(e.target.value)}
                          className="min-h-[42px] w-full rounded-lg border border-slate-800 bg-slate-950/75 pr-10 pl-3.5 text-sm text-slate-100 focus:border-amber-300/60 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw((s) => !s)}
                          aria-label={showPw ? 'Hide passwords' : 'Show passwords'}
                          className="absolute top-1/2 right-2.5 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-slate-400 hover:text-white"
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
                      <label htmlFor="st-new" className="text-xs font-medium text-slate-300">
                        New Password
                      </label>
                      <input
                        id="st-new"
                        type={showPw ? 'text' : 'password'}
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        placeholder="Min 8 chars, letters & numbers"
                        className="min-h-[42px] rounded-lg border border-slate-800 bg-slate-950/75 px-3.5 text-sm text-slate-100 focus:border-amber-300/60 focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="st-conf" className="text-xs font-medium text-slate-300">
                        Confirm New Password
                      </label>
                      <input
                        id="st-conf"
                        type={showPw ? 'text' : 'password'}
                        value={confirmPw}
                        onChange={(e) => setConfirmPw(e.target.value)}
                        className="min-h-[42px] rounded-lg border border-slate-800 bg-slate-950/75 px-3.5 text-sm text-slate-100 focus:border-amber-300/60 focus:outline-none"
                      />
                    </div>

                    {pwFeedback && (
                      <p
                        role="status"
                        className={`text-xs ${
                          pwFeedback.type === 'ok' ? 'text-teal-300' : 'text-rose-300'
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
                    <h3 className="font-display text-lg font-semibold text-slate-50">
                      Reset Demo Data
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Restores seeded campaigns, donations, categories, messages,
                      and demo accounts in LocalStorage for fresh testing.
                    </p>
                  </div>
                  {!confirmDemoReset ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDemoReset(true)}
                      className="inline-flex min-h-[42px] shrink-0 items-center gap-2 rounded-lg border border-amber-300/40 bg-amber-300/10 px-5 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-300/20"
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      <span>Reset Demo Data</span>
                    </button>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setConfirmDemoReset(false)}
                        className="inline-flex min-h-[40px] items-center rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white"
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
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-amber-300 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-200"
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Confirm Reset</span>
                      </button>
                    </div>
                  )}
                </GlassSurface>

                <GlassSurface className="flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="font-display text-lg font-semibold text-slate-50">
                      Sign Out of VidaCare
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Ends your current browser session while keeping saved
                      LocalStorage records intact.
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
