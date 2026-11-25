import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  FileText,
  ImagePlus,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { useVidaCare } from '../context/VidaCareContext';
import { MedicalCategory, MedicalDocument } from '../types/campaign';
import { formatINR } from '../lib/format';
import { generateUniqueId, safeParseJSON, safeStorageGet, safeStorageSet } from '../lib/storage';
import { GlassSurface, VidaButton } from '../components/ui/DesignPrimitives';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_DOCUMENT_FILES = 5;
const DRAFT_KEY_PREFIX = 'vidacare_fundraiser_draft_v1_';

const PARTNER_HOSPITALS = [
  { name: "St. Jude Children's Heart Pavilion", city: 'Boston, MA' },
  { name: 'Mercy Comprehensive Cancer Center', city: 'Chicago, IL' },
  { name: 'Cleveland Clinic Transplant Institute', city: 'Cleveland, OH' },
  { name: 'Tata Memorial Oncology Center', city: 'Mumbai, Maharashtra' },
  { name: 'All India Institute of Medical Sciences (AIIMS)', city: 'New Delhi, Delhi' },
  { name: 'Apollo Specialty Heart & Renal Institute', city: 'Chennai, Tamil Nadu' },
];

const QUICK_GOALS = [150000, 350000, 500000, 1000000];

const WIZARD_STEPS = [
  'Patient Info',
  'Clinical Details',
  'Funding & Story',
  'Medical Documents',
  'KYC & Settlement',
  'Review & Submit',
];

