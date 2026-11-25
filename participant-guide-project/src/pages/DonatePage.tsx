import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  CreditCard,
  FileText,
  HeartHandshake,
  Landmark,
  Lock,
  Printer,
  ShieldCheck,
  Smartphone,
  X,
  XCircle,
} from 'lucide-react';
import { useVidaCare } from '../context/VidaCareContext';
import { DonationRecord, PaymentMethodType } from '../types/campaign';
import { calculateProgress, formatINR } from '../lib/format';
import { SafeImage } from '../components/SafeImage';
import {
  BrandMark,
  GlassSurface,
  ProgressMeter,
  VidaButton,
} from '../components/ui/DesignPrimitives';

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

const PAYMENT_METHODS: Array<{
  id: PaymentMethodType;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'UPI',
    title: 'UPI',
    subtitle: 'Instant UPI handle or app approval simulation',
    icon: Smartphone,
  },
  {
    id: 'Debit/Credit Card',
    title: 'Debit/Credit Card',
    subtitle: 'Simulated card authorization (no card numbers collected)',
    icon: CreditCard,
  },
  {
    id: 'Net Banking',
    title: 'Net Banking',
    subtitle: 'Simulated bank portal confirmation',
    icon: Landmark,
  },
];

type SimulationStage = 'idle' | 'confirming' | 'processing' | 'failed';

