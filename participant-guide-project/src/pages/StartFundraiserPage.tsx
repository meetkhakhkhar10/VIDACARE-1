import React, { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  FileText,
  HeartHandshake,
  ImagePlus,
  Loader2,
  ShieldCheck,
  Trash2,
  Upload,
  AlertCircle,
} from 'lucide-react';
import { useVidaCare } from '../context/VidaCareContext';
import { MedicalCategory, MedicalDocument } from '../types/campaign';
import { formatINR } from '../lib/format';
import { generateUniqueId } from '../lib/storage';
import { GlassSurface, VidaButton } from '../components/ui/DesignPrimitives';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_DOCUMENT_FILES = 5;

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

export const StartFundraiserPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, activeCategories, createUserCampaign } = useVidaCare();

  const [step, setStep] = useState<number>(1);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successCampaignId, setSuccessCampaignId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [patientName, setPatientName] = useState('');
  const [ageLabel, setAgeLabel] = useState('');
  const [relation, setRelation] = useState('Parent / Family Member');
  const [category, setCategory] = useState<MedicalCategory>(
    activeCategories[0]?.name || 'Heart Surgery'
  );
  const [condition, setCondition] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [location, setLocation] = useState('');
  const [goalAmount, setGoalAmount] = useState('250000');
  const [summary, setSummary] = useState('');
  const [treatmentDetails, setTreatmentDetails] = useState('');

  // Upload states
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoFileName, setPhotoFileName] = useState<string>('');
  const [photoError, setPhotoError] = useState<string>('');

  const [uploadedDocs, setUploadedDocs] = useState<MedicalDocument[]>([]);
  const [docError, setDocError] = useState<string>('');
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);

  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const docsInputRef = useRef<HTMLInputElement | null>(null);

  if (!user) {
    return (
      <section className="py-20">
        <div className="mx-auto max-w-[640px] px-4">
          <GlassSurface className="flex flex-col items-start gap-5 p-8 sm:p-12">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#16A085]">
              Authentication Required
            </p>
            <h1 className="font-display text-3xl font-bold text-[#123C35]">
              Sign in to Start a Medical Fundraiser
            </h1>
            <p className="text-sm leading-relaxed text-[#71807A]">
              To ensure full compliance and connect campaigns securely to patient
              organizers, VidaCare requires an active account before initiating a
              verified care campaign.
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
        issuedBy: hospitalName.trim() || 'Accredited Medical Center',
        issuedDate: new Date().toLocaleDateString('en-IN', {
          month: 'short',
          day: '2-digit',
          year: 'numeric',
        }),
        fileSize: sizeLabel,
        verified: false,
        summary: `Uploaded clinical document (${file.name}, ${sizeLabel}). Pending hospital verification.`,
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
        setError('Patient age / DOB is required.');
        return false;
      }
      if (!location.trim()) {
        setError('Patient location (City, State) is required.');
        return false;
      }
    } else if (currentStep === 2) {
      if (!hospitalName.trim()) {
        setError('Treating hospital name is required.');
        return false;
      }
      if (!condition.trim()) {
        setError('Medical condition or diagnosis is required.');
        return false;
      }
    } else if (currentStep === 3) {
      const numGoal = Number(goalAmount);
      if (!Number.isFinite(numGoal) || numGoal < 1000) {
        setError('Fundraising goal must be at least ₹1,000.');
        return false;
      }
      if (!title.trim()) {
        setError('Campaign title is required.');
        return false;
      }
      if (!summary.trim()) {
        setError('Patient story & need summary is required.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(5, prev + 1));
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

    setSuccessCampaignId(created.id);
  };

  if (successCampaignId) {
    return (
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-[680px] px-4">
          <GlassSurface className="flex flex-col items-center text-center gap-6 p-8 sm:p-12 shadow-md">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#DDF3E9] text-[#16A085]">
              <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wider text-[#16A085] uppercase">
                Campaign Successfully Submitted
              </p>
              <h1 className="mt-1 font-display text-3xl font-bold text-[#123C35]">
                Thank You for Initiating Care for {patientName}
              </h1>
            </div>
            <p className="text-sm leading-relaxed text-[#71807A]">
              Your fundraiser has been recorded in shared LocalStorage and assigned to our
              clinical audit team. It is currently in{' '}
              <strong className="text-[#123C35]">Pending</strong> status while hospital
              billing estimates and doctor notes are verified.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <VidaButton to={`/campaigns/${successCampaignId}`} variant="primary">
                Preview Campaign
              </VidaButton>
              <VidaButton to="/dashboard" variant="secondary">
                Go to My Dashboard
              </VidaButton>
            </div>
          </GlassSurface>
        </div>
      </section>
    );
  }

  const stepsList = [
    'Patient Details',
    'Clinical Info',
    'Goal & Story',
    'Medical Dossier',
    'Review & Submit',
  ];

  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-[900px] px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#71807A] hover:text-[#123C35]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back to Dashboard</span>
          </Link>
          <span className="font-mono text-xs font-semibold text-[#16A085]">
            Step {step} of 5
          </span>
        </div>

        <GlassSurface className="p-8 sm:p-12 shadow-lg">
          <div className="mb-10 border-b border-[#123C35]/10 pb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#16A085]">
              Secure Campaign Wizard
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold text-[#123C35]">
              Start a Medical Fundraiser
            </h1>
            <p className="mt-1.5 text-sm text-[#71807A]">
              Complete the verified intake process to raise funds directly for hospital bills.
            </p>

            {/* Stepper indicator */}
            <div className="mt-6 hidden sm:flex items-center justify-between gap-2">
              {stepsList.map((sLabel, idx) => {
                const sNum = idx + 1;
                const isPassed = step > sNum;
                const isCurrent = step === sNum;
                return (
                  <div key={sLabel} className="flex items-center gap-2">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                        isPassed
                          ? 'bg-[#16A085] text-white'
                          : isCurrent
                          ? 'bg-[#123C35] text-white'
                          : 'bg-[#DDF3E9] text-[#71807A]'
                      }`}
                    >
                      {isPassed ? '✓' : sNum}
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        isCurrent ? 'text-[#123C35] font-bold' : 'text-[#71807A]'
                      }`}
                    >
                      {sLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
            {error && (
              <div
                role="alert"
                className="flex items-center gap-3 rounded-xl border border-rose-400/40 bg-rose-50 p-4 text-xs font-medium text-rose-800"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            {/* Step 1: Patient Details */}
            {step === 1 && (
              <div className="flex flex-col gap-5">
                <h2 className="font-display text-xl font-bold text-[#123C35]">
                  01. Patient Information
                </h2>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label htmlFor="sf-patient" className="text-xs font-semibold text-[#202B29]">
                      Patient Full Name *
                    </label>
                    <input
                      id="sf-patient"
                      type="text"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="e.g., Aarav Patel"
                      className="min-h-[46px] rounded-xl border border-[#123C35]/20 bg-white px-4 text-sm text-[#202B29] focus:border-[#16A085] focus:outline-none focus:ring-2 focus:ring-[#16A085]/20"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="sf-age" className="text-xs font-semibold text-[#202B29]">
                      Patient Age / DOB *
                    </label>
                    <input
                      id="sf-age"
                      type="text"
                      value={ageLabel}
                      onChange={(e) => setAgeLabel(e.target.value)}
                      placeholder="e.g., Age 34 or DOB"
                      className="min-h-[46px] rounded-xl border border-[#123C35]/20 bg-white px-4 text-sm text-[#202B29] focus:border-[#16A085] focus:outline-none focus:ring-2 focus:ring-[#16A085]/20"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="sf-relation" className="text-xs font-semibold text-[#202B29]">
                      Your Relation to Patient *
                    </label>
                    <select
                      id="sf-relation"
                      value={relation}
                      onChange={(e) => setRelation(e.target.value)}
                      className="min-h-[46px] rounded-xl border border-[#123C35]/20 bg-white px-3.5 text-sm text-[#202B29] focus:border-[#16A085] focus:outline-none"
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
                    <label htmlFor="sf-location" className="text-xs font-semibold text-[#202B29]">
                      Patient City / Location *
                    </label>
                    <input
                      id="sf-location"
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g., Mumbai, Maharashtra"
                      className="min-h-[46px] rounded-xl border border-[#123C35]/20 bg-white px-4 text-sm text-[#202B29] focus:border-[#16A085] focus:outline-none focus:ring-2 focus:ring-[#16A085]/20"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Clinical Details */}
            {step === 2 && (
              <div className="flex flex-col gap-5">
                <h2 className="font-display text-xl font-bold text-[#123C35]">
                  02. Clinical Details &amp; Hospital
                </h2>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="sf-category" className="text-xs font-semibold text-[#202B29]">
                      Medical Specialty / Category *
                    </label>
                    <select
                      id="sf-category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value as MedicalCategory)}
                      className="min-h-[46px] rounded-xl border border-[#123C35]/20 bg-white px-3.5 text-sm text-[#202B29] focus:border-[#16A085] focus:outline-none"
                    >
                      {activeCategories.map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.displayTitle || cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="sf-condition" className="text-xs font-semibold text-[#202B29]">
                      Medical Condition / Diagnosis *
                    </label>
                    <input
                      id="sf-condition"
                      type="text"
                      value={condition}
                      onChange={(e) => setCondition(e.target.value)}
                      placeholder="e.g., Acute Myeloid Leukemia / CABG"
                      className="min-h-[46px] rounded-xl border border-[#123C35]/20 bg-white px-4 text-sm text-[#202B29] focus:border-[#16A085] focus:outline-none focus:ring-2 focus:ring-[#16A085]/20"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label htmlFor="sf-hospital" className="text-xs font-semibold text-[#202B29]">
                      Treating Hospital Name *
                    </label>
                    <input
                      id="sf-hospital"
                      type="text"
                      value={hospitalName}
                      onChange={(e) => setHospitalName(e.target.value)}
                      placeholder="e.g., Tata Memorial Hospital, Mumbai"
                      className="min-h-[46px] rounded-xl border border-[#123C35]/20 bg-white px-4 text-sm text-[#202B29] focus:border-[#16A085] focus:outline-none focus:ring-2 focus:ring-[#16A085]/20"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Target Amount & Story */}
            {step === 3 && (
              <div className="flex flex-col gap-5">
                <h2 className="font-display text-xl font-bold text-[#123C35]">
                  03. Target Amount &amp; Campaign Story
                </h2>

                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="sf-goal" className="text-xs font-semibold text-[#202B29]">
                      Fundraising Goal (₹) *
                    </label>
                    <div className="relative">
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-mono text-base font-bold text-[#16A085]"
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
                        className="min-h-[46px] w-full rounded-xl border border-[#123C35]/20 bg-white pr-4 pl-9 font-mono text-base font-semibold text-[#123C35] focus:border-[#16A085] focus:outline-none focus:ring-2 focus:ring-[#16A085]/20"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="sf-title" className="text-xs font-semibold text-[#202B29]">
                      Campaign Headline *
                    </label>
                    <input
                      id="sf-title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Urgent Bone Marrow Transplant Support for Aarav"
                      className="min-h-[46px] rounded-xl border border-[#123C35]/20 bg-white px-4 text-sm text-[#202B29] focus:border-[#16A085] focus:outline-none focus:ring-2 focus:ring-[#16A085]/20"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="sf-summary" className="text-xs font-semibold text-[#202B29]">
                      Patient Story &amp; Care Need *
                    </label>
                    <textarea
                      id="sf-summary"
                      rows={4}
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      placeholder="Explain the patient's care journey, hospital prognosis, and how funds will be applied..."
                      className="rounded-xl border border-[#123C35]/20 bg-white p-4 text-sm text-[#202B29] focus:border-[#16A085] focus:outline-none focus:ring-2 focus:ring-[#16A085]/20"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="sf-treatment" className="text-xs font-semibold text-[#202B29]">
                      Planned Treatment Breakdown (Optional)
                    </label>
                    <input
                      id="sf-treatment"
                      type="text"
                      value={treatmentDetails}
                      onChange={(e) => setTreatmentDetails(e.target.value)}
                      placeholder="e.g., Chemotherapy cycles, ICU stay, and post-transplant care"
                      className="min-h-[46px] rounded-xl border border-[#123C35]/20 bg-white px-4 text-sm text-[#202B29] focus:border-[#16A085] focus:outline-none focus:ring-2 focus:ring-[#16A085]/20"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Secure Document Upload */}
            {step === 4 && (
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="font-display text-xl font-bold text-[#123C35]">
                    04. Secure Clinical Dossier &amp; Photo Upload
                  </h2>
                  <p className="mt-1 text-xs text-[#71807A]">
                    Upload hospital estimation sheets, doctor notes, and patient photos for clinical verification.
                  </p>
                </div>

                {/* Patient Photo */}
                <div className="flex flex-col gap-3 rounded-2xl border border-[#123C35]/15 bg-[#F8FAF7] p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-[#123C35] uppercase tracking-wide">
                        Patient Photo (Optional)
                      </span>
                      <p className="text-[11px] text-[#71807A]">
                        JPG, PNG, or WEBP up to 5 MB.
                      </p>
                    </div>
                  </div>

                  {!photoPreviewUrl ? (
                    <label
                      htmlFor="sf-photo-input"
                      className="flex cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-dashed border-[#16A085]/40 bg-white px-4 py-4 text-xs font-semibold text-[#123C35] hover:bg-[#DDF3E9]/30 transition-colors"
                    >
                      <ImagePlus className="h-4 w-4 text-[#16A085]" aria-hidden="true" />
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
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={photoPreviewUrl}
                          alt="Patient preview"
                          className="h-14 w-16 rounded-lg object-cover border border-[#123C35]/10"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-[#123C35]">
                            {photoFileName}
                          </p>
                          <p className="text-[10px] text-[#16A085]">Ready for review</p>
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
                        className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  {photoError && <p className="text-xs text-rose-600">{photoError}</p>}
                </div>

                {/* Drag and Drop Medical Documents Area */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#123C35] uppercase tracking-wide">
                      Medical Documents &amp; Estimations (Max {MAX_DOCUMENT_FILES})
                    </span>
                    <span className="font-mono text-xs text-[#71807A]">
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
                        ? 'border-[#16A085] bg-[#DDF3E9]/40'
                        : 'border-[#123C35]/20 bg-[#F8FAF7] hover:border-[#16A085]/60'
                    }`}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#DDF3E9] text-[#16A085]">
                      <Upload className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#123C35]">
                        Drag and drop your medical documents here
                      </p>
                      <p className="mt-1 text-xs text-[#71807A]">
                        PDF, JPG, PNG, or WEBP up to 5 MB each (Hospital estimate letters, prescriptions, lab reports)
                      </p>
                    </div>
                    <label className="cursor-pointer rounded-xl bg-[#123C35] px-4 py-2 text-xs font-semibold text-white hover:bg-[#16A085] transition-colors">
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

                  {docError && <p className="text-xs text-rose-600">{docError}</p>}

                  {uploadedDocs.length > 0 && (
                    <div className="flex flex-col gap-2.5 pt-2">
                      {uploadedDocs.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-[#123C35]/15 bg-white p-3.5"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#DDF3E9] text-[#123C35]">
                              <FileText className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-[#123C35]">
                                {doc.fileName || doc.title}
                              </p>
                              <p className="text-[11px] text-[#71807A]">
                                {doc.fileSize} · {doc.docType}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (doc.previewUrl) URL.revokeObjectURL(doc.previewUrl);
                              setUploadedDocs((prev) => prev.filter((d) => d.id !== doc.id));
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                            aria-label="Remove document"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 5: Review & Submit */}
            {step === 5 && (
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="font-display text-xl font-bold text-[#123C35]">
                    05. Review Campaign Summary
                  </h2>
                  <p className="mt-1 text-xs text-[#71807A]">
                    Verify your campaign details before submitting for clinical audit.
                  </p>
                </div>

                <div className="grid gap-4 rounded-2xl border border-[#123C35]/15 bg-[#F8FAF7] p-6 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-[#71807A]">Campaign Headline</span>
                      <p className="font-semibold text-[#123C35]">{title || `Medical Care for ${patientName}`}</p>
                    </div>
                    <div>
                      <span className="text-xs text-[#71807A]">Patient Name</span>
                      <p className="font-semibold text-[#123C35]">{patientName} ({ageLabel})</p>
                    </div>
                    <div>
                      <span className="text-xs text-[#71807A]">Medical Specialty</span>
                      <p className="font-semibold text-[#123C35]">{category}</p>
                    </div>
                    <div>
                      <span className="text-xs text-[#71807A]">Treating Hospital</span>
                      <p className="font-semibold text-[#123C35]">{hospitalName} ({location})</p>
                    </div>
                    <div>
                      <span className="text-xs text-[#71807A]">Fundraising Goal</span>
                      <p className="font-mono font-bold text-[#16A085]">{formatINR(Number(goalAmount) || 0)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-[#71807A]">Attached Documents</span>
                      <p className="font-semibold text-[#123C35]">{uploadedDocs.length} files attached</p>
                    </div>
                  </div>

                  <div className="border-t border-[#123C35]/10 pt-4">
                    <span className="text-xs text-[#71807A]">Story Summary</span>
                    <p className="mt-1 text-xs leading-relaxed text-[#202B29]">{summary}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-[#16A085]/30 bg-[#DDF3E9]/50 p-4 text-xs text-[#123C35] flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-[#16A085] shrink-0" aria-hidden="true" />
                  <span>
                    By submitting, you confirm that all provided medical information is accurate and authorized for hospital verification.
                  </span>
                </div>
              </div>
            )}

            {/* Wizard Navigation Footer */}
            <div className="flex items-center justify-between border-t border-[#123C35]/10 pt-6 mt-2">
              {step > 1 ? (
                <VidaButton type="button" variant="secondary" onClick={handlePrev}>
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  <span>Previous</span>
                </VidaButton>
              ) : (
                <div />
              )}

              {step < 5 ? (
                <VidaButton type="button" variant="primary" onClick={handleNext}>
                  <span>Continue</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </VidaButton>
              ) : (
                <VidaButton type="submit" variant="primary" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      <span>Submitting for Audit…</span>
                    </>
                  ) : (
                    <>
                      <span>Submit for Medical Audit</span>
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