function formatFileSizeLabel(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function resolveUploadMime(file: File, allowPdf: boolean): string | null {
  const mime = (file.type || '').toLowerCase();
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'image/jpeg';
  if (mime === 'image/png') return 'image/png';
  if (mime === 'image/webp') return 'image/webp';
  if (allowPdf && mime === 'application/pdf') return 'application/pdf';

  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (allowPdf && ext === 'pdf') return 'application/pdf';
  return null;
}

interface FundraiserDraftPayload {
  step: number;
  title: string;
  patientName: string;
  ageLabel: string;
  relation: string;
  category: string;
  condition: string;
  hospitalName: string;
  location: string;
  treatingDoctor: string;
  goalAmount: string;
  summary: string;
  treatmentDetails: string;
  kycIdType: string;
  kycLastFour: string;
  settlementPreference: 'Direct Hospital Billing' | 'Patient Reimbursement';
  savedAt: string;
}

export const StartFundraiserPage: React.FC = () => {
  const { user, activeCategories, createUserCampaign } = useVidaCare();

  const [step, setStep] = useState<number>(1);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successCampaignId, setSuccessCampaignId] = useState<string | null>(null);
  const [draftRestoredAt, setDraftRestoredAt] = useState<string | null>(null);
  const [lastAutosavedAt, setLastAutosavedAt] = useState<string | null>(null);

  // Step 1: Patient Info
  const [patientName, setPatientName] = useState('');
  const [ageLabel, setAgeLabel] = useState('');
  const [relation, setRelation] = useState('Parent / Family Member');
  const [location, setLocation] = useState('');

  // Step 2: Clinical Details
  const [category, setCategory] = useState<MedicalCategory>(
    activeCategories[0]?.name || 'Heart Surgery'
  );
  const [condition, setCondition] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [treatingDoctor, setTreatingDoctor] = useState('');

  // Step 3: Funding & Story
  const [goalAmount, setGoalAmount] = useState('350000');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [treatmentDetails, setTreatmentDetails] = useState('');

  // Step 4: Upload states
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoFileName, setPhotoFileName] = useState<string>('');
  const [photoError, setPhotoError] = useState<string>('');
  const [uploadedDocs, setUploadedDocs] = useState<MedicalDocument[]>([]);
  const [docError, setDocError] = useState<string>('');
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);

  // Step 5: Organizer KYC & Settlement
  const [kycIdType, setKycIdType] = useState('Aadhaar Reference');
  const [kycLastFour, setKycLastFour] = useState('');
  const [settlementPreference, setSettlementPreference] = useState<
    'Direct Hospital Billing' | 'Patient Reimbursement'
  >('Direct Hospital Billing');
  const [declarationChecked, setDeclarationChecked] = useState(false);

  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const docsInputRef = useRef<HTMLInputElement | null>(null);
  const draftHydratedRef = useRef(false);

  const draftKey = user ? `${DRAFT_KEY_PREFIX}${user.id}` : '';

  // Restore saved draft for signed-in user once on mount
  useEffect(() => {
    if (!user || !draftKey || draftHydratedRef.current) return;
    draftHydratedRef.current = true;
    const read = safeStorageGet(draftKey);
    if (!read.ok || !read.raw) return;
    const parsed = safeParseJSON<FundraiserDraftPayload>(read.raw);
    if (!parsed.ok || !parsed.value) return;
    const d = parsed.value;
    if (
      d.patientName ||
      d.title ||
      d.hospitalName ||
      d.condition ||
      d.summary
    ) {
      setStep(Math.min(6, Math.max(1, d.step || 1)));
      setPatientName(d.patientName || '');
      setAgeLabel(d.ageLabel || '');
      setRelation(d.relation || 'Parent / Family Member');
      setLocation(d.location || '');
      if (d.category) setCategory(d.category);
      setCondition(d.condition || '');
      setHospitalName(d.hospitalName || '');
      setTreatingDoctor(d.treatingDoctor || '');
      setGoalAmount(d.goalAmount || '350000');
      setTitle(d.title || '');
      setSummary(d.summary || '');
      setTreatmentDetails(d.treatmentDetails || '');
      setKycIdType(d.kycIdType || 'Aadhaar Reference');
      setKycLastFour(d.kycLastFour || '');
      setSettlementPreference(d.settlementPreference || 'Direct Hospital Billing');
      setDraftRestoredAt(d.savedAt || 'earlier session');
    }
  }, [user, draftKey]);

  // Autosave draft cleanly when user edits fields
  useEffect(() => {
    if (!user || !draftKey || successCampaignId) return;
    const hasContent = Boolean(
      patientName.trim() ||
        title.trim() ||
        condition.trim() ||
        hospitalName.trim() ||
        summary.trim()
    );
    if (!hasContent) return;

    const timer = window.setTimeout(() => {
      const nowLabel = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      const payload: FundraiserDraftPayload = {
        step,
        title,
        patientName,
        ageLabel,
        relation,
        category,
        condition,
        hospitalName,
        location,
        treatingDoctor,
        goalAmount,
        summary,
        treatmentDetails,
        kycIdType,
        kycLastFour,
        settlementPreference,
        savedAt: nowLabel,
      };
      const res = safeStorageSet(draftKey, JSON.stringify(payload));
      if (res.ok) {
        setLastAutosavedAt(nowLabel);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [
    user,
    draftKey,
    successCampaignId,
    step,
    title,
    patientName,
    ageLabel,
    relation,
    category,
    condition,
    hospitalName,
    location,
    treatingDoctor,
    goalAmount,
    summary,
    treatmentDetails,
    kycIdType,
    kycLastFour,
    settlementPreference,
  ]);

  const handleDiscardDraft = () => {
    if (draftKey && typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(draftKey);
      } catch {
        // Ignore storage error
      }
    }
    setStep(1);
    setPatientName('');
    setAgeLabel('');
    setRelation('Parent / Family Member');
    setLocation('');
    setCondition('');
    setHospitalName('');
    setTreatingDoctor('');
    setGoalAmount('350000');
    setTitle('');
    setSummary('');
    setTreatmentDetails('');
    setKycLastFour('');
    setDeclarationChecked(false);
    setDraftRestoredAt(null);
    setLastAutosavedAt(null);
    setError('');
  };

  if (!user) {
    return (
      <section className="bg-[#F8FAF7] py-20">
        <div className="mx-auto max-w-[640px] px-4">
          <GlassSurface className="flex flex-col items-start gap-5 p-8 sm:p-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#159B79]">
              Authentication Required
            </p>
            <h1 className="font-display text-3xl font-bold text-[#123C35]">
              Sign in to Start a Medical Fundraiser
            </h1>
            <p className="text-sm leading-relaxed text-[#414846]">
              To link campaigns securely with patient organizers and hospital
              verification desks, VidaCare requires a signed-in account before
              starting our 6-step intake wizard.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <VidaButton to="/login" variant="primary">
                Sign In to Account
              </VidaButton>
              <VidaButton to="/signup" variant="secondary">
                Create Free Account
              </VidaButton>
            </div>
          </GlassSurface>
        </div>
      </section>
    );
  }

  const handlePhotoChange = (file: File) => {
    setPhotoError('');
    const mime = resolveUploadMime(file, false);
    if (!mime) {
      setPhotoError('Please upload a valid JPG, PNG, or WEBP image.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setPhotoError('Patient photo must be under 5 MB.');
      return;
    }
    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
    const url = URL.createObjectURL(file);
    setPhotoPreviewUrl(url);
    setPhotoFileName(file.name);
  };

  const handleDocsAdd = (files: FileList | File[]) => {
    setDocError('');
    const fileArray = Array.from(files);
    if (uploadedDocs.length + fileArray.length > MAX_DOCUMENT_FILES) {
      setDocError(`Maximum ${MAX_DOCUMENT_FILES} documents allowed.`);
      return;
    }

    const nextDocs: MedicalDocument[] = [];
    const errors: string[] = [];

    for (const file of fileArray) {
      const mime = resolveUploadMime(file, true);
      if (!mime) {
        errors.push(`“${file.name}” is not a supported PDF or image.`);
        continue;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        errors.push(`“${file.name}” exceeds 5 MB limit.`);
        continue;
      }

      const sizeLabel = formatFileSizeLabel(file.size);
      const previewUrl = URL.createObjectURL(file);
      const cleanTitle = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');

      nextDocs.push({
        id: generateUniqueId('doc'),
        title: cleanTitle || file.name,
        docType: mime === 'application/pdf' ? 'Treatment Estimate' : 'Diagnostic Report',
        issuedBy: hospitalName.trim() || 'Treating Medical Center',
        issuedDate: new Date().toLocaleDateString('en-IN', {
          month: 'short',
          day: '2-digit',
          year: 'numeric',
        }),
        fileSize: sizeLabel,
        verified: false,
        summary: `Uploaded clinical record (${file.name}, ${sizeLabel}). Pending clinical verification.`,
        referenceCode: `REF-${Math.floor(10000 + Math.random() * 90000)}`,
        fileName: file.name,
        mimeType: mime,
        previewUrl,
        isTemporaryPreview: true,
      });
    }

    if (nextDocs.length > 0) {
      setUploadedDocs((prev) => [...prev, ...nextDocs]);
    }
    if (errors.length > 0) {
      setDocError(errors[0]);
    }
  };

  const handleUpdateDocType = (
    docId: string,
    docType: MedicalDocument['docType']
  ) => {
    setUploadedDocs((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, docType } : d))
    );
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleDocsAdd(e.dataTransfer.files);
    }
  };

  const validateStep = (currentStep: number): boolean => {
    setError('');
    if (currentStep === 1) {
      if (!patientName.trim()) {
        setError('Patient full name is required.');
        return false;
      }
      if (!ageLabel.trim()) {
        setError('Patient age or date of birth is required.');
        return false;
      }
      if (!location.trim()) {
        setError('Patient city and state are required.');
        return false;
      }
    } else if (currentStep === 2) {
      if (!condition.trim()) {
        setError('Primary medical condition or diagnosis is required.');
        return false;
      }
      if (!hospitalName.trim()) {
        setError('Treating hospital name is required.');
        return false;
      }
    } else if (currentStep === 3) {
      const numGoal = Number(goalAmount);
      if (!Number.isFinite(numGoal) || numGoal < 1000) {
        setError('Fundraising goal must be at least ₹1,000.');
        return false;
      }
      if (!title.trim()) {
        setError('Campaign headline is required.');
        return false;
      }
      if (!summary.trim()) {
        setError('Patient story & clinical need summary is required.');
        return false;
      }
    } else if (currentStep === 5) {
      if (kycLastFour.trim() && !/^[A-Za-z0-9]{4}$/.test(kycLastFour.trim())) {
        setError('Verification suffix must be 4 alphanumeric characters (e.g., 4821).');
        return false;
      }
      if (!declarationChecked) {
        setError('Please confirm the accuracy declaration before reviewing your intake.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(6, prev + 1));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    setError('');
    setStep((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const numGoal = Number(goalAmount);
    if (!numGoal || numGoal < 1000) {
      setError('Please provide a valid goal amount of at least ₹1,000.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const created = createUserCampaign({
      title: title.trim() || `Medical Care for ${patientName.trim()}`,
      patientName: patientName.trim(),
      ageLabel: ageLabel.trim(),
      condition: condition.trim(),
      category,
      hospitalName: hospitalName.trim(),
      location: location.trim(),
      treatingDoctor: treatingDoctor.trim() || undefined,
      organizerRelation: relation,
      settlementPreference,
      goalAmount: numGoal,
      summary: summary.trim(),
      treatmentDetails: treatmentDetails.trim() || summary.trim(),
      imageUrl: photoPreviewUrl || undefined,
      documents: uploadedDocs,
    });

    setIsSubmitting(false);

    if (!created) {
      setError('A campaign with this title already exists or submission was blocked.');
      return;
    }

    if (draftKey && typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(draftKey);
      } catch {
        // Ignore storage error
      }
    }

    setSuccessCampaignId(created.id);
  };

  if (successCampaignId) {
    return (
      <section className="bg-[#F8FAF7] py-16 sm:py-24">
        <div className="mx-auto max-w-[680px] px-4">
          <GlassSurface className="flex flex-col items-center gap-6 p-8 text-center shadow-md sm:p-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#DDF3E9] text-[#159B79]">
              <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-[0.16em] text-[#159B79] uppercase">
                Intake Submitted for Review
              </p>
              <h1 className="mt-1 font-display text-3xl font-bold text-[#123C35]">
                Fundraiser Queued for {patientName}
              </h1>
            </div>
            <p className="text-sm leading-relaxed text-[#414846]">
              Your fundraiser has been saved in LocalStorage with{' '}
              <strong className="text-[#123C35]">Pending Verification</strong> status.
              It will appear in the public directory once our clinical operations
              console approves your hospital estimate and records.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <VidaButton to="/dashboard/campaigner" variant="primary">
                Open Campaigner Portal
              </VidaButton>
              <VidaButton to="/campaigns" variant="secondary">
                Browse Public Directory
              </VidaButton>
            </div>
          </GlassSurface>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-[#F8FAF7] py-10 sm:py-14">
      <div className="mx-auto max-w-[920px] px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/dashboard/campaigner"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#414846] hover:text-[#123C35]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back to Campaigner Portal</span>
          </Link>
          <div className="flex items-center gap-3">
            {lastAutosavedAt && (
              <span className="vc-numeric text-xs text-[#414846]">
                Draft saved at {lastAutosavedAt}
              </span>
            )}
            <span className="vc-numeric rounded-lg bg-[#DDF3E9] px-3 py-1 text-xs font-semibold text-[#123C35]">
              Step {step} of 6
            </span>
          </div>
        </div>

        {draftRestoredAt && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#159B79]/30 bg-[#DDF3E9]/60 px-4 py-3 text-xs text-[#123C35]">
            <span>
              Resumed your autosaved fundraiser draft ({draftRestoredAt}).
            </span>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="inline-flex items-center gap-1.5 font-semibold text-[#123C35] underline-offset-2 hover:underline"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Start Fresh</span>
            </button>
          </div>
        )}

        <GlassSurface className="p-6 sm:p-10">
          <div className="mb-8 border-b border-[#123C35]/10 pb-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#159B79]">
              6-Step Clinical Intake
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold text-[#123C35]">
              Start a Medical Fundraiser
            </h1>
            <p className="mt-1.5 text-sm text-[#414846]">
              Provide verified patient, hospital, and billing details for clinical
              desk review.
            </p>

            {/* Desktop 6-Step Indicator */}
            <div className="mt-6 hidden grid-cols-6 gap-2 md:grid">
              {WIZARD_STEPS.map((label, idx) => {
                const sNum = idx + 1;
                const isPassed = step > sNum;
                const isCurrent = step === sNum;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      if (sNum <= step) {
                        setError('');
                        setStep(sNum);
                      }
                    }}
                    disabled={sNum > step}
                    className={`flex flex-col items-start gap-1.5 rounded-xl border p-2.5 text-left transition-colors ${
                      isCurrent
                        ? 'border-[#159B79] bg-[#DDF3E9]/55'
                        : isPassed
                        ? 'border-[#123C35]/15 bg-white hover:bg-[#F8FAF7] cursor-pointer'
                        : 'border-[#123C35]/10 bg-[#F8FAF7] opacity-65 cursor-default'
                    }`}
                  >
                    <span
                      className={`vc-numeric flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                        isPassed
                          ? 'bg-[#159B79] text-white'
                          : isCurrent
                          ? 'bg-[#123C35] text-white'
                          : 'bg-[#DDF3E9] text-[#414846]'
                      }`}
                    >
                      {isPassed ? '✓' : sNum}
                    </span>
                    <span
                      className={`text-[11px] leading-tight ${
                        isCurrent ? 'font-bold text-[#123C35]' : 'font-medium text-[#414846]'
                      }`}
                    >
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
            {error && (
              <div
                role="alert"
                className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            {/* Step 1: Patient Info */}
            {step === 1 && (
              <div className="flex flex-col gap-5">
                <h2 className="font-display text-xl font-bold text-[#123C35]">
                  01. Patient Information
                </h2>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label htmlFor="sf-patient" className="text-xs font-semibold text-[#131E1C]">
                      Patient Full Name *
                    </label>
                    <input
                      id="sf-patient"
                      type="text"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="e.g., Aarav Patel"
                      className="vc-input"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="sf-age" className="text-xs font-semibold text-[#131E1C]">
                      Patient Age / DOB *
                    </label>
                    <input
                      id="sf-age"
                      type="text"
                      value={ageLabel}
                      onChange={(e) => setAgeLabel(e.target.value)}
                      placeholder="e.g., Age 34"
                      className="vc-input"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="sf-relation" className="text-xs font-semibold text-[#131E1C]">
                      Your Relation to Patient *
                    </label>
                    <select
                      id="sf-relation"
                      value={relation}
                      onChange={(e) => setRelation(e.target.value)}
                      className="vc-input"
                    >
                      <option value="Self">Self</option>
                      <option value="Parent / Family Member">Parent / Family Member</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Sibling">Sibling</option>
                      <option value="Treating Doctor / Social Worker">Treating Doctor / Social Worker</option>
                      <option value="Friend / Care Coordinator">Friend / Care Coordinator</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label htmlFor="sf-location" className="text-xs font-semibold text-[#131E1C]">
                      Patient City / State *
                    </label>
                    <input
                      id="sf-location"
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g., Mumbai, Maharashtra"
                      className="vc-input"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Clinical Details & Hospital Directory */}
            {step === 2 && (
              <div className="flex flex-col gap-5">
                <h2 className="font-display text-xl font-bold text-[#123C35]">
                  02. Clinical Details &amp; Treating Hospital
                </h2>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="sf-category" className="text-xs font-semibold text-[#131E1C]">
                      Medical Specialty *
                    </label>
                    <select
                      id="sf-category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value as MedicalCategory)}
                      className="vc-input"
                    >
                      {activeCategories.map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.displayTitle || cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="sf-condition" className="text-xs font-semibold text-[#131E1C]">
                      Medical Condition / Diagnosis *
                    </label>
                    <input
                      id="sf-condition"
                      type="text"
                      value={condition}
                      onChange={(e) => setCondition(e.target.value)}
                      placeholder="e.g., Congenital Mitral Valve Anomaly"
                      className="vc-input"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label htmlFor="sf-hospital" className="text-xs font-semibold text-[#131E1C]">
                      Treating Hospital Name *
                    </label>
                    <input
                      id="sf-hospital"
                      type="text"
                      value={hospitalName}
                      onChange={(e) => setHospitalName(e.target.value)}
                      placeholder="e.g., Tata Memorial Oncology Center"
                      className="vc-input"
                    />
                  </div>

                  {/* Accredited Hospital Quick Selector */}
                  <div className="sm:col-span-2 rounded-xl border border-[#123C35]/10 bg-[#F8FAF7] p-4">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-[#123C35]">
                      <Building2 className="h-3.5 w-3.5 text-[#159B79]" aria-hidden="true" />
                      <span>Partner Hospital Suggestions (Click to Autofill)</span>
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {PARTNER_HOSPITALS.map((h) => (
                        <button
                          key={h.name}
                          type="button"
                          onClick={() => {
                            setHospitalName(h.name);
                            if (!location.trim()) setLocation(h.city);
                          }}
                          className="rounded-lg border border-[#123C35]/15 bg-white px-2.5 py-1 text-[11px] font-medium text-[#123C35] transition-colors hover:border-[#159B79] hover:bg-[#DDF3E9]"
                        >
                          {h.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label htmlFor="sf-doctor" className="text-xs font-semibold text-[#131E1C]">
                      Treating Physician / Department (Optional)
                    </label>
                    <input
                      id="sf-doctor"
                      type="text"
                      value={treatingDoctor}
                      onChange={(e) => setTreatingDoctor(e.target.value)}
                      placeholder="e.g., Dr. Catherine Lin · Pediatric Cardiology"
                      className="vc-input"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Funding Requirements & Story */}
            {step === 3 && (
              <div className="flex flex-col gap-5">
                <h2 className="font-display text-xl font-bold text-[#123C35]">
                  03. Funding Requirements &amp; Patient Story
                </h2>

                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="sf-goal" className="text-xs font-semibold text-[#131E1C]">
                      Fundraising Goal (₹) *
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_GOALS.map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setGoalAmount(String(g))}
                          className={`vc-numeric min-h-[36px] rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                            Number(goalAmount) === g
                              ? 'bg-[#123C35] text-white'
                              : 'border border-[#123C35]/15 bg-[#F8FAF7] text-[#131E1C] hover:bg-[#DDF3E9]'
                          }`}
                        >
                          {formatINR(g)}
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-base font-bold text-[#159B79]"
                      >
                        ₹
                      </span>
                      <input
                        id="sf-goal"
                        type="number"
                        min={1000}
                        step={5000}
                        value={goalAmount}
                        onChange={(e) => setGoalAmount(e.target.value)}
                        className="vc-input vc-numeric pl-9 font-semibold"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="sf-title" className="text-xs font-semibold text-[#131E1C]">
                      Campaign Headline *
                    </label>
                    <input
                      id="sf-title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Urgent Valve Reconstruction & ICU Recovery for Aarav"
                      className="vc-input"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="sf-summary" className="text-xs font-semibold text-[#131E1C]">
                      Patient Story &amp; Care Need *
                    </label>
                    <textarea
                      id="sf-summary"
                      rows={4}
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      placeholder="Describe the patient's diagnosis, medical journey, and how donations will support care..."
                      className="vc-input min-h-[112px] py-3"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="sf-treatment" className="text-xs font-semibold text-[#131E1C]">
                      Cost Breakdown / Planned Treatment (Optional)
                    </label>
                    <input
                      id="sf-treatment"
                      type="text"
                      value={treatmentDetails}
                      onChange={(e) => setTreatmentDetails(e.target.value)}
                      placeholder="e.g., Surgical procedure, 10-day ICU stay, post-operative medications"
                      className="vc-input"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Medical Documents & Photo */}
            {step === 4 && (
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="font-display text-xl font-bold text-[#123C35]">
                    04. Medical Documents &amp; Patient Photo
                  </h2>
                  <p className="mt-1 text-xs text-[#414846]">
                    Attach hospital cost estimates, diagnostic summaries, and an optional patient photo.
                  </p>
                </div>

                {/* Patient Photo */}
                <div className="flex flex-col gap-3 rounded-2xl border border-[#123C35]/12 bg-[#F8FAF7] p-5">
                  <div>
                    <span className="text-xs font-semibold tracking-wide text-[#123C35] uppercase">
                      Patient Photo (Optional)
                    </span>
                    <p className="text-[11px] text-[#414846]">
                      JPG, PNG, or WEBP up to 5 MB.
                    </p>
                  </div>

                  {!photoPreviewUrl ? (
                    <label
                      htmlFor="sf-photo-input"
                      className="flex cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-dashed border-[#159B79]/40 bg-white px-4 py-4 text-xs font-semibold text-[#123C35] transition-colors hover:bg-[#DDF3E9]/35"
                    >
                      <ImagePlus className="h-4 w-4 text-[#159B79]" aria-hidden="true" />
                      <span>Select Patient Photo</span>
                      <input
                        ref={photoInputRef}
                        id="sf-photo-input"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handlePhotoChange(f);
                        }}
                        className="sr-only"
                      />
                    </label>
                  ) : (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#123C35]/15 bg-white p-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <img
                          src={photoPreviewUrl}
                          alt="Patient preview"
                          className="h-14 w-16 rounded-lg border border-[#123C35]/10 object-cover"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-[#123C35]">
                            {photoFileName}
                          </p>
                          <p className="text-[11px] text-[#159B79]">Ready for review</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
                          setPhotoPreviewUrl(null);
                          setPhotoFileName('');
                          if (photoInputRef.current) photoInputRef.current.value = '';
                        }}
                        className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  {photoError && <p className="text-xs text-red-700">{photoError}</p>}
                </div>

                {/* Drag and Drop Medical Documents */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold tracking-wide text-[#123C35] uppercase">
                      Medical Documents (Max {MAX_DOCUMENT_FILES})
                    </span>
                    <span className="vc-numeric text-xs text-[#414846]">
                      {uploadedDocs.length}/{MAX_DOCUMENT_FILES} attached
                    </span>
                  </div>

                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingOver(true);
                    }}
                    onDragLeave={() => setIsDraggingOver(false)}
                    onDrop={handleDrop}
                    className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
                      isDraggingOver
                        ? 'border-[#159B79] bg-[#DDF3E9]/45'
                        : 'border-[#123C35]/20 bg-[#F8FAF7] hover:border-[#159B79]/60'
                    }`}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#DDF3E9] text-[#159B79]">
                      <Upload className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#123C35]">
                        Drag and drop clinical records here
                      </p>
                      <p className="mt-1 text-xs text-[#414846]">
                        PDF, JPG, PNG, or WEBP up to 5 MB each (Treatment estimates, prescriptions, lab reports)
                      </p>
                    </div>
                    <label className="cursor-pointer rounded-xl bg-[#123C35] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#159B79]">
                      Browse Files
                      <input
                        ref={docsInputRef}
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={(e) => {
                          if (e.target.files) handleDocsAdd(e.target.files);
                          if (docsInputRef.current) docsInputRef.current.value = '';
                        }}
                        className="sr-only"
                      />
                    </label>
                  </div>

                  {docError && <p className="text-xs text-red-700">{docError}</p>}

                  {uploadedDocs.length > 0 && (
                    <div className="flex flex-col gap-2.5 pt-2">
                      {uploadedDocs.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex flex-col justify-between gap-3 rounded-xl border border-[#123C35]/15 bg-white p-3.5 sm:flex-row sm:items-center"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#DDF3E9] text-[#123C35]">
                              <FileText className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-[#123C35]">
                                {doc.fileName || doc.title}
                              </p>
                              <p className="vc-numeric text-[11px] text-[#414846]">
                                {doc.fileSize} · {doc.referenceCode}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <select
                              aria-label={`Document type for ${doc.fileName || doc.title}`}
                              value={doc.docType}
                              onChange={(e) =>
                                handleUpdateDocType(
                                  doc.id,
                                  e.target.value as MedicalDocument['docType']
                                )
                              }
                              className="vc-input min-h-[36px] w-auto text-xs"
                            >
                              <option value="Treatment Estimate">Treatment Estimate</option>
                              <option value="Diagnostic Report">Diagnostic Report</option>
                              <option value="Hospital Verification">Hospital Verification</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => {
                                if (doc.previewUrl) URL.revokeObjectURL(doc.previewUrl);
                                setUploadedDocs((prev) =>
                                  prev.filter((d) => d.id !== doc.id)
                                );
                              }}
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                              aria-label="Remove document"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 5: Organizer KYC & Settlement Details */}
            {step === 5 && (
              <div className="flex flex-col gap-5">
                <div>
                  <h2 className="font-display text-xl font-bold text-[#123C35]">
                    05. Organizer Verification &amp; Settlement Preferences
                  </h2>
                  <p className="mt-1 text-xs text-[#414846]">
                    Specify organizer identity reference and preferred hospital disbursement mode.
                  </p>
                </div>

                <div className="grid gap-4 rounded-xl border border-[#123C35]/12 bg-[#F8FAF7] p-4 text-xs sm:grid-cols-2">
                  <div>
                    <span className="font-medium text-[#414846]">Organizer Account</span>
                    <p className="mt-0.5 font-semibold text-[#131E1C]">{user.fullName}</p>
                  </div>
                  <div>
                    <span className="font-medium text-[#414846]">Verified Email</span>
                    <p className="mt-0.5 font-semibold text-[#131E1C]">{user.email}</p>
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="sf-kyc-type" className="text-xs font-semibold text-[#131E1C]">
                      Organizer ID Reference Type (Intake Demo)
                    </label>
                    <select
                      id="sf-kyc-type"
                      value={kycIdType}
                      onChange={(e) => setKycIdType(e.target.value)}
                      className="vc-input"
                    >
                      <option value="Aadhaar Reference">Aadhaar Reference (Masked)</option>
                      <option value="PAN Card">PAN Card</option>
                      <option value="Passport / Driver's License">Passport / Driver’s License</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="sf-kyc-suffix" className="text-xs font-semibold text-[#131E1C]">
                      Last 4 Characters (Optional)
                    </label>
                    <input
                      id="sf-kyc-suffix"
                      type="text"
                      maxLength={4}
                      value={kycLastFour}
                      onChange={(e) => setKycLastFour(e.target.value.toUpperCase())}
                      placeholder="e.g., 4821"
                      className="vc-input vc-numeric uppercase"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-[#131E1C]">
                    Preferred Disbursement Route
                  </span>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(
                      [
                        {
                          id: 'Direct Hospital Billing',
                          desc: 'Funds routed directly to the hospital billing ledger against patient UHID.',
                        },
                        {
                          id: 'Patient Reimbursement',
                          desc: 'Disbursed to verified family account against submitted pharmacy & clinic invoices.',
                        },
                      ] as const
                    ).map((opt) => {
                      const active = settlementPreference === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSettlementPreference(opt.id)}
                          className={`rounded-xl border-2 p-4 text-left transition-colors ${
                            active
                              ? 'border-[#159B79] bg-[#DDF3E9]/50'
                              : 'border-[#123C35]/12 bg-white hover:border-[#159B79]/40'
                          }`}
                        >
                          <p className="text-sm font-bold text-[#123C35]">{opt.id}</p>
                          <p className="mt-1 text-xs leading-relaxed text-[#414846]">
                            {opt.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="inline-flex cursor-pointer items-start gap-3 rounded-xl border border-[#123C35]/15 bg-[#F8FAF7] p-4 text-xs leading-relaxed text-[#131E1C]">
                  <input
                    type="checkbox"
                    checked={declarationChecked}
                    onChange={(e) => setDeclarationChecked(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-[#159B79]/40 accent-[#159B79]"
                  />
                  <span>
                    I confirm that all patient details, hospital estimates, and uploaded
                    records are genuine and authorized for review by VidaCare’s clinical
                    verification desk.
                  </span>
                </label>
              </div>
            )}

            {/* Step 6: Full Review & Submit */}
            {step === 6 && (
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="font-display text-xl font-bold text-[#123C35]">
                    06. Review &amp; Submit for Clinical Review
                  </h2>
                  <p className="mt-1 text-xs text-[#414846]">
                    Inspect each section below. Use “Edit” to adjust any step before submitting.
                  </p>
                </div>

                <div className="grid gap-4 rounded-2xl border border-[#123C35]/15 bg-[#F8FAF7] p-6 text-sm">
                  <div className="flex items-center justify-between border-b border-[#123C35]/10 pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#159B79]">
                      Patient &amp; Clinical Overview
                    </span>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-xs font-semibold text-[#123C35] hover:text-[#159B79]"
                    >
                      Edit Info
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <span className="text-xs text-[#414846]">Patient &amp; Age</span>
                      <p className="font-semibold text-[#123C35]">
                        {patientName} ({ageLabel})
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-[#414846]">Specialty &amp; Diagnosis</span>
                      <p className="font-semibold text-[#123C35]">
                        {category} · {condition}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-[#414846]">Hospital &amp; Location</span>
                      <p className="font-semibold text-[#123C35]">
                        {hospitalName} ({location})
                      </p>
                      {treatingDoctor && (
                        <p className="text-xs text-[#414846]">{treatingDoctor}</p>
                      )}
                    </div>
                    <div>
                      <span className="text-xs text-[#414846]">Fundraising Goal</span>
                      <p className="vc-numeric font-bold text-[#159B79]">
                        {formatINR(Number(goalAmount) || 0)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-[#123C35]/10 pt-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#159B79]">
                      Headline &amp; Narrative
                    </span>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="text-xs font-semibold text-[#123C35] hover:text-[#159B79]"
                    >
                      Edit Story
                    </button>
                  </div>
                  <div>
                    <p className="font-semibold text-[#123C35]">
                      {title || `Medical Care for ${patientName}`}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[#414846]">
                      {summary}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-[#123C35]/10 pt-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#159B79]">
                      Documents &amp; Settlement
                    </span>
                    <button
                      type="button"
                      onClick={() => setStep(4)}
                      className="text-xs font-semibold text-[#123C35] hover:text-[#159B79]"
                    >
                      Edit Files
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                    <div>
                      <span className="text-[#414846]">Medical Records</span>
                      <p className="font-semibold text-[#123C35]">
                        {uploadedDocs.length} attached ·{' '}
                        {photoPreviewUrl ? 'Photo ready' : 'Default category photo'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[#414846]">Disbursement Route</span>
                      <p className="font-semibold text-[#123C35]">
                        {settlementPreference} ({kycIdType})
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-[#159B79]/30 bg-[#DDF3E9]/55 p-4 text-xs text-[#123C35]">
                  <ShieldCheck className="h-5 w-5 shrink-0 text-[#159B79]" aria-hidden="true" />
                  <span>
                    Upon submission, this fundraiser enters Pending Clinical Review
                    until approved in the Admin Operations Console.
                  </span>
                </div>
              </div>
            )}

            {/* Wizard Navigation Footer */}
            <div className="mt-2 flex items-center justify-between border-t border-[#123C35]/10 pt-6">
              {step > 1 ? (
                <VidaButton type="button" variant="secondary" onClick={handlePrev}>
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  <span>Previous</span>
                </VidaButton>
              ) : (
                <div />
              )}

              {step < 6 ? (
                <VidaButton type="button" variant="primary" onClick={handleNext}>
                  <span>Continue</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </VidaButton>
              ) : (
                <VidaButton type="submit" variant="primary" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      <span>Submitting Intake…</span>
                    </>
                  ) : (
                    <>
                      <span>Submit for Clinical Review</span>
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    </>
                  )}
                </VidaButton>
              )}
            </div>
          </form>
        </GlassSurface>
      </div>
    </section>
  );
};
