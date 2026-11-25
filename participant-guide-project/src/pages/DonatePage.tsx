import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  CreditCard,
  FileText,
  Globe,
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

const QUICK_AMOUNTS = [500, 1000, 2500, 5000];
const TIP_PERCENT_OPTIONS = [0, 5, 10] as const;

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
    title: 'Debit / Credit Card',
    subtitle: 'Simulated domestic card authorization',
    icon: CreditCard,
  },
  {
    id: 'Net Banking',
    title: 'Net Banking',
    subtitle: 'Simulated bank portal confirmation',
    icon: Landmark,
  },
  {
    id: 'International Card',
    title: 'International Card',
    subtitle: 'Simulated cross-border card contribution',
    icon: Globe,
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
  const [tipMode, setTipMode] = useState<'0' | '5' | '10' | 'custom'>('0');
  const [customTipInput, setCustomTipInput] = useState<string>('');
  const [fullName, setFullName] = useState<string>(user?.fullName ?? '');
  const [email, setEmail] = useState<string>(user?.email ?? '');
  const [mobile, setMobile] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [wants80GReceipt, setWants80GReceipt] = useState<boolean>(false);
  const [panNumber, setPanNumber] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('UPI');

  const [fieldErrors, setFieldErrors] = useState<{
    amount?: string;
    fullName?: string;
    email?: string;
    mobile?: string;
    panNumber?: string;
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
            <p className="text-[11px] font-semibold tracking-[0.16em] text-[#159B79] uppercase">
              Campaign Unavailable
            </p>
            <h1 className="font-display text-3xl font-bold text-[#123C35]">
              Select an approved medical campaign to continue.
            </h1>
            <p className="text-sm leading-relaxed text-[#414846]">
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

  const computedTipAmount = (() => {
    if (tipMode === 'custom') {
      const parsedTip = Number(customTipInput);
      return Number.isFinite(parsedTip) && parsedTip > 0
        ? Math.round(parsedTip)
        : 0;
    }
    const pct = Number(tipMode);
    if (!Number.isFinite(pct) || pct <= 0 || validDisplayAmount <= 0) return 0;
    return Math.round((validDisplayAmount * pct) / 100);
  })();

  const totalChargeAmount = validDisplayAmount + computedTipAmount;
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

    if (wants80GReceipt) {
      const cleanPan = panNumber.trim().toUpperCase();
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(cleanPan)) {
        errors.panNumber =
          'Enter a valid 10-character PAN (e.g., ABCDE1234F) to generate an 80G summary.';
      }
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
          platformTipAmount: computedTipAmount,
          wants80GReceipt,
          panNumber: wants80GReceipt ? panNumber.trim().toUpperCase() : undefined,
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
    }, 600);
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
      text: 'Simulated payment declined at authorization. No donation was recorded—please review your details and try again.',
    });
  };

  // Success & Printable Contribution Receipt
  if (completedRecord) {
    const { donation, receiptHolderName, receiptEmail, receiptMobile } =
      completedRecord;
    const tipAmt = donation.platformTipAmount ?? 0;

    return (
      <section className="bg-[#F8FAF7] py-12 sm:py-16">
        <div className="mx-auto max-w-[820px] px-4 sm:px-6 lg:px-8">
          {!showReceipt ? (
            <GlassSurface className="flex flex-col gap-6 p-8 sm:p-12 vc-glow-accent">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#159B79]/30 bg-[#DDF3E9] text-[#159B79]">
                  <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.16em] text-[#159B79] uppercase">
                    Simulated Payment Confirmed
                  </p>
                  <h1 className="font-display text-2xl font-bold text-[#123C35] sm:text-3xl">
                    Thank You for Supporting {campaign.patientName}
                  </h1>
                </div>
              </div>

              <p className="text-sm leading-relaxed text-[#414846] sm:text-base">
                Your simulated patient contribution of{' '}
                <span className="vc-numeric font-bold text-[#123C35]">
                  {formatINR(donation.amount)}
                </span>{' '}
                has been recorded in LocalStorage and added to{' '}
                {campaign.patientName}’s campaign progress.
              </p>

              <div className="grid gap-4 rounded-xl border border-[#123C35]/12 bg-[#F8FAF7] p-5 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-[#414846]">Transaction Reference</p>
                  <p className="vc-numeric mt-1 font-semibold text-[#123C35]">
                    {donation.transactionRef}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-[#414846]">Patient Gift (0% Fee)</p>
                  <p className="vc-numeric mt-1 font-bold text-[#159B79]">
                    {formatINR(donation.amount)}
                  </p>
                </div>
                {tipAmt > 0 && (
                  <div>
                    <p className="text-xs font-medium text-[#414846]">
                      Voluntary Platform Operations Tip
                    </p>
                    <p className="vc-numeric mt-1 font-semibold text-[#131E1C]">
                      {formatINR(tipAmt)}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-[#414846]">Public Listing</p>
                  <p className="mt-1 font-semibold text-[#131E1C]">
                    {donation.isAnonymous ? 'Anonymous Donor' : donation.donorName}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-[#414846]">Payment Method</p>
                  <p className="mt-1 font-semibold text-[#131E1C]">
                    {donation.paymentMethod} (Simulation)
                  </p>
                </div>
                {donation.wants80GReceipt && donation.panNumber && (
                  <div>
                    <p className="text-xs font-medium text-[#414846]">80G Summary PAN</p>
                    <p className="vc-numeric mt-1 font-semibold text-[#123C35]">
                      {donation.panNumber}
                    </p>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-[#414846]">Campaign Supported</p>
                  <p className="mt-1 font-semibold text-[#131E1C]">
                    {campaign.title} · {campaign.hospitalName}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReceipt(true)}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#123C35]/20 bg-[#DDF3E9] px-5 py-2.5 text-sm font-semibold text-[#123C35] transition-colors hover:bg-[#159B79] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#159B79]"
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  <span>View Receipt</span>
                </button>
                <VidaButton to={`/campaigns/${campaign.id}`} variant="primary">
                  Return to Campaign
                </VidaButton>
                <VidaButton to="/campaigns" variant="secondary">
                  Browse Campaigns
                </VidaButton>
              </div>
            </GlassSurface>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="print-hide flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setShowReceipt(false)}
                  className="inline-flex items-center gap-2 text-sm font-medium text-[#414846] transition-colors hover:text-[#123C35]"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  <span>Back to Confirmation</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#123C35] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#159B79]"
                >
                  <Printer className="h-4 w-4" aria-hidden="true" />
                  <span>Print Receipt</span>
                </button>
              </div>

              <div className="rounded-2xl border border-[#123C35]/15 bg-white p-8 text-[#131E1C] shadow-sm sm:p-12">
                <div className="flex flex-col justify-between gap-4 border-b border-[#123C35]/12 pb-6 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2.5">
                    <BrandMark className="h-7 w-7" />
                    <div>
                      <p className="font-display text-xl font-bold text-[#123C35]">
                        VidaCare
                      </p>
                      <p className="text-xs text-[#414846]">
                        Contribution Receipt Summary (Simulation)
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-[#414846]">Transaction Reference</p>
                    <p className="vc-numeric text-sm font-semibold text-[#123C35]">
                      {donation.transactionRef}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-6 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-semibold tracking-wider text-[#159B79] uppercase">
                      Supporter Information
                    </p>
                    <p className="mt-2 font-semibold text-[#131E1C]">
                      {receiptHolderName}
                    </p>
                    <p className="text-[#414846]">{receiptEmail}</p>
                    <p className="vc-numeric text-xs text-[#414846]">
                      {receiptMobile}
                    </p>
                    {donation.panNumber && (
                      <p className="vc-numeric mt-1 text-xs font-medium text-[#123C35]">
                        PAN Recorded (80G Summary): {donation.panNumber}
                      </p>
                    )}
                    {donation.isAnonymous && (
                      <p className="mt-1 text-xs text-[#414846]">
                        Public display: Anonymous Donor
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold tracking-wider text-[#159B79] uppercase">
                      Beneficiary Campaign
                    </p>
                    <p className="mt-2 font-semibold text-[#131E1C]">
                      {campaign.title}
                    </p>
                    <p className="text-[#414846]">
                      Patient: {campaign.patientName} ({campaign.ageLabel})
                    </p>
                    <p className="text-[#414846]">{campaign.hospitalName}</p>
                  </div>
                </div>

                <div className="mt-8 rounded-xl border border-[#123C35]/12 bg-[#F8FAF7] p-5">
                  <div className="flex items-center justify-between text-sm text-[#414846]">
                    <span>Contribution Date</span>
                    <span className="vc-numeric text-[#131E1C]">
                      {new Date(donation.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm text-[#414846]">
                    <span>Simulated Payment Method</span>
                    <span className="font-medium text-[#131E1C]">{donation.paymentMethod}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm text-[#414846]">
                    <span>Patient Treatment Gift</span>
                    <span className="vc-numeric font-semibold text-[#123C35]">
                      {formatINR(donation.amount)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm text-[#414846]">
                    <span>Mandatory Platform Deduction</span>
                    <span className="vc-numeric text-[#159B79]">₹0 (0%)</span>
                  </div>
                  {tipAmt > 0 && (
                    <div className="mt-2 flex items-center justify-between text-sm text-[#414846]">
                      <span>Voluntary Operations Support</span>
                      <span className="vc-numeric text-[#131E1C]">{formatINR(tipAmt)}</span>
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-between border-t border-[#123C35]/12 pt-4 text-base font-bold text-[#123C35]">
                    <span>Total Contribution</span>
                    <span className="vc-numeric text-lg">
                      {formatINR(donation.amount + tipAmt)}
                    </span>
                  </div>
                </div>

                {donation.message && (
                  <div className="mt-6 border-t border-[#123C35]/12 pt-5 text-sm text-[#131E1C]">
                    <p className="text-xs font-semibold text-[#414846]">
                      Message for {campaign.patientName}
                    </p>
                    <p className="mt-1 italic text-[#414846]">“{donation.message}”</p>
                  </div>
                )}

                <p className="mt-8 border-t border-[#123C35]/12 pt-5 text-xs leading-relaxed text-[#414846]">
                  Notice: This document was generated by a frontend-only mock
                  payment simulation for VidaCare preview purposes. No actual
                  funds were charged and no statutory tax filing was executed.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="bg-[#F8FAF7] py-10 sm:py-14">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#123C35]/12 pb-6">
          <Link
            to={`/campaigns/${campaign.id}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#414846] transition-colors hover:text-[#123C35]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back to {campaign.patientName}’s Story</span>
          </Link>

          <p className="vc-badge-green">
            <ShieldCheck className="h-4 w-4 text-[#159B79]" aria-hidden="true" />
            <span>Frontend Payment Simulation Mode</span>
          </p>
        </div>

        {statusNotice && (
          <div
            role="status"
            className={`mt-6 flex items-start justify-between gap-4 rounded-xl border p-4 text-sm ${
              statusNotice.type === 'failed'
                ? 'border-red-200 bg-red-50 text-red-800'
                : 'border-amber-200 bg-amber-50 text-amber-800'
            }`}
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p className="font-medium">{statusNotice.text}</p>
            </div>
            <button
              type="button"
              onClick={() => setStatusNotice(null)}
              aria-label="Dismiss notification"
              className="rounded-lg p-1 text-current opacity-75 hover:opacity-100"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-12">
          {/* Left Checkout Form Column */}
          <form
            onSubmit={handleOpenConfirmation}
            noValidate
            className="flex flex-col gap-6 lg:col-span-7"
          >
            {/* Step 01: Contribution & Voluntary Operations Support */}
            <GlassSurface className="flex flex-col gap-6 p-6 sm:p-8">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.14em] text-[#159B79] uppercase">
                  Step 01 · Contribution Amount
                </p>
                <h1 className="mt-1 font-display text-2xl font-bold text-[#123C35] sm:text-3xl">
                  Support {campaign.patientName}’s Treatment
                </h1>
              </div>

              <div className="flex flex-col gap-4">
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
                        className={`vc-numeric min-h-[44px] rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#159B79] ${
                          active
                            ? 'bg-[#123C35] text-white'
                            : 'border border-[#123C35]/18 bg-[#F8FAF7] text-[#131E1C] hover:border-[#159B79] hover:bg-[#DDF3E9]'
                        }`}
                      >
                        {formatINR(preset)}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="donate-custom-amount"
                    className="text-xs font-semibold text-[#131E1C]"
                  >
                    Custom Amount (₹)
                  </label>
                  <div className="relative">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm font-bold text-[#159B79]"
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
                      className="vc-input vc-numeric pl-8"
                    />
                  </div>
                  {fieldErrors.amount && (
                    <p role="alert" className="text-xs font-medium text-red-700">
                      {fieldErrors.amount}
                    </p>
                  )}
                </div>

                {/* Voluntary Platform Operations Contribution */}
                <div className="rounded-xl border border-[#123C35]/12 bg-[#F8FAF7] p-4">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                    <div>
                      <p className="text-xs font-semibold text-[#123C35]">
                        Optional Tip to Sustain 0% Platform Fees
                      </p>
                      <p className="text-[11px] text-[#414846]">
                        100% of your patient gift reaches care; this optional tip supports clinical verification operations.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {TIP_PERCENT_OPTIONS.map((pct) => {
                      const active = tipMode === String(pct);
                      return (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setTipMode(String(pct) as '0' | '5' | '10')}
                          className={`vc-numeric min-h-[36px] rounded-[10px] px-3 py-1 text-xs font-semibold transition-colors ${
                            active
                              ? 'bg-[#159B79] text-white'
                              : 'border border-[#123C35]/15 bg-white text-[#131E1C] hover:bg-[#DDF3E9]'
                          }`}
                        >
                          {pct === 0 ? '0% (No Tip)' : `${pct}% (${formatINR(Math.round((validDisplayAmount * pct) / 100))})`}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setTipMode('custom')}
                      className={`min-h-[36px] rounded-[10px] px-3 py-1 text-xs font-semibold transition-colors ${
                        tipMode === 'custom'
                          ? 'bg-[#159B79] text-white'
                          : 'border border-[#123C35]/15 bg-white text-[#131E1C] hover:bg-[#DDF3E9]'
                      }`}
                    >
                      Custom ₹
                    </button>
                  </div>
                  {tipMode === 'custom' && (
                    <div className="mt-3 max-w-[200px]">
                      <input
                        type="number"
                        min={0}
                        value={customTipInput}
                        onChange={(e) => setCustomTipInput(e.target.value)}
                        placeholder="Enter tip in ₹"
                        aria-label="Custom platform support tip"
                        className="vc-input vc-numeric"
                      />
                    </div>
                  )}
                </div>
              </div>
            </GlassSurface>

            {/* Step 02: Supporter Information & Conditional 80G PAN */}
            <GlassSurface className="flex flex-col gap-5 p-6 sm:p-8">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.14em] text-[#159B79] uppercase">
                  Step 02 · Donor Information
                </p>
                <h2 className="mt-1 font-display text-xl font-bold text-[#123C35]">
                  Supporter Details &amp; Receipt Preferences
                </h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label htmlFor="donor-fullname" className="text-xs font-semibold text-[#131E1C]">
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
                    className="vc-input"
                  />
                  {fieldErrors.fullName && (
                    <p role="alert" className="text-xs font-medium text-red-700">
                      {fieldErrors.fullName}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="donor-email" className="text-xs font-semibold text-[#131E1C]">
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
                    className="vc-input"
                  />
                  {fieldErrors.email && (
                    <p role="alert" className="text-xs font-medium text-red-700">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="donor-mobile" className="text-xs font-semibold text-[#131E1C]">
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
                    className="vc-input vc-numeric"
                  />
                  {fieldErrors.mobile && (
                    <p role="alert" className="text-xs font-medium text-red-700">
                      {fieldErrors.mobile}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="donor-msg" className="text-xs font-semibold text-[#131E1C]">
                  Message for the Patient (Optional)
                </label>
                <textarea
                  id="donor-msg"
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={`Share words of strength for ${campaign.patientName}...`}
                  className="vc-input py-3"
                />
              </div>

              <div className="flex flex-col gap-3">
                <label className="inline-flex cursor-pointer items-center gap-3 rounded-xl border border-[#123C35]/12 bg-[#F8FAF7] p-3.5 text-sm font-medium text-[#131E1C]">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="h-4 w-4 rounded border-[#159B79]/40 bg-white accent-[#159B79]"
                  />
                  <span>Hide my name publicly on the donor wall (Donate Anonymously)</span>
                </label>

                <div className="rounded-xl border border-[#123C35]/12 bg-[#F8FAF7] p-3.5">
                  <label className="inline-flex cursor-pointer items-center gap-3 text-sm font-medium text-[#131E1C]">
                    <input
                      type="checkbox"
                      checked={wants80GReceipt}
                      onChange={(e) => {
                        setWants80GReceipt(e.target.checked);
                        if (!e.target.checked) {
                          setFieldErrors((prev) => ({ ...prev, panNumber: undefined }));
                        }
                      }}
                      className="h-4 w-4 rounded border-[#159B79]/40 bg-white accent-[#159B79]"
                    />
                    <span>Include 80G Tax Deduction Summary (Demo Preview)</span>
                  </label>

                  {wants80GReceipt && (
                    <div className="mt-3 flex flex-col gap-1.5 pl-7">
                      <label htmlFor="donor-pan" className="text-xs font-semibold text-[#131E1C]">
                        PAN Number (for simulated tax receipt)
                      </label>
                      <input
                        id="donor-pan"
                        type="text"
                        maxLength={10}
                        value={panNumber}
                        onChange={(e) => {
                          setPanNumber(e.target.value.toUpperCase());
                          if (fieldErrors.panNumber) {
                            setFieldErrors((prev) => ({ ...prev, panNumber: undefined }));
                          }
                        }}
                        placeholder="ABCDE1234F"
                        className="vc-input vc-numeric uppercase max-w-xs"
                      />
                      {fieldErrors.panNumber && (
                        <p role="alert" className="text-xs font-medium text-red-700">
                          {fieldErrors.panNumber}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </GlassSurface>

            {/* Step 03: Payment Method Selection */}
            <GlassSurface className="flex flex-col gap-5 p-6 sm:p-8">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.14em] text-[#159B79] uppercase">
                  Step 03 · Simulated Payment Method
                </p>
                <h2 className="mt-1 font-display text-xl font-bold text-[#123C35]">
                  Choose Simulation Rail
                </h2>
                <p className="mt-1 text-xs text-[#414846]">
                  Frontend checkout simulation only—no live card numbers or banking
                  credentials are transmitted.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {PAYMENT_METHODS.map((method) => {
                  const Icon = method.icon;
                  const active = paymentMethod === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentMethod(method.id)}
                      className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#159B79] ${
                        active
                          ? 'border-[#159B79] bg-[#DDF3E9]/55'
                          : 'border-[#123C35]/12 bg-[#F8FAF7] hover:border-[#159B79]/50 hover:bg-[#DDF3E9]/25'
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                          active
                            ? 'border-[#159B79]/30 bg-white text-[#159B79]'
                            : 'border-[#123C35]/15 bg-white text-[#123C35]'
                        }`}
                      >
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-[#123C35]">
                          {method.title}
                        </p>
                        <p className="mt-0.5 text-xs text-[#414846]">
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
            <GlassSurface className="overflow-hidden">
              {!id && approvedCampaigns.length > 1 && (
                <div className="border-b border-[#123C35]/10 bg-[#F8FAF7] px-6 py-4">
                  <label
                    htmlFor="select-campaign-summary"
                    className="block text-xs font-semibold text-[#131E1C]"
                  >
                    Supporting Campaign
                  </label>
                  <select
                    id="select-campaign-summary"
                    value={campaign.id}
                    onChange={(e) => setSelectedCampaignId(e.target.value)}
                    className="vc-input mt-1.5 text-xs"
                  >
                    {approvedCampaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.patientName} — {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="aspect-[16/10] w-full overflow-hidden bg-[#DDF3E9]">
                <SafeImage
                  src={campaign.imageUrl}
                  alt={`${campaign.patientName} — ${campaign.condition}`}
                  fallbackTitle={campaign.title}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="flex flex-col gap-4 p-6">
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-semibold text-[#159B79]">
                    {campaign.patientName} · {campaign.condition}
                  </p>
                  <h2 className="font-display text-xl font-bold text-[#123C35]">
                    {campaign.title}
                  </h2>
                  <p className="inline-flex items-center gap-1.5 text-xs text-[#414846]">
                    <Building2 className="h-3.5 w-3.5 text-[#159B79]" aria-hidden="true" />
                    <span>{campaign.hospitalName}</span>
                  </p>
                </div>

                <div className="flex flex-col gap-2 border-t border-[#123C35]/10 pt-4">
                  <ProgressMeter value={progress} />
                  <div className="vc-numeric flex items-baseline justify-between text-xs">
                    <span>
                      <strong className="text-sm font-bold text-[#123C35]">
                        {formatINR(campaign.raisedAmount)}
                      </strong>{' '}
                      <span className="text-[#414846]">
                        of {formatINR(campaign.goalAmount)}
                      </span>
                    </span>
                    <span className="font-bold text-[#159B79]">{progress}%</span>
                  </div>
                </div>
              </div>
            </GlassSurface>

            {/* Payment Breakdown Card */}
            <GlassSurface className="flex flex-col gap-5 p-6 sm:p-7 vc-glow-accent">
              <h3 className="font-display text-xl font-bold text-[#123C35]">
                Contribution Summary
              </h3>

              <div className="flex flex-col gap-3 border-y border-[#123C35]/10 py-4 text-sm">
                <div className="flex items-center justify-between text-[#414846]">
                  <span>Patient Care Gift</span>
                  <span className="vc-numeric font-semibold text-[#131E1C]">
                    {formatINR(validDisplayAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#414846]">
                  <span>Platform Fee Deduction</span>
                  <span className="vc-numeric font-semibold text-[#159B79]">₹0 (0%)</span>
                </div>
                {computedTipAmount > 0 && (
                  <div className="flex items-center justify-between text-[#414846]">
                    <span>Voluntary Operations Tip</span>
                    <span className="vc-numeric font-semibold text-[#131E1C]">
                      {formatINR(computedTipAmount)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-[#414846]">
                  <span>Simulation Rail</span>
                  <span className="font-semibold text-[#123C35]">{paymentMethod}</span>
                </div>
                <div className="flex items-center justify-between border-t border-[#123C35]/10 pt-3 text-base font-bold text-[#123C35]">
                  <span>Total Contribution</span>
                  <span className="vc-numeric text-xl text-[#123C35]">
                    {formatINR(totalChargeAmount)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenConfirmation}
                className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#123C35] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#159B79] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#159B79] focus-visible:ring-offset-2"
              >
                <HeartHandshake className="h-4 w-4" aria-hidden="true" />
                <span className="vc-numeric">
                  Complete Contribution · {formatINR(totalChargeAmount)}
                </span>
              </button>

              <p className="flex items-center justify-center gap-1.5 text-center text-xs text-[#414846]">
                <Lock className="h-3.5 w-3.5 shrink-0 text-[#159B79]" aria-hidden="true" />
                <span>
                  Mock payment flow only—confirmed after simulation dialog.
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#123C35]/45 p-4 backdrop-blur-sm"
        >
          <GlassSurface className="w-full max-w-md p-6 sm:p-8">
            {simulationStage === 'processing' && (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#DDF3E9] border-t-[#159B79]" />
                <h3
                  id="mock-payment-title"
                  className="font-display text-xl font-bold text-[#123C35]"
                >
                  Simulating {paymentMethod} Authorization…
                </h3>
                <p className="text-xs text-[#414846]">
                  Verifying simulated confirmation before updating LocalStorage.
                </p>
              </div>
            )}

            {simulationStage === 'failed' && (
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600">
                    <XCircle className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold tracking-[0.14em] text-red-700 uppercase">
                      Simulated Failure
                    </p>
                    <h3
                      id="mock-payment-title"
                      className="font-display text-xl font-bold text-[#123C35]"
                    >
                      Payment Authorization Declined
                    </h3>
                  </div>
                </div>

                <p className="text-sm leading-relaxed text-[#414846]">
                  The simulated {paymentMethod} confirmation did not complete. No
                  contribution was marked successful or saved.
                </p>

                <div className="flex flex-wrap gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setSimulationStage('confirming')}
                    className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-[#123C35] px-4 py-2 text-xs font-semibold text-white hover:bg-[#159B79]"
                  >
                    Retry Simulation
                  </button>
                  <button
                    type="button"
                    onClick={handleDismissFailed}
                    className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-[#123C35]/20 bg-[#F8FAF7] px-4 py-2 text-xs font-semibold text-[#123C35] hover:bg-[#DDF3E9]"
                  >
                    Change Details
                  </button>
                </div>
              </div>
            )}

            {simulationStage === 'confirming' && (
              <div className="flex flex-col gap-5">
                <div className="flex items-start justify-between gap-4 border-b border-[#123C35]/12 pb-4">
                  <div>
                    <p className="text-[11px] font-semibold tracking-[0.14em] text-[#159B79] uppercase">
                      Simulated Payment Gateway
                    </p>
                    <h3
                      id="mock-payment-title"
                      className="mt-1 font-display text-xl font-bold text-[#123C35]"
                    >
                      Confirm Contribution
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelMockPayment}
                    aria-label="Cancel simulated payment"
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#123C35]/15 bg-[#F8FAF7] text-[#414846] hover:bg-[#DDF3E9] hover:text-[#123C35]"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="rounded-xl border border-[#123C35]/12 bg-[#F8FAF7] p-4 text-sm">
                  <div className="flex justify-between py-1">
                    <span className="text-[#414846]">Beneficiary</span>
                    <span className="font-semibold text-[#131E1C]">
                      {campaign.patientName}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[#414846]">Method</span>
                    <span className="font-semibold text-[#159B79]">{paymentMethod}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[#414846]">Patient Gift</span>
                    <span className="vc-numeric font-medium text-[#131E1C]">
                      {formatINR(validDisplayAmount)}
                    </span>
                  </div>
                  {computedTipAmount > 0 && (
                    <div className="flex justify-between py-1">
                      <span className="text-[#414846]">Operations Tip</span>
                      <span className="vc-numeric font-medium text-[#131E1C]">
                        {formatINR(computedTipAmount)}
                      </span>
                    </div>
                  )}
                  <div className="mt-2 flex justify-between border-t border-[#123C35]/10 pt-2 font-bold">
                    <span className="text-[#123C35]">Simulated Total</span>
                    <span className="vc-numeric text-[#123C35]">
                      {formatINR(totalChargeAmount)}
                    </span>
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-[#414846]">
                  Choose a simulated outcome below. Donations are only saved after confirmation succeeds.
                </p>

                <div className="flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={handleConfirmMockPayment}
                    className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[#123C35] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#159B79]"
                  >
                    Confirm &amp; Complete Simulation
                  </button>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={handleSimulateFailure}
                      className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                    >
                      Simulate Failure
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelMockPayment}
                      className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-[#123C35]/20 bg-[#F8FAF7] px-3 py-2 text-xs font-semibold text-[#123C35] hover:bg-[#DDF3E9]"
                    >
                      Cancel
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
