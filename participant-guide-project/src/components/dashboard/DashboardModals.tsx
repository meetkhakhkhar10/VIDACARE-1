import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Eye,
  FileCheck2,
  FileText,
  ImagePlus,
  Loader2,
  Printer,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  DonationRecord,
  MedicalCampaign,
  MedicalCategory,
  MedicalDocument,
  UserSession,
} from '../../types/campaign';
import { formatINR } from '../../lib/format';
import { generateUniqueId } from '../../lib/storage';
import { useVidaCare } from '../../context/VidaCareContext';
import { BrandMark, GlassSurface, VidaButton } from '../ui/DesignPrimitives';

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

function revokeUrlSafe(url?: string) {
  if (!url || !url.startsWith('blob:')) return;
  if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // Ignore revoke errors
    }
  }
}

interface PhotoUploadPreview {
  url: string;
  fileName: string;
  fileSize: string;
  mimeType: string;
}

interface CreateFundraiserModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (input: {
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
  }) => MedicalCampaign | null | void;
}

export const CreateFundraiserModal: React.FC<CreateFundraiserModalProps> = ({
  open,
  onClose,
  onCreate,
}) => {
  const { activeCategories, campaigns, user } = useVidaCare();
  const [title, setTitle] = useState('');
  const [patientName, setPatientName] = useState('');
  const [ageLabel, setAgeLabel] = useState('');
  const [condition, setCondition] = useState('');
  const [category, setCategory] = useState<MedicalCategory>(
    activeCategories[0]?.name || 'Heart Surgery'
  );
  const [hospitalName, setHospitalName] = useState('');
  const [location, setLocation] = useState('');
  const [goalAmount, setGoalAmount] = useState('25000');
  const [summary, setSummary] = useState('');
  const [treatmentDetails, setTreatmentDetails] = useState('');
  const [error, setError] = useState('');

  // Temporary browser upload states (not persisted to LocalStorage)
  const [photoPreview, setPhotoPreview] = useState<PhotoUploadPreview | null>(null);
  const [photoStatus, setPhotoStatus] = useState<'idle' | 'preparing' | 'ready' | 'error'>('idle');
  const [photoError, setPhotoError] = useState('');

  const [uploadedDocs, setUploadedDocs] = useState<MedicalDocument[]>([]);
  const [docStatus, setDocStatus] = useState<'idle' | 'preparing' | 'ready' | 'error'>('idle');
  const [docError, setDocError] = useState('');
  const [activePreviewDocId, setActivePreviewDocId] = useState<string | null>(null);

  const submitLockRef = useRef(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const docsInputRef = useRef<HTMLInputElement | null>(null);
  const photoPreviewRef = useRef<PhotoUploadPreview | null>(null);
  const uploadedDocsRef = useRef<MedicalDocument[]>([]);

  photoPreviewRef.current = photoPreview;
  uploadedDocsRef.current = uploadedDocs;

  const cleanupDraftUploads = useCallback(() => {
    if (photoPreviewRef.current?.url) {
      revokeUrlSafe(photoPreviewRef.current.url);
    }
    uploadedDocsRef.current.forEach((doc) => revokeUrlSafe(doc.previewUrl));
    setPhotoPreview(null);
    setPhotoStatus('idle');
    setPhotoError('');
    setUploadedDocs([]);
    setDocStatus('idle');
    setDocError('');
    setActivePreviewDocId(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
    if (docsInputRef.current) docsInputRef.current.value = '';
  }, []);

  const handleCancelClose = useCallback(() => {
    cleanupDraftUploads();
    onClose();
  }, [cleanupDraftUploads, onClose]);

  useEffect(() => {
    if (!open) {
      submitLockRef.current = false;
      return;
    }
    submitLockRef.current = false;
    setError('');
    if (
      activeCategories.length > 0 &&
      !activeCategories.some((c) => c.name === category)
    ) {
      setCategory(activeCategories[0].name);
    }
  }, [open, activeCategories, category]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCancelClose();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open, handleCancelClose]);

  if (!open) return null;

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoError('');
    setPhotoStatus('preparing');

    const mimeType = resolveUploadMime(file, false);
    if (!mimeType) {
      setPhotoStatus('error');
      setPhotoError('Unsupported patient photo format. Please upload JPG, PNG, or WEBP.');
      if (photoInputRef.current) photoInputRef.current.value = '';
      return;
    }
    if (file.size <= 0) {
      setPhotoStatus('error');
      setPhotoError('Selected image file is empty. Please choose a valid photo.');
      if (photoInputRef.current) photoInputRef.current.value = '';
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setPhotoStatus('error');
      setPhotoError('Patient photo must be 5 MB or smaller.');
      if (photoInputRef.current) photoInputRef.current.value = '';
      return;
    }

    if (photoPreview?.url) {
      revokeUrlSafe(photoPreview.url);
    }

    const blobUrl = URL.createObjectURL(file);
    setPhotoPreview({
      url: blobUrl,
      fileName: file.name,
      fileSize: formatFileSizeLabel(file.size),
      mimeType,
    });
    setPhotoStatus('ready');
  };

  const handleRemovePhoto = () => {
    if (photoPreview?.url) {
      revokeUrlSafe(photoPreview.url);
    }
    setPhotoPreview(null);
    setPhotoStatus('idle');
    setPhotoError('');
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const handleMedicalDocsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setDocError('');
    setDocStatus('preparing');

    if (uploadedDocs.length + files.length > MAX_DOCUMENT_FILES) {
      setDocStatus('error');
      setDocError(`You can attach up to ${MAX_DOCUMENT_FILES} medical documents per campaign.`);
      if (docsInputRef.current) docsInputRef.current.value = '';
      return;
    }

    const errors: string[] = [];
    const nextDocs: MedicalDocument[] = [];
    const existingKeys = new Set(
      uploadedDocs.map((d) => `${(d.fileName || d.title).toLowerCase()}|${d.fileSize}`)
    );

    for (const file of files) {
      const mimeType = resolveUploadMime(file, true);
      if (!mimeType) {
        errors.push(`“${file.name}” is not a supported JPG, PNG, WEBP, or PDF file.`);
        continue;
      }
      if (file.size <= 0) {
        errors.push(`“${file.name}” is empty.`);
        continue;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        errors.push(`“${file.name}” exceeds the 5 MB file limit.`);
        continue;
      }

      const sizeLabel = formatFileSizeLabel(file.size);
      const dupKey = `${file.name.toLowerCase()}|${sizeLabel}`;
      if (existingKeys.has(dupKey)) {
        errors.push(`“${file.name}” is already attached.`);
        continue;
      }
      existingKeys.add(dupKey);

      const previewUrl = URL.createObjectURL(file);
      const cleanBaseTitle = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
      const docType: MedicalDocument['docType'] =
        mimeType === 'application/pdf' ? 'Treatment Estimate' : 'Diagnostic Report';

      nextDocs.push({
        id: generateUniqueId('doc-usr'),
        title: cleanBaseTitle || file.name,
        docType,
        issuedBy: hospitalName.trim() || 'Uploaded by Campaign Organizer',
        issuedDate: new Date().toLocaleDateString('en-IN', {
          month: 'short',
          day: '2-digit',
          year: 'numeric',
        }),
        fileSize: sizeLabel,
        verified: false,
        summary: `Temporary browser preview attached (${file.name}, ${sizeLabel}). Pending clinical review.`,
        referenceCode: `TMP-${Math.floor(10000 + Math.random() * 90000)}`,
        fileName: file.name,
        mimeType,
        previewUrl,
        isTemporaryPreview: true,
      });
    }

    if (nextDocs.length > 0) {
      setUploadedDocs((prev) => [...prev, ...nextDocs]);
      setDocStatus('ready');
      setActivePreviewDocId((prev) => prev || nextDocs[0].id);
    } else if (uploadedDocs.length === 0) {
      setDocStatus('error');
    } else {
      setDocStatus('ready');
    }

    if (errors.length > 0) {
      setDocError(errors[0]);
    }
    if (docsInputRef.current) docsInputRef.current.value = '';
  };

  const handleRemoveDoc = (docId: string) => {
    const target = uploadedDocs.find((d) => d.id === docId);
    if (target?.previewUrl) {
      revokeUrlSafe(target.previewUrl);
    }
    const remaining = uploadedDocs.filter((d) => d.id !== docId);
    setUploadedDocs(remaining);
    if (activePreviewDocId === docId) {
      setActivePreviewDocId(remaining[0]?.id ?? null);
    }
    if (remaining.length === 0) {
      setDocStatus('idle');
    }
    setDocError('');
  };

  const handleDocTypeChange = (
    docId: string,
    nextType: MedicalDocument['docType']
  ) => {
    setUploadedDocs((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, docType: nextType } : d))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current) return;

    const numericGoal = Number(goalAmount);
    if (
      !title.trim() ||
      !patientName.trim() ||
      !condition.trim() ||
      !hospitalName.trim() ||
      !location.trim() ||
      !summary.trim()
    ) {
      setError('Please complete all required medical campaign fields.');
      return;
    }
    if (!Number.isFinite(numericGoal) || numericGoal < 1000) {
      setError('Please enter a fundraising goal of at least ₹1,000.');
      return;
    }

    const titleLower = title.trim().toLowerCase();
    const duplicate =
      user &&
      campaigns.some(
        (c) =>
          (c.creatorId === user.id ||
            c.creatorEmail?.toLowerCase() === user.email.toLowerCase()) &&
          c.status !== 'rejected' &&
          c.title.trim().toLowerCase() === titleLower
      );
    if (duplicate) {
      setError('A fundraiser with this title already exists in your dashboard.');
      return;
    }

    submitLockRef.current = true;
    setError('');
    const result = onCreate({
      title,
      patientName,
      ageLabel,
      condition,
      category,
      hospitalName,
      location,
      goalAmount: numericGoal,
      summary,
      treatmentDetails,
      imageUrl: photoPreview?.url,
      documents: uploadedDocs,
    });
    if (result === null) {
      submitLockRef.current = false;
      setError('Unable to create duplicate or invalid campaign submission.');
      return;
    }

    setTitle('');
    setPatientName('');
    setAgeLabel('');
    setCondition('');
    setHospitalName('');
    setLocation('');
    setGoalAmount('25000');
    setSummary('');
    setTreatmentDetails('');
    setPhotoPreview(null);
    setPhotoStatus('idle');
    setPhotoError('');
    setUploadedDocs([]);
    setDocStatus('idle');
    setDocError('');
    setActivePreviewDocId(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
    if (docsInputRef.current) docsInputRef.current.value = '';
    onClose();
  };

  const activePreviewDoc =
    uploadedDocs.find((d) => d.id === activePreviewDocId) || null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-fundraiser-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#020611]/85 p-4 backdrop-blur-sm"
      onClick={handleCancelClose}
    >
      <GlassSurface className="max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6 sm:p-8">
        <div onClick={(e) => e.stopPropagation()} className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4 border-b vc-hairline pb-4">
            <div>
              <p className="text-xs font-medium tracking-[0.14em] text-amber-300">
                New Medical Fundraiser
              </p>
              <h2
                id="create-fundraiser-title"
                className="mt-1 font-display text-2xl font-semibold text-slate-50"
              >
                Create a Care Campaign
              </h2>
            </div>
            <button
              type="button"
              onClick={handleCancelClose}
              aria-label="Close create fundraiser dialog"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label htmlFor="cf-title" className="text-xs font-medium text-slate-300">
                  Campaign Title *
                </label>
                <input
                  id="cf-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Surgical Care & Recovery Fund for..."
                  className="min-h-[42px] rounded-lg border border-slate-800 bg-slate-950/75 px-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-300/60 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="cf-patient" className="text-xs font-medium text-slate-300">
                  Patient Full Name *
                </label>
                <input
                  id="cf-patient"
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Patient name"
                  className="min-h-[42px] rounded-lg border border-slate-800 bg-slate-950/75 px-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-300/60 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="cf-age" className="text-xs font-medium text-slate-300">
                  Patient Age
                </label>
                <input
                  id="cf-age"
                  type="text"
                  value={ageLabel}
                  onChange={(e) => setAgeLabel(e.target.value)}
                  placeholder="e.g., Age 34"
                  className="min-h-[42px] rounded-lg border border-slate-800 bg-slate-950/75 px-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-300/60 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="cf-category" className="text-xs font-medium text-slate-300">
                  Medical Category *
                </label>
                <select
                  id="cf-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as MedicalCategory)}
                  className="min-h-[42px] rounded-lg border border-slate-800 bg-slate-950/75 px-3 text-sm text-slate-100 focus:border-amber-300/60 focus:outline-none"
                >
                  {activeCategories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.displayTitle || cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="cf-condition" className="text-xs font-medium text-slate-300">
                  Medical Condition *
                </label>
                <input
                  id="cf-condition"
                  type="text"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  placeholder="Diagnosis or procedure"
                  className="min-h-[42px] rounded-lg border border-slate-800 bg-slate-950/75 px-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-300/60 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="cf-hospital" className="text-xs font-medium text-slate-300">
                  Hospital Name *
                </label>
                <input
                  id="cf-hospital"
                  type="text"
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  placeholder="Accredited medical center"
                  className="min-h-[42px] rounded-lg border border-slate-800 bg-slate-950/75 px-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-300/60 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="cf-location" className="text-xs font-medium text-slate-300">
                  City / Location *
                </label>
                <input
                  id="cf-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Boston, MA"
                  className="min-h-[42px] rounded-lg border border-slate-800 bg-slate-950/75 px-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-300/60 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label htmlFor="cf-goal" className="text-xs font-medium text-slate-300">
                  Fundraising Goal (₹) *
                </label>
                <div className="relative">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 font-mono text-sm text-amber-300"
                  >
                    ₹
                  </span>
                  <input
                    id="cf-goal"
                    type="number"
                    min={1000}
                    value={goalAmount}
                    onChange={(e) => setGoalAmount(e.target.value)}
                    className="min-h-[42px] w-full rounded-lg border border-slate-800 bg-slate-950/75 pr-3.5 pl-8 font-mono text-sm text-slate-100 focus:border-amber-300/60 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label htmlFor="cf-summary" className="text-xs font-medium text-slate-300">
                  Patient Story &amp; Need Summary *
                </label>
                <textarea
                  id="cf-summary"
                  rows={3}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Explain the patient's care journey and how funds help..."
                  className="rounded-lg border border-slate-800 bg-slate-950/75 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-300/60 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label htmlFor="cf-treatment" className="text-xs font-medium text-slate-300">
                  Planned Clinical Treatment (Optional)
                </label>
                <input
                  id="cf-treatment"
                  type="text"
                  value={treatmentDetails}
                  onChange={(e) => setTreatmentDetails(e.target.value)}
                  placeholder="Surgery, inpatient recovery, or medication details"
                  className="min-h-[42px] rounded-lg border border-slate-800 bg-slate-950/75 px-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-300/60 focus:outline-none"
                />
              </div>

              {/* Patient Photo Upload (Temporary Browser Preview) */}
              <div className="flex flex-col gap-2.5 rounded-xl border border-slate-800/90 bg-slate-950/60 p-4 sm:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label
                      htmlFor="cf-patient-photo"
                      className="text-xs font-medium text-slate-200"
                    >
                      Patient Photo (Optional)
                    </label>
                    <p className="text-[11px] text-slate-400">
                      JPG, PNG, or WEBP up to 5 MB. Uses temporary browser preview only.
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-medium ${
                      photoStatus === 'ready'
                        ? 'text-teal-300'
                        : photoStatus === 'error'
                        ? 'text-rose-300'
                        : photoStatus === 'preparing'
                        ? 'text-amber-300'
                        : 'text-slate-400'
                    }`}
                  >
                    {photoStatus === 'preparing' && (
                      <span className="inline-flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                        Preparing preview…
                      </span>
                    )}
                    {photoStatus === 'ready' && 'Temporary preview ready'}
                    {photoStatus === 'error' && 'Upload validation failed'}
                    {photoStatus === 'idle' && 'Using category cover if omitted'}
                  </span>
                </div>

                {!photoPreview ? (
                  <label
                    htmlFor="cf-patient-photo"
                    className="flex cursor-pointer items-center justify-center gap-2.5 rounded-lg border border-dashed border-slate-700 bg-slate-900/60 px-4 py-4 text-xs font-medium text-slate-300 transition-colors hover:border-amber-300/50 hover:text-amber-200"
                  >
                    <ImagePlus className="h-4 w-4 text-amber-300" aria-hidden="true" />
                    <span>Select Patient Photo (JPG, PNG, WEBP)</span>
                    <input
                      ref={photoInputRef}
                      id="cf-patient-photo"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                      onChange={handlePhotoFileChange}
                      className="sr-only"
                    />
                  </label>
                ) : (
                  <div className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-900/75 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={photoPreview.url}
                        alt={`Temporary preview of ${photoPreview.fileName}`}
                        className="h-16 w-20 shrink-0 rounded-lg border border-white/10 object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-slate-100">
                          {photoPreview.fileName}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                          {photoPreview.fileSize} · Temporary preview (not stored in LocalStorage)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <label className="inline-flex min-h-[34px] cursor-pointer items-center rounded-lg border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-medium text-slate-200 hover:border-sky-300/50">
                        <span>Replace</span>
                        <input
                          ref={photoInputRef}
                          id="cf-patient-photo"
                          type="file"
                          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                          onChange={handlePhotoFileChange}
                          className="sr-only"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        aria-label="Remove patient photo"
                        className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-rose-400/35 bg-rose-950/30 px-3 py-1 text-xs font-medium text-rose-200 hover:bg-rose-950/60"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                )}

                {photoError && (
                  <p role="alert" className="text-xs text-rose-300">
                    {photoError}
                  </p>
                )}
              </div>

              {/* Medical Documents Upload (Images & PDFs, Temporary Previews) */}
              <div className="flex flex-col gap-3 rounded-xl border border-slate-800/90 bg-slate-950/60 p-4 sm:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label
                      htmlFor="cf-medical-docs"
                      className="text-xs font-medium text-slate-200"
                    >
                      Medical Documents &amp; Estimates (Optional · Max {MAX_DOCUMENT_FILES})
                    </label>
                    <p className="text-[11px] text-slate-400">
                      PDF, JPG, PNG, or WEBP up to 5 MB each. Previews stay in memory only.
                    </p>
                  </div>
                  <span
                    className={`font-mono text-[11px] ${
                      docStatus === 'error'
                        ? 'text-rose-300'
                        : uploadedDocs.length > 0
                        ? 'text-teal-300'
                        : 'text-slate-400'
                    }`}
                  >
                    {uploadedDocs.length}/{MAX_DOCUMENT_FILES} attached
                  </span>
                </div>

                {uploadedDocs.length < MAX_DOCUMENT_FILES && (
                  <label
                    htmlFor="cf-medical-docs"
                    className="flex cursor-pointer items-center justify-center gap-2.5 rounded-lg border border-dashed border-slate-700 bg-slate-900/60 px-4 py-3.5 text-xs font-medium text-slate-300 transition-colors hover:border-sky-300/50 hover:text-sky-200"
                  >
                    <Upload className="h-4 w-4 text-sky-300" aria-hidden="true" />
                    <span>Attach Hospital Estimate or Diagnostic Report (PDF / Image)</span>
                    <input
                      ref={docsInputRef}
                      id="cf-medical-docs"
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf"
                      onChange={handleMedicalDocsChange}
                      className="sr-only"
                    />
                  </label>
                )}

                {docError && (
                  <p role="alert" className="text-xs text-rose-300">
                    {docError}
                  </p>
                )}

                {uploadedDocs.length > 0 && (
                  <div className="flex flex-col gap-2.5">
                    {uploadedDocs.map((doc) => {
                      const isPdf = doc.mimeType === 'application/pdf';
                      const isPreviewActive = activePreviewDocId === doc.id;
                      return (
                        <div
                          key={doc.id}
                          className="flex flex-col gap-2.5 rounded-lg border border-slate-800 bg-slate-900/75 p-3"
                        >
                          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                              {!isPdf && doc.previewUrl ? (
                                <img
                                  src={doc.previewUrl}
                                  alt={doc.title}
                                  className="h-11 w-11 shrink-0 rounded border border-white/10 object-cover"
                                />
                              ) : (
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded border border-sky-400/25 bg-sky-400/10 text-sky-300">
                                  <FileText className="h-5 w-5" aria-hidden="true" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="truncate text-xs font-medium text-slate-100">
                                  {doc.fileName || doc.title}
                                </p>
                                <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                                  <span>{isPdf ? 'PDF' : 'Image'}</span>
                                  <span aria-hidden="true">·</span>
                                  <span className="font-mono">{doc.fileSize}</span>
                                  <span aria-hidden="true">·</span>
                                  <span className="inline-flex items-center gap-1 text-teal-300">
                                    <FileCheck2 className="h-3 w-3" aria-hidden="true" />
                                    Temporary preview
                                  </span>
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              <select
                                aria-label={`Document type for ${doc.fileName || doc.title}`}
                                value={doc.docType}
                                onChange={(e) =>
                                  handleDocTypeChange(
                                    doc.id,
                                    e.target.value as MedicalDocument['docType']
                                  )
                                }
                                className="min-h-[32px] rounded-md border border-slate-700 bg-slate-950 px-2 text-[11px] text-slate-200 focus:border-amber-300/60 focus:outline-none"
                              >
                                <option value="Treatment Estimate">Treatment Estimate</option>
                                <option value="Diagnostic Report">Diagnostic Report</option>
                                <option value="Hospital Verification">Hospital Verification</option>
                              </select>
                              <button
                                type="button"
                                onClick={() =>
                                  setActivePreviewDocId(isPreviewActive ? null : doc.id)
                                }
                                className="inline-flex min-h-[32px] items-center gap-1 rounded-md border border-sky-400/35 bg-sky-400/10 px-2.5 text-[11px] font-medium text-sky-200 hover:bg-sky-400/20"
                              >
                                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>{isPreviewActive ? 'Hide' : 'Preview'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveDoc(doc.id)}
                                aria-label={`Remove ${doc.fileName || doc.title}`}
                                className="inline-flex min-h-[32px] items-center gap-1 rounded-md border border-rose-400/35 bg-rose-950/30 px-2.5 text-[11px] font-medium text-rose-200 hover:bg-rose-950/60"
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>Remove</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {activePreviewDoc && activePreviewDoc.previewUrl && (
                      <div className="rounded-lg border border-sky-300/25 bg-slate-950/90 p-3">
                        <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                          <span className="truncate font-medium text-sky-200">
                            Previewing: {activePreviewDoc.fileName || activePreviewDoc.title}
                          </span>
                          <button
                            type="button"
                            onClick={() => setActivePreviewDocId(null)}
                            className="text-slate-400 hover:text-white"
                          >
                            Close preview
                          </button>
                        </div>
                        {activePreviewDoc.mimeType === 'application/pdf' ? (
                          <iframe
                            title={activePreviewDoc.fileName || activePreviewDoc.title}
                            src={activePreviewDoc.previewUrl}
                            className="h-64 w-full rounded-md border border-slate-800 bg-white"
                          />
                        ) : (
                          <img
                            src={activePreviewDoc.previewUrl}
                            alt={activePreviewDoc.fileName || activePreviewDoc.title}
                            className="max-h-64 w-full rounded-md object-contain bg-slate-900"
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {error && (
              <p role="alert" className="text-xs text-rose-300">
                {error}
              </p>
            )}

            <p className="text-xs text-slate-400">
              New campaigns enter <strong>Pending</strong> status until approved
              in review before appearing in public listings. Large uploaded files
              stay in temporary browser memory for preview and are not stored in
              LocalStorage.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <VidaButton type="button" variant="secondary" onClick={handleCancelClose}>
                Cancel
              </VidaButton>
              <VidaButton type="submit" variant="primary">
                Submit Fundraiser
              </VidaButton>
            </div>
          </form>
        </div>
      </GlassSurface>
    </div>
  );
};

interface EditCampaignModalProps {
  campaign: MedicalCampaign | null;
  onClose: () => void;
  onSave: (input: {
    id: string;
    title: string;
    category: MedicalCategory;
    condition: string;
    hospitalName: string;
    location: string;
    goalAmount: number;
    summary: string;
  }) => void;
}

export const EditCampaignModal: React.FC<EditCampaignModalProps> = ({
  campaign,
  onClose,
  onSave,
}) => {
  const { activeCategories } = useVidaCare();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<MedicalCategory>('Heart Surgery');
  const [condition, setCondition] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [location, setLocation] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const editLockRef = useRef(false);

  useEffect(() => {
    if (campaign) {
      editLockRef.current = false;
      setTitle(campaign.title);
      setCategory(campaign.category);
      setCondition(campaign.condition);
      setHospitalName(campaign.hospitalName);
      setLocation(campaign.location);
      setGoalAmount(String(campaign.goalAmount));
      setSummary(campaign.summary);
      setError('');
    }
  }, [campaign]);

  useEffect(() => {
    if (!campaign) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [campaign, onClose]);

  if (!campaign) return null;

  const categoryChoices = activeCategories.some(
    (c) => c.name === campaign.category
  )
    ? activeCategories
    : [
        ...activeCategories,
        {
          id: 'current-cat',
          name: campaign.category,
          displayTitle: campaign.category,
          description: '',
          isActive: false,
          createdAt: '',
        },
      ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editLockRef.current) return;
    const numericGoal = Number(goalAmount);
    if (
      !title.trim() ||
      !condition.trim() ||
      !hospitalName.trim() ||
      !location.trim() ||
      !summary.trim()
    ) {
      setError('All campaign fields are required.');
      return;
    }
    if (!Number.isFinite(numericGoal) || numericGoal < 1000) {
      setError('Goal amount must be at least ₹1,000.');
      return;
    }
    editLockRef.current = true;
    setError('');
    onSave({
      id: campaign.id,
      title,
      category,
      condition,
      hospitalName,
      location,
      goalAmount: numericGoal,
      summary,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-campaign-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#020611]/85 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <GlassSurface className="max-h-[90vh] w-full max-w-xl overflow-y-auto p-6 sm:p-8">
        <div onClick={(e) => e.stopPropagation()} className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4 border-b vc-hairline pb-4">
            <div>
              <p className="text-xs font-medium tracking-[0.14em] text-sky-300">
                Edit Campaign
              </p>
              <h2
                id="edit-campaign-title"
                className="mt-1 font-display text-2xl font-semibold text-slate-50"
              >
                Update {campaign.patientName}’s Fundraiser
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close edit campaign dialog"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ec-title" className="text-xs font-medium text-slate-300">
                Campaign Title
              </label>
              <input
                id="ec-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="min-h-[42px] rounded-lg border border-slate-800 bg-slate-950/75 px-3.5 text-sm text-slate-100 focus:border-amber-300/60 focus:outline-none"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="ec-category" className="text-xs font-medium text-slate-300">
                  Medical Category
                </label>
                <select
                  id="ec-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as MedicalCategory)}
                  className="min-h-[42px] rounded-lg border border-slate-800 bg-slate-950/75 px-3 text-sm text-slate-100 focus:border-amber-300/60 focus:outline-none"
                >
                  {categoryChoices.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.displayTitle || cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="ec-condition" className="text-xs font-medium text-slate-300">
                  Medical Condition
                </label>
                <input
                  id="ec-condition"
                  type="text"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="min-h-[42px] rounded-lg border border-slate-800 bg-slate-950/75 px-3.5 text-sm text-slate-100 focus:border-amber-300/60 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="ec-goal" className="text-xs font-medium text-slate-300">
                  Target Goal (₹)
                </label>
                <input
                  id="ec-goal"
                  type="number"
                  min={1000}
                  value={goalAmount}
                  onChange={(e) => setGoalAmount(e.target.value)}
                  className="min-h-[42px] rounded-lg border border-slate-800 bg-slate-950/75 px-3.5 font-mono text-sm text-slate-100 focus:border-amber-300/60 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="ec-hospital" className="text-xs font-medium text-slate-300">
                  Hospital Name
                </label>
                <input
                  id="ec-hospital"
                  type="text"
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  className="min-h-[42px] rounded-lg border border-slate-800 bg-slate-950/75 px-3.5 text-sm text-slate-100 focus:border-amber-300/60 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="ec-location" className="text-xs font-medium text-slate-300">
                  Location
                </label>
                <input
                  id="ec-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="min-h-[42px] rounded-lg border border-slate-800 bg-slate-950/75 px-3.5 text-sm text-slate-100 focus:border-amber-300/60 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="ec-summary" className="text-xs font-medium text-slate-300">
                Campaign Summary
              </label>
              <textarea
                id="ec-summary"
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-950/75 p-3 text-sm text-slate-100 focus:border-amber-300/60 focus:outline-none"
              />
            </div>

            {error && (
              <p role="alert" className="text-xs text-rose-300">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <VidaButton type="button" variant="secondary" onClick={onClose}>
                Cancel
              </VidaButton>
              <VidaButton type="submit" variant="primary">
                Save Changes
              </VidaButton>
            </div>
          </form>
        </div>
      </GlassSurface>
    </div>
  );
};

interface DonationReceiptModalProps {
  donation: DonationRecord | null;
  user: UserSession;
  onClose: () => void;
}

export const DonationReceiptModal: React.FC<DonationReceiptModalProps> = ({
  donation,
  user,
  onClose,
}) => {
  useEffect(() => {
    if (!donation) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [donation, onClose]);

  if (!donation) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#020611]/85 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl"
      >
        <div className="print-hide mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex min-h-[38px] items-center gap-2 rounded-lg bg-teal-400 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-teal-300"
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            <span>Print Receipt</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close receipt modal"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-200 hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-white p-8 text-slate-900 shadow-2xl">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2.5">
              <BrandMark className="h-7 w-7" />
              <div>
                <h2
                  id="receipt-modal-title"
                  className="font-display text-xl font-bold text-slate-950"
                >
                  VidaCare
                </h2>
                <p className="text-xs text-slate-500">
                  Contribution Receipt (Demo Preview)
                </p>
              </div>
            </div>
            <div className="sm:text-right">
              <p className="text-xs text-slate-500">Reference</p>
              <p className="font-mono text-xs font-semibold text-slate-900">
                {donation.transactionRef || donation.id.toUpperCase()}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">
                Supporter
              </p>
              <p className="mt-1 font-semibold text-slate-900">{user.fullName}</p>
              <p className="text-xs text-slate-600">{user.email}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">
                Campaign Supported
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {donation.campaignTitle}
              </p>
              <p className="text-xs text-slate-600">
                {donation.isAnonymous
                  ? 'Displayed publicly as Anonymous Donor'
                  : 'Public donor listing'}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="flex justify-between py-1 text-slate-600">
              <span>Date</span>
              <span className="font-mono text-xs tabular-nums">
                {new Date(donation.timestamp).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between py-1 text-slate-600">
              <span>Payment Method</span>
              <span>{donation.paymentMethod || 'UPI'}</span>
            </div>
            <div className="flex justify-between py-1 text-slate-600">
              <span>Status</span>
              <span className="font-medium text-emerald-700">
                {donation.paymentStatus || 'Completed'}
              </span>
            </div>
            <div className="mt-2 flex justify-between border-t border-slate-200 pt-2.5 font-bold text-slate-950">
              <span>Total Contributed</span>
              <span className="font-mono tabular-nums">
                {formatINR(donation.amount)}
              </span>
            </div>
          </div>

          {donation.message && (
            <p className="mt-4 text-xs italic text-slate-600">
              “{donation.message}”
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