export const DonatePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const {
    approvedCampaigns,
    getCampaignById,
    recordDonation,
    user,
  } = useVidaCare();

  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(
    id || approvedCampaigns[0]?.id || ''
  );

  useEffect(() => {
    if (id) {
      setSelectedCampaignId(id);
    } else if (!selectedCampaignId && approvedCampaigns[0]) {
      setSelectedCampaignId(approvedCampaigns[0].id);
    }
  }, [id, approvedCampaigns, selectedCampaignId]);

  const rawCampaign = selectedCampaignId
    ? getCampaignById(selectedCampaignId)
    : approvedCampaigns[0];
  const campaign =
    rawCampaign && rawCampaign.status === 'approved' ? rawCampaign : undefined;

  const initialAmountParam = Number(searchParams.get('amount'));
  const defaultAmount =
    Number.isFinite(initialAmountParam) && initialAmountParam > 0
      ? Math.round(initialAmountParam)
      : 1000;

  const [amountInput, setAmountInput] = useState<string>(String(defaultAmount));
  const [fullName, setFullName] = useState<string>(user?.fullName ?? '');
  const [email, setEmail] = useState<string>(user?.email ?? '');
  const [mobile, setMobile] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('UPI');

  const [fieldErrors, setFieldErrors] = useState<{
    amount?: string;
    fullName?: string;
    email?: string;
    mobile?: string;
  }>({});

  const [simulationStage, setSimulationStage] = useState<SimulationStage>('idle');
  const [statusNotice, setStatusNotice] = useState<{
    type: 'cancelled' | 'failed';
    text: string;
  } | null>(null);
  const [completedRecord, setCompletedRecord] = useState<{
    donation: DonationRecord;
    receiptHolderName: string;
    receiptEmail: string;
    receiptMobile: string;
  } | null>(null);
  const [showReceipt, setShowReceipt] = useState<boolean>(false);
  const isProcessingRef = useRef<boolean>(false);
  const paymentTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (user) {
      setFullName((prev) => prev || user.fullName || '');
      setEmail((prev) => prev || user.email || '');
      if (user.phone) {
        setMobile((prev) => prev || user.phone || '');
      }
    }
  }, [user]);

  useEffect(() => {
    return () => {
      if (paymentTimerRef.current !== null) {
        window.clearTimeout(paymentTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (simulationStage !== 'confirming' && simulationStage !== 'failed') return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancelMockPayment();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [simulationStage]);

  if (!campaign) {
    return (
      <section className="py-20">
        <div className="mx-auto max-w-[760px] px-4 sm:px-6 lg:px-8">
          <GlassSurface className="flex flex-col items-start gap-4 p-8 sm:p-12">
            <p className="text-xs font-medium tracking-[0.14em] text-amber-300">
              Campaign Unavailable
            </p>
            <h1 className="font-display text-3xl font-semibold text-slate-50">
              Select an approved medical campaign to continue.
            </h1>
            <p className="text-sm leading-relaxed text-slate-300/85">
              Only clinically approved patient fundraisers can accept
              contributions on VidaCare.
            </p>
            <VidaButton to="/campaigns" variant="primary">
              Browse Approved Campaigns
            </VidaButton>
          </GlassSurface>
        </div>
      </section>
    );
  }

  const parsedAmount = Number(amountInput);
  const validDisplayAmount =
    Number.isFinite(parsedAmount) && parsedAmount > 0
      ? Math.round(parsedAmount)
      : 0;
  const progress = calculateProgress(campaign.raisedAmount, campaign.goalAmount);

  const validateForm = (): boolean => {
    const errors: typeof fieldErrors = {};

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      errors.amount = 'Please enter a donation amount greater than ₹0.';
    } else if (parsedAmount < 10) {
      errors.amount = 'Minimum donation amount is ₹10.';
    }

    if (!fullName.trim() || fullName.trim().length < 2) {
      errors.fullName = 'Please enter your full name for the receipt record.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }

    const digitsOnly = mobile.replace(/[\s\-()+]/g, '');
    if (digitsOnly.length < 10 || digitsOnly.length > 13 || !/^\d+$/.test(digitsOnly)) {
      errors.mobile = 'Please enter a valid 10-digit mobile number.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusNotice(null);
    if (!validateForm()) return;
    setSimulationStage('confirming');
  };

  const handleConfirmMockPayment = () => {
    if (isProcessingRef.current || simulationStage !== 'confirming') return;
    isProcessingRef.current = true;
    setSimulationStage('processing');
    paymentTimerRef.current = window.setTimeout(() => {
      try {
        const txRef = `VC-SIM-${new Date().getFullYear()}-${Math.floor(
          100000 + Math.random() * 900000
        )}`;
        const saved = recordDonation({
          campaignId: campaign.id,
          donorName: fullName.trim(),
          donorEmail: email.trim(),
          donorPhone: mobile.trim(),
          isAnonymous,
          amount: validDisplayAmount,
          paymentMethod,
          transactionRef: txRef,
          message: message.trim(),
        });

        if (!saved) {
          setSimulationStage('failed');
          return;
        }

        setSimulationStage('idle');
        setCompletedRecord({
          donation: saved,
          receiptHolderName: fullName.trim(),
          receiptEmail: email.trim(),
          receiptMobile: mobile.trim(),
        });
      } finally {
        isProcessingRef.current = false;
      }
    }, 650);
  };

  const handleSimulateFailure = () => {
    if (isProcessingRef.current || simulationStage !== 'confirming') return;
    isProcessingRef.current = true;
    setSimulationStage('processing');
    paymentTimerRef.current = window.setTimeout(() => {
      isProcessingRef.current = false;
      setSimulationStage('failed');
    }, 450);
  };

  const handleCancelMockPayment = () => {
    if (paymentTimerRef.current !== null) {
      window.clearTimeout(paymentTimerRef.current);
      paymentTimerRef.current = null;
    }
    isProcessingRef.current = false;
    setSimulationStage('idle');
    setStatusNotice({
      type: 'cancelled',
      text: 'Simulated payment cancelled. No donation was recorded and you may update your details below.',
    });
  };

  const handleDismissFailed = () => {
    isProcessingRef.current = false;
    setSimulationStage('idle');
    setStatusNotice({
      type: 'failed',
      text: 'Simulated payment failed at authorization. No donation was recorded—please review your payment method and try again.',
    });
  };

  // 9. Success Screen & Printable Receipt
  if (completedRecord) {
    const { donation, receiptHolderName, receiptEmail, receiptMobile } =
      completedRecord;

    return (
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-[820px] px-4 sm:px-6 lg:px-8">
          {!showReceipt ? (
            <GlassSurface className="flex flex-col gap-6 p-8 sm:p-12 vc-glow-accent">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-teal-400/35 bg-teal-400/15 text-teal-300">
                  <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-medium tracking-[0.14em] text-teal-300">
                    Mock Payment Confirmed
                  </p>
                  <h1 className="font-display text-2xl font-semibold text-slate-50 sm:text-3xl">
                    Thank You for Supporting {campaign.patientName}
                  </h1>
                </div>
              </div>

              <p className="text-sm leading-relaxed text-slate-300/90 sm:text-base">
                Your simulated contribution of{' '}
                <span className="font-mono font-semibold text-amber-300">
                  {formatINR(donation.amount)}
                </span>{' '}
                has been recorded in shared LocalStorage and added to{' '}
                {campaign.patientName}’s campaign progress.
              </p>

              <div className="grid gap-4 rounded-xl border border-slate-800/80 bg-slate-950/65 p-5 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-400">Transaction Reference</p>
                  <p className="mt-1 font-mono font-semibold text-sky-300">
                    {donation.transactionRef}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Contribution Amount</p>
                  <p className="mt-1 font-mono font-semibold tabular-nums text-amber-300">
                    {formatINR(donation.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Public Donor Listing</p>
                  <p className="mt-1 font-medium text-slate-100">
                    {donation.isAnonymous ? 'Anonymous Donor' : donation.donorName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Payment Method</p>
                  <p className="mt-1 font-medium text-slate-100">
                    {donation.paymentMethod} (Simulation)
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-slate-400">Campaign Supported</p>
                  <p className="mt-1 font-medium text-slate-100">
                    {campaign.title} · {campaign.hospitalName}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReceipt(true)}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-amber-300 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  <span>View Receipt</span>
                </button>
                <VidaButton
                  to={`/campaigns/${campaign.id}`}
                  variant="primary"
                >
                  Return to Campaign
                </VidaButton>
                <VidaButton to="/campaigns" variant="secondary">
                  Browse Campaigns
                </VidaButton>
              </div>
            </GlassSurface>
          ) : (
            /* Printable Donation Receipt */
            <div className="flex flex-col gap-5">
              <div className="print-hide flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setShowReceipt(false)}
                  className="inline-flex items-center gap-2 text-sm text-slate-300 transition-colors hover:text-amber-200"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  <span>Back to Confirmation</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg bg-teal-400 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-teal-300"
                >
                  <Printer className="h-4 w-4" aria-hidden="true" />
                  <span>Print Receipt</span>
                </button>
              </div>

              <div className="rounded-2xl border border-slate-700/80 bg-white p-8 text-slate-900 shadow-2xl sm:p-12">
                <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2.5">
                    <BrandMark className="h-7 w-7" />
                    <div>
                      <p className="font-display text-xl font-bold text-slate-950">
                        VidaCare
                      </p>
                      <p className="text-xs text-slate-500">
                        Medical Crowdfunding Donation Receipt (Simulation)
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-slate-500">Transaction Reference</p>
                    <p className="font-mono text-sm font-semibold text-slate-900">
                      {donation.transactionRef}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-6 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                      Supporter Information
                    </p>
                    <p className="mt-2 font-semibold text-slate-900">
                      {receiptHolderName}
                    </p>
                    <p className="text-slate-600">{receiptEmail}</p>
                    <p className="font-mono text-xs text-slate-600">
                      {receiptMobile}
                    </p>
                    {donation.isAnonymous && (
                      <p className="mt-1 text-xs text-slate-500">
                        Public display: Anonymous Donor
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                      Beneficiary Campaign
                    </p>
                    <p className="mt-2 font-semibold text-slate-900">
                      {campaign.title}
                    </p>
                    <p className="text-slate-600">
                      Patient: {campaign.patientName} ({campaign.ageLabel})
                    </p>
                    <p className="text-slate-600">{campaign.hospitalName}</p>
                  </div>
                </div>

                <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>Contribution Date</span>
                    <span className="font-mono tabular-nums">
                      {new Date(donation.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
                    <span>Simulated Payment Method</span>
                    <span>{donation.paymentMethod}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
                    <span>Platform Simulation Fee</span>
                    <span className="font-mono tabular-nums">₹0</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4 text-base font-bold text-slate-950">
                    <span>Total Contribution</span>
                    <span className="font-mono text-lg tabular-nums">
                      {formatINR(donation.amount)}
                    </span>
                  </div>
                </div>

                {donation.message && (
                  <div className="mt-6 border-t border-slate-200 pt-5 text-sm text-slate-700">
                    <p className="text-xs font-semibold text-slate-500">
                      Message for {campaign.patientName}
                    </p>
                    <p className="mt-1 italic">“{donation.message}”</p>
                  </div>
                )}

                <p className="mt-8 border-t border-slate-200 pt-5 text-xs leading-relaxed text-slate-500">
                  Notice: This receipt was generated by a frontend-only mock
                  payment simulation for VidaCare preview purposes. No actual
                  funds were charged or processed.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b vc-hairline pb-6">
          <Link
            to={`/campaigns/${campaign.id}`}
            className="inline-flex items-center gap-2 text-sm text-slate-300 transition-colors hover:text-amber-200"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back to {campaign.patientName}’s Story</span>
          </Link>

          <p className="inline-flex items-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="h-4 w-4 text-teal-300" aria-hidden="true" />
            <span>Frontend Payment Simulation Mode</span>
          </p>
        </div>

        {/* Cancelled / Failed Payment Status Notice */}
        {statusNotice && (
          <div
            role="status"
            className={`mt-6 flex items-start justify-between gap-4 rounded-xl border p-4 text-sm ${
              statusNotice.type === 'failed'
                ? 'border-rose-400/35 bg-rose-950/35 text-rose-200'
                : 'border-amber-300/35 bg-amber-950/30 text-amber-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>{statusNotice.text}</p>
            </div>
            <button
              type="button"
              onClick={() => setStatusNotice(null)}
              aria-label="Dismiss notification"
              className="text-slate-300 hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-12">
          {/* Left Form Column */}
          <form
            onSubmit={handleOpenConfirmation}
            noValidate
            className="flex flex-col gap-6 lg:col-span-7"
          >
            <GlassSurface className="flex flex-col gap-6 p-6 sm:p-8">
              <div>
                <p className="text-xs font-medium tracking-[0.14em] text-amber-300">
                  Step 01 · Contribution Amount
                </p>
                <h1 className="mt-1 font-display text-2xl font-semibold text-slate-50 sm:text-3xl">
                  Support {campaign.patientName}’s Treatment
                </h1>
              </div>

              {/* 2. Quick Donation Amounts & Custom Amount */}
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {QUICK_AMOUNTS.map((preset) => {
                    const active = validDisplayAmount === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setAmountInput(String(preset));
                          if (fieldErrors.amount) {
                            setFieldErrors((prev) => ({ ...prev, amount: undefined }));
                          }
                        }}
                        className={`min-h-[44px] rounded-lg font-mono text-sm font-semibold tabular-nums transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                          active
                            ? 'bg-amber-300 text-slate-950 shadow-[0_0_20px_-6px_rgba(251,191,36,0.55)]'
                            : 'border border-slate-800 bg-slate-900/70 text-slate-200 hover:border-sky-300/50 hover:text-white'
                        }`}
                      >
                        {formatINR(preset)}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="donate-custom-amount" className="text-xs font-medium text-slate-300">
                    Custom Amount (₹)
                  </label>
                  <div className="relative">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 font-mono text-sm text-amber-300"
                    >
                      ₹
                    </span>
                    <input
                      id="donate-custom-amount"
                      type="number"
                      min={1}
                      step={1}
                      value={amountInput}
                      onChange={(e) => {
                        setAmountInput(e.target.value);
                        if (fieldErrors.amount) {
                          setFieldErrors((prev) => ({ ...prev, amount: undefined }));
                        }
                      }}
                      placeholder="Enter custom amount"
                      className="min-h-[44px] w-full rounded-lg border border-slate-800 bg-slate-950/75 pr-4 pl-8 font-mono text-sm tabular-nums text-slate-100 placeholder:text-slate-500 focus:border-amber-300/60 focus:outline-none focus:ring-2 focus:ring-amber-300/20"
                    />
                  </div>
                  {fieldErrors.amount && (
                    <p role="alert" className="text-xs text-rose-300">
                      {fieldErrors.amount}
                    </p>
                  )}
                </div>
              </div>
            </GlassSurface>

            {/* 3. Donor Details, 4. Message & 5. Anonymous Donation */}
            <GlassSurface className="flex flex-col gap-5 p-6 sm:p-8">
              <div>
                <p className="text-xs font-medium tracking-[0.14em] text-sky-300">
                  Step 02 · Donor Information
                </p>
                <h2 className="mt-1 font-display text-xl font-semibold text-slate-50">
                  Supporter Details &amp; Encouragement
                </h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label htmlFor="donor-fullname" className="text-xs font-medium text-slate-300">
                    Full Name
                  </label>
                  <input
                    id="donor-fullname"
                    type="text"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (fieldErrors.fullName) {
                        setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
                      }
                    }}
                    placeholder="Jordan Avery"
                    className="min-h-[44px] rounded-lg border border-slate-800 bg-slate-950/75 px-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-300/60 focus:outline-none focus:ring-2 focus:ring-amber-300/20"
                  />
                  {fieldErrors.fullName && (
                    <p role="alert" className="text-xs text-rose-300">
                      {fieldErrors.fullName}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="donor-email" className="text-xs font-medium text-slate-300">
                    Email Address
                  </label>
                  <input
                    id="donor-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) {
                        setFieldErrors((prev) => ({ ...prev, email: undefined }));
                      }
                    }}
                    placeholder="name@example.com"
                    className="min-h-[44px] rounded-lg border border-slate-800 bg-slate-950/75 px-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-300/60 focus:outline-none focus:ring-2 focus:ring-amber-300/20"
                  />
                  {fieldErrors.email && (
                    <p role="alert" className="text-xs text-rose-300">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="donor-mobile" className="text-xs font-medium text-slate-300">
                    Mobile Number
                  </label>
                  <input
                    id="donor-mobile"
                    type="tel"
                    value={mobile}
                    onChange={(e) => {
                      setMobile(e.target.value);
                      if (fieldErrors.mobile) {
                        setFieldErrors((prev) => ({ ...prev, mobile: undefined }));
                      }
                    }}
                    placeholder="+91 98765 43210"
                    className="min-h-[44px] rounded-lg border border-slate-800 bg-slate-950/75 px-3.5 font-mono text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-300/60 focus:outline-none focus:ring-2 focus:ring-amber-300/20"
                  />
                  {fieldErrors.mobile && (
                    <p role="alert" className="text-xs text-rose-300">
                      {fieldErrors.mobile}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="donor-msg" className="text-xs font-medium text-slate-300">
                  Message for the Patient (Optional)
                </label>
                <textarea
                  id="donor-msg"
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={`Share words of strength for ${campaign.patientName}...`}
                  className="rounded-lg border border-slate-800 bg-slate-950/75 p-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-300/60 focus:outline-none focus:ring-2 focus:ring-amber-300/20"
                />
              </div>

              <label className="inline-flex cursor-pointer items-center gap-3 rounded-lg border border-slate-800/80 bg-slate-950/50 p-3.5 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-amber-300 focus:ring-amber-300"
                />
                <span>
                  Hide my name publicly on the campaign donor list (Donate
                  Anonymously)
                </span>
              </label>
            </GlassSurface>

            {/* 6. Payment Methods (Simulation Only) */}
            <GlassSurface className="flex flex-col gap-5 p-6 sm:p-8">
              <div>
                <p className="text-xs font-medium tracking-[0.14em] text-teal-300">
                  Step 03 · Simulated Payment Method
                </p>
                <h2 className="mt-1 font-display text-xl font-semibold text-slate-50">
                  Choose How to Simulate Payment
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Frontend simulation only—no real card details or banking
                  credentials are collected.
                </p>
              </div>

              <div className="grid gap-3">
                {PAYMENT_METHODS.map((method) => {
                  const Icon = method.icon;
                  const active = paymentMethod === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentMethod(method.id)}
                      className={`flex items-start gap-3.5 rounded-xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                        active
                          ? 'border-amber-300/70 bg-amber-300/10'
                          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
                          active
                            ? 'border-amber-300/40 bg-amber-300/15 text-amber-300'
                            : 'border-slate-800 bg-slate-900 text-sky-300'
                        }`}
                      >
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-100">
                          {method.title}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {method.subtitle}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </GlassSurface>
          </form>

          {/* Right Summary Column */}
          <div className="flex flex-col gap-6 lg:col-span-5 lg:sticky lg:top-24">
            {/* 1. Campaign Summary */}
            <GlassSurface className="overflow-hidden">
              {!id && approvedCampaigns.length > 1 && (
                <div className="border-b vc-hairline bg-slate-950/60 px-6 py-4">
                  <label
                    htmlFor="select-campaign-summary"
                    className="block text-xs font-medium text-slate-400"
                  >
                    Supporting Campaign
                  </label>
                  <select
                    id="select-campaign-summary"
                    value={campaign.id}
                    onChange={(e) => setSelectedCampaignId(e.target.value)}
                    className="mt-1.5 min-h-[40px] w-full rounded-lg border border-slate-800 bg-slate-900 px-3 text-xs text-slate-100 focus:border-amber-300/60 focus:outline-none"
                  >
                    {approvedCampaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.patientName} — {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="aspect-[16/10] w-full overflow-hidden bg-slate-950">
                <SafeImage
                  src={campaign.imageUrl}
                  alt={`${campaign.patientName} — ${campaign.condition}`}
                  fallbackTitle={campaign.title}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="flex flex-col gap-4 p-6">
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-sky-300">
                    {campaign.patientName} · {campaign.condition}
                  </p>
                  <h2 className="font-display text-xl font-semibold text-slate-50">
                    {campaign.title}
                  </h2>
                  <p className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                    <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{campaign.hospitalName}</span>
                  </p>
                </div>

                <div className="flex flex-col gap-2 border-t vc-hairline pt-4">
                  <ProgressMeter value={progress} />
                  <div className="flex items-baseline justify-between text-xs">
                    <span>
                      <strong className="font-mono text-sm tabular-nums text-slate-100">
                        {formatINR(campaign.raisedAmount)}
                      </strong>{' '}
                      <span className="text-slate-400">
                        raised of {formatINR(campaign.goalAmount)}
                      </span>
                    </span>
                    <span className="font-mono font-semibold tabular-nums text-amber-300">
                      {progress}%
                    </span>
                  </div>
                </div>
              </div>
            </GlassSurface>

            {/* 7. Payment Summary + 8. Donate Securely */}
            <GlassSurface className="flex flex-col gap-5 p-6 sm:p-7 vc-glow-accent">
              <h3 className="font-display text-xl font-semibold text-slate-50">
                Payment Summary
              </h3>

              <div className="flex flex-col gap-3 border-y vc-hairline py-4 text-sm">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Donation Amount</span>
                  <span className="font-mono font-medium tabular-nums text-slate-100">
                    {formatINR(validDisplayAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Selected Method</span>
                  <span className="text-sky-300">{paymentMethod}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Platform Simulation Fee</span>
                  <span className="font-mono tabular-nums text-teal-300">₹0</span>
                </div>
                <div className="flex items-center justify-between border-t vc-hairline pt-3 text-base font-semibold text-slate-50">
                  <span>Total Contribution</span>
                  <span className="font-mono text-xl tabular-nums text-amber-300">
                    {formatINR(validDisplayAmount)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenConfirmation}
                className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-teal-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_24px_-6px_rgba(45,212,191,0.55)] transition-all hover:bg-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
              >
                <HeartHandshake className="h-4 w-4" aria-hidden="true" />
                <span>Donate Securely · {formatINR(validDisplayAmount)}</span>
              </button>

              <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
                <Lock className="h-3.5 w-3.5 text-sky-300 shrink-0" aria-hidden="true" />
                <span>
                  Mock payment flow only—donations are confirmed after modal review.
                </span>
              </p>
            </GlassSurface>
          </div>
        </div>
      </div>

      {/* Mock Payment Confirmation Modal */}
      {simulationStage !== 'idle' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="mock-payment-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#020611]/85 p-4 backdrop-blur-sm"
        >
          <GlassSurface className="w-full max-w-md p-6 sm:p-8">
            {simulationStage === 'processing' && (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-amber-300" />
                <h3
                  id="mock-payment-title"
                  className="font-display text-xl font-semibold text-slate-50"
                >
                  Simulating {paymentMethod} Authorization…
                </h3>
                <p className="text-xs text-slate-400">
                  Verifying simulated confirmation before updating LocalStorage.
                </p>
              </div>
            )}

            {simulationStage === 'failed' && (
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-rose-400/35 bg-rose-400/15 text-rose-300">
                    <XCircle className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs font-medium tracking-[0.12em] text-rose-300">
                      Simulated Failure
                    </p>
                    <h3
                      id="mock-payment-title"
                      className="font-display text-xl font-semibold text-slate-50"
                    >
                      Payment Authorization Declined
                    </h3>
                  </div>
                </div>

                <p className="text-sm leading-relaxed text-slate-300/90">
                  The simulated {paymentMethod} confirmation did not complete. No
                  contribution was marked successful or saved to LocalStorage.
                </p>

                <div className="flex flex-wrap gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setSimulationStage('confirming')}
                    className="inline-flex min-h-[42px] flex-1 items-center justify-center rounded-lg bg-amber-300 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-200"
                  >
                    Retry Simulation
                  </button>
                  <button
                    type="button"
                    onClick={handleDismissFailed}
                    className="inline-flex min-h-[42px] flex-1 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-200 hover:text-white"
                  >
                    Change Details
                  </button>
                </div>
              </div>
            )}

            {simulationStage === 'confirming' && (
              <div className="flex flex-col gap-5">
                <div className="flex items-start justify-between gap-4 border-b vc-hairline pb-4">
                  <div>
                    <p className="text-xs font-medium tracking-[0.12em] text-amber-300">
                      Mock Payment Gateway
                    </p>
                    <h3
                      id="mock-payment-title"
                      className="mt-1 font-display text-xl font-semibold text-slate-50"
                    >
                      Confirm Simulated Contribution
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelMockPayment}
                    aria-label="Cancel simulated payment"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 text-slate-400 hover:text-white"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-4 text-sm">
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Beneficiary</span>
                    <span className="font-medium text-slate-100">
                      {campaign.patientName}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Method</span>
                    <span className="text-sky-300">{paymentMethod}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Public Name</span>
                    <span className="text-slate-200">
                      {isAnonymous ? 'Anonymous Donor' : fullName}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between border-t vc-hairline pt-2 font-semibold">
                    <span className="text-slate-200">Simulated Total</span>
                    <span className="font-mono text-amber-300">
                      {formatINR(validDisplayAmount)}
                    </span>
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-slate-400">
                  Choose a simulated outcome below. Donations are only saved to
                  LocalStorage after confirmation succeeds.
                </p>

                <div className="flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={handleConfirmMockPayment}
                    className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-teal-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-teal-300"
                  >
                    Confirm &amp; Complete Mock Payment
                  </button>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={handleSimulateFailure}
                      className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-rose-400/35 bg-rose-950/30 px-3 py-2 text-xs font-medium text-rose-200 hover:bg-rose-950/50"
                    >
                      Simulate Failure
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelMockPayment}
                      className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white"
                    >
                      Cancel Payment
                    </button>
                  </div>
                </div>
              </div>
            )}
          </GlassSurface>
        </div>
      )}
    </section>
  );
};
