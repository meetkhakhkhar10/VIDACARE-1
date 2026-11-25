import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  FileText,
  Mail,
  ShieldAlert,
  ShieldCheck,
  User as UserIcon,
  X,
  XCircle,
} from 'lucide-react';
import {
  CategoryItem,
  ContactMessage,
  DonationRecord,
  MedicalCampaign,
  RegisteredAccount,
} from '../../types/campaign';
import { calculateProgress, formatINR } from '../../lib/format';
import { SafeImage } from '../SafeImage';
import { GlassSurface, ProgressMeter, VidaButton } from '../ui/DesignPrimitives';

interface ConfirmActionModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
  open,
  title,
  description,
  confirmLabel,
  tone = 'primary',
  onCancel,
  onConfirm,
}) => {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#020611]/85 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <GlassSurface className="w-full max-w-md p-6 sm:p-7">
        <div onClick={(e) => e.stopPropagation()} className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
                  tone === 'danger'
                    ? 'border-rose-400/40 bg-rose-950/40 text-rose-300'
                    : 'border-teal-400/40 bg-teal-950/40 text-teal-300'
                }`}
              >
                {tone === 'danger' ? (
                  <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                )}
              </div>
              <h2
                id="confirm-modal-title"
                className="font-display text-xl font-semibold text-slate-50"
              >
                {title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onCancel}
              aria-label="Close confirmation dialog"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <p className="text-sm leading-relaxed text-slate-300/85">{description}</p>

          <div className="flex justify-end gap-3 pt-1">
            <VidaButton type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </VidaButton>
            <button
              type="button"
              onClick={onConfirm}
              className={`inline-flex min-h-[42px] items-center justify-center rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${
                tone === 'danger'
                  ? 'bg-rose-500 text-white hover:bg-rose-400'
                  : 'bg-teal-400 text-slate-950 hover:bg-teal-300'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </GlassSurface>
    </div>
  );
};

interface CampaignInspectorModalProps {
  campaign: MedicalCampaign | null;
  onClose: () => void;
  onApprove: (campaign: MedicalCampaign) => void;
  onReject: (campaign: MedicalCampaign) => void;
}

export const CampaignInspectorModal: React.FC<CampaignInspectorModalProps> = ({
  campaign,
  onClose,
  onApprove,
  onReject,
}) => {
  useEffect(() => {
    if (!campaign) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [campaign, onClose]);

  if (!campaign) return null;
  const pct = calculateProgress(campaign.raisedAmount, campaign.goalAmount);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="inspect-campaign-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#020611]/85 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <GlassSurface className="max-h-[90vh] w-full max-w-3xl overflow-y-auto p-6 sm:p-8">
        <div onClick={(e) => e.stopPropagation()} className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b vc-hairline pb-4">
            <div>
              <p className="text-xs font-medium tracking-[0.14em] text-sky-300">
                Campaign Review · {campaign.id.toUpperCase()}
              </p>
              <h2
                id="inspect-campaign-title"
                className="mt-1 font-display text-2xl font-semibold text-slate-50"
              >
                {campaign.title}
              </h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span>{campaign.patientName}</span>
                <span aria-hidden="true">·</span>
                <span>{campaign.ageLabel}</span>
                <span aria-hidden="true">·</span>
                <span>{campaign.category}</span>
                <span aria-hidden="true">·</span>
                <span
                  className={
                    campaign.status === 'approved'
                      ? 'text-teal-300 font-medium'
                      : campaign.status === 'rejected'
                      ? 'text-rose-300 font-medium'
                      : 'text-amber-300 font-medium'
                  }
                >
                  Status: {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close campaign review dialog"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-800 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Patient & Funding Snapshot */}
          <div className="grid gap-6 md:grid-cols-12">
            <div className="h-48 overflow-hidden rounded-xl border border-white/10 bg-slate-950 md:col-span-5">
              <SafeImage
                src={campaign.imageUrl}
                alt={campaign.patientName}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="flex flex-col justify-between gap-4 md:col-span-7">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400">Medical Condition</span>
                  <p className="mt-0.5 font-medium text-slate-100">{campaign.condition}</p>
                </div>
                <div>
                  <span className="text-slate-400">Hospital / Facility</span>
                  <p className="mt-0.5 font-medium text-slate-100">{campaign.hospitalName}</p>
                </div>
                <div>
                  <span className="text-slate-400">Organizer</span>
                  <p className="mt-0.5 font-medium text-slate-100">
                    {campaign.organizerName} ({campaign.organizerRelation})
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Location</span>
                  <p className="mt-0.5 font-medium text-slate-100">{campaign.location}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 border-t vc-hairline pt-3">
                <ProgressMeter value={pct} />
                <div className="flex justify-between font-mono text-xs tabular-nums">
                  <span className="text-teal-300">
                    {formatINR(campaign.raisedAmount)} raised ({campaign.donorCount} donors)
                  </span>
                  <span className="text-slate-300">
                    Goal: {formatINR(campaign.goalAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Story & Treatment Details */}
          <div className="flex flex-col gap-3 border-t vc-hairline pt-4">
            <h3 className="text-xs font-semibold tracking-[0.14em] text-amber-300">
              Clinical Summary &amp; Patient Story
            </h3>
            <p className="text-sm leading-relaxed text-slate-200">{campaign.summary}</p>
            <p className="text-xs leading-relaxed text-slate-400">
              <span className="font-medium text-slate-300">Planned Treatment: </span>
              {campaign.treatmentDetails}
            </p>
            {campaign.status === 'rejected' && campaign.rejectionReason && (
              <div className="rounded-lg border border-rose-400/35 bg-rose-950/30 p-3 text-xs text-rose-200">
                <span className="font-semibold">Recorded Rejection Reason: </span>
                {campaign.rejectionReason}
              </div>
            )}
          </div>

          {/* Medical Documents */}
          <div className="flex flex-col gap-3 border-t vc-hairline pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold tracking-[0.14em] text-sky-300">
                Uploaded Medical Documents (Demo Previews)
              </h3>
              <span className="font-mono text-xs tabular-nums text-slate-400">
                {campaign.documents?.length ?? 0} attached
              </span>
            </div>

            {!campaign.documents || campaign.documents.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-400">
                No clinical estimate or hospital verification documents are attached to this submission.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {campaign.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-col gap-2 rounded-xl border border-slate-800/90 bg-slate-950/65 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-sky-300 shrink-0" aria-hidden="true" />
                        <span className="text-sm font-medium text-slate-100">{doc.title}</span>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium ${
                          doc.verified ? 'text-teal-300' : 'text-amber-300'
                        }`}
                      >
                        {doc.verified ? (
                          <FileCheck2 className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        <span>{doc.verified ? 'Cleared in Preview' : 'Pending Review'}</span>
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                      <span>{doc.docType}</span>
                      <span aria-hidden="true">·</span>
                      <span>{doc.issuedBy}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{doc.referenceCode}</span>
                      <span aria-hidden="true">·</span>
                      <span>{doc.issuedDate}</span>
                      <span aria-hidden="true">·</span>
                      <span>{doc.fileSize}</span>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-300/85">{doc.summary}</p>
                    {doc.previewUrl ? (
                      doc.mimeType === 'application/pdf' ? (
                        <iframe
                          title={doc.fileName || doc.title}
                          src={doc.previewUrl}
                          className="mt-2 h-56 w-full rounded-lg border border-slate-800 bg-white"
                        />
                      ) : (
                        <img
                          src={doc.previewUrl}
                          alt={doc.fileName || doc.title}
                          className="mt-2 max-h-56 w-full rounded-lg border border-slate-800 bg-slate-900 object-contain"
                        />
                      )
                    ) : doc.isTemporaryPreview ? (
                      <p className="mt-1 text-[11px] text-amber-300/90">
                        Temporary browser preview expired after page reload (uploaded files are not stored in LocalStorage).
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Review Footer Actions */}
          <div className="flex flex-wrap items-center justify-end gap-3 border-t vc-hairline pt-4">
            <VidaButton type="button" variant="secondary" onClick={onClose}>
              Close
            </VidaButton>
            {campaign.status !== 'rejected' && (
              <button
                type="button"
                onClick={() => onReject(campaign)}
                className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg border border-rose-400/40 bg-rose-950/35 px-4 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-950/60"
              >
                <XCircle className="h-4 w-4" aria-hidden="true" />
                <span>Reject Campaign</span>
              </button>
            )}
            {campaign.status !== 'approved' && (
              <button
                type="button"
                onClick={() => onApprove(campaign)}
                className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg bg-teal-400 px-5 py-2 text-xs font-semibold text-slate-950 hover:bg-teal-300"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <span>Approve Campaign</span>
              </button>
            )}
          </div>
        </div>
      </GlassSurface>
    </div>
  );
};

interface RejectCampaignModalProps {
  campaign: MedicalCampaign | null;
  onClose: () => void;
  onConfirmReject: (campaignId: string, reason: string) => void;
}

const REJECTION_TEMPLATES = [
  'Missing signed hospital social-work verification letter or itemized cost estimate.',
  'Patient identity or treatment facility details require clarification before listing.',
  'Duplicate or unverified fundraiser submission.',
];

export const RejectCampaignModal: React.FC<RejectCampaignModalProps> = ({
  campaign,
  onClose,
  onConfirmReject,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (campaign) {
      setReason('');
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A clear review reason is required before rejecting this campaign.');
      return;
    }
    onConfirmReject(campaign.id, reason);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reject-campaign-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#020611]/85 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <GlassSurface className="w-full max-w-lg p-6 sm:p-7">
        <div onClick={(e) => e.stopPropagation()} className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-3 border-b vc-hairline pb-4">
            <div>
              <p className="text-xs font-medium tracking-[0.14em] text-rose-300">
                Decline Fundraiser
              </p>
              <h2
                id="reject-campaign-title"
                className="mt-1 font-display text-xl font-semibold text-slate-50"
              >
                Reject “{campaign.title}”
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close reject dialog"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-slate-400">
                Common Review Notes:
              </span>
              <div className="flex flex-wrap gap-2">
                {REJECTION_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl}
                    type="button"
                    onClick={() => {
                      setReason(tpl);
                      setError('');
                    }}
                    className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-1.5 text-left text-[11px] text-slate-300 hover:border-amber-300/40 hover:text-white"
                  >
                    {tpl}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="reject-reason" className="text-xs font-medium text-slate-300">
                Rejection Reason (visible to campaign creator) *
              </label>
              <textarea
                id="reject-reason"
                rows={3}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Explain what documentation or clinical verification is missing..."
                className="rounded-lg border border-slate-800 bg-slate-950/75 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-rose-400/60 focus:outline-none"
              />
            </div>

            {error && (
              <p role="alert" className="text-xs text-rose-300">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <VidaButton type="button" variant="secondary" onClick={onClose}>
                Cancel
              </VidaButton>
              <button
                type="submit"
                className="inline-flex min-h-[42px] items-center justify-center rounded-lg bg-rose-500 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-400"
              >
                Confirm Rejection
              </button>
            </div>
          </form>
        </div>
      </GlassSurface>
    </div>
  );
};

interface UserInspectorModalProps {
  account: RegisteredAccount | null;
  campaigns: MedicalCampaign[];
  donations: DonationRecord[];
  onClose: () => void;
  onToggleBlock: (account: RegisteredAccount) => void;
}

export const UserInspectorModal: React.FC<UserInspectorModalProps> = ({
  account,
  campaigns,
  donations,
  onClose,
  onToggleBlock,
}) => {
  useEffect(() => {
    if (!account) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [account, onClose]);

  if (!account) return null;

  const userCampaigns = campaigns.filter(
    (c) =>
      c.creatorId === account.id ||
      c.creatorEmail?.toLowerCase() === account.email.toLowerCase()
  );
  const userDonations = donations.filter(
    (d) =>
      d.donorId === account.id ||
      d.donorEmail?.toLowerCase() === account.email.toLowerCase()
  );
  const totalDonated = userDonations.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="inspect-user-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#020611]/85 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <GlassSurface className="max-h-[90vh] w-full max-w-xl overflow-y-auto p-6 sm:p-8">
        <div onClick={(e) => e.stopPropagation()} className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4 border-b vc-hairline pb-4">
            <div className="flex items-center gap-3.5">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-amber-300/35 bg-slate-900">
                {account.avatarUrl ? (
                  <SafeImage
                    src={account.avatarUrl}
                    alt={account.fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-400">
                    <UserIcon className="h-6 w-6" aria-hidden="true" />
                  </div>
                )}
              </div>
              <div>
                <h2
                  id="inspect-user-title"
                  className="font-display text-xl font-semibold text-slate-50"
                >
                  {account.fullName}
                </h2>
                <p className="text-xs text-slate-400">
                  {account.role} · Joined {account.createdAt}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close user profile dialog"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="grid gap-3 text-xs sm:grid-cols-2">
            <div>
              <span className="text-slate-400">Email</span>
              <p className="mt-0.5 text-slate-100">{account.email}</p>
            </div>
            <div>
              <span className="text-slate-400">Phone</span>
              <p className="mt-0.5 font-mono text-slate-100">{account.phone}</p>
            </div>
            <div>
              <span className="text-slate-400">Location</span>
              <p className="mt-0.5 text-slate-100">{account.location || 'Not provided'}</p>
            </div>
            <div>
              <span className="text-slate-400">Account Status</span>
              <p
                className={`mt-0.5 font-medium ${
                  account.blocked ? 'text-rose-300' : 'text-teal-300'
                }`}
              >
                {account.blocked ? 'Blocked' : 'Active'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-y vc-hairline py-4">
            <div>
              <span className="text-xs text-slate-400">Campaigns Created</span>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-amber-300">
                {userCampaigns.length}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-400">Total Donated</span>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-sky-300">
                {formatINR(totalDonated)}
              </p>
            </div>
          </div>

          {userCampaigns.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold text-slate-300">Created Campaigns</h3>
              <ul className="flex flex-col gap-1.5 text-xs text-slate-400">
                {userCampaigns.map((c) => (
                  <li key={c.id} className="flex justify-between gap-2">
                    <span className="truncate text-slate-200">{c.title}</span>
                    <span className="shrink-0 capitalize text-amber-300">{c.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <VidaButton type="button" variant="secondary" onClick={onClose}>
              Close
            </VidaButton>
            {account.role !== 'Admin' && (
              <button
                type="button"
                onClick={() => {
                  onToggleBlock(account);
                  onClose();
                }}
                className={`inline-flex min-h-[42px] items-center rounded-lg px-4 py-2 text-xs font-semibold ${
                  account.blocked
                    ? 'bg-teal-400 text-slate-950 hover:bg-teal-300'
                    : 'border border-rose-400/40 bg-rose-950/35 text-rose-200 hover:bg-rose-950/60'
                }`}
              >
                {account.blocked ? 'Unblock Account' : 'Block Account'}
              </button>
            )}
          </div>
        </div>
      </GlassSurface>
    </div>
  );
};

interface CategoryFormModalProps {
  open: boolean;
  editingCategory: CategoryItem | null;
  onClose: () => void;
  onSave: (
    name: string,
    description: string,
    displayTitle?: string,
    id?: string
  ) => { ok: boolean; error?: string };
}

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  open,
  editingCategory,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [displayTitle, setDisplayTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName(editingCategory?.name || '');
      setDisplayTitle(editingCategory?.displayTitle || '');
      setDescription(editingCategory?.description || '');
      setError('');
    }
  }, [open, editingCategory]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = onSave(name, description, displayTitle, editingCategory?.id);
    if (!res.ok) {
      setError(res.error || 'Could not save category.');
      return;
    }
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#020611]/85 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <GlassSurface className="w-full max-w-md p-6 sm:p-7">
        <div onClick={(e) => e.stopPropagation()} className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-3 border-b vc-hairline pb-4">
            <div>
              <p className="text-xs font-medium tracking-[0.14em] text-amber-300">
                Taxonomy Control
              </p>
              <h2
                id="category-modal-title"
                className="mt-1 font-display text-xl font-semibold text-slate-50"
              >
                {editingCategory ? 'Edit Medical Category' : 'Add Medical Category'}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close category dialog"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cat-name" className="text-xs font-medium text-slate-300">
                Category Name *
              </label>
              <input
                id="cat-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Pediatric Neurology"
                className="min-h-[42px] rounded-lg border border-slate-800 bg-slate-950/75 px-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-300/60 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="cat-display-title" className="text-xs font-medium text-slate-300">
                Display Title (Optional)
              </label>
              <input
                id="cat-display-title"
                type="text"
                value={displayTitle}
                onChange={(e) => setDisplayTitle(e.target.value)}
                placeholder="Shown on category showcase cards (defaults to Name)"
                className="min-h-[42px] rounded-lg border border-slate-800 bg-slate-950/75 px-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-300/60 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="cat-desc" className="text-xs font-medium text-slate-300">
                Clinical Scope Description
              </label>
              <textarea
                id="cat-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Summarize treatments covered under this category..."
                className="rounded-lg border border-slate-800 bg-slate-950/75 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-300/60 focus:outline-none"
              />
            </div>

            {error && (
              <p role="alert" className="text-xs text-rose-300">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <VidaButton type="button" variant="secondary" onClick={onClose}>
                Cancel
              </VidaButton>
              <VidaButton type="submit" variant="primary">
                {editingCategory ? 'Save Changes' : 'Create Category'}
              </VidaButton>
            </div>
          </form>
        </div>
      </GlassSurface>
    </div>
  );
};

interface MessageInspectorModalProps {
  message: ContactMessage | null;
  onClose: () => void;
  onStatusChange: (id: string, status: ContactMessage['status']) => void;
}

export const MessageInspectorModal: React.FC<MessageInspectorModalProps> = ({
  message,
  onClose,
  onStatusChange,
}) => {
  useEffect(() => {
    if (!message) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="inspect-msg-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#020611]/85 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <GlassSurface className="w-full max-w-lg p-6 sm:p-7">
        <div onClick={(e) => e.stopPropagation()} className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-3 border-b vc-hairline pb-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-sky-400/35 bg-sky-400/10 text-sky-300">
                <Mail className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2
                  id="inspect-msg-title"
                  className="font-display text-xl font-semibold text-slate-50"
                >
                  {message.subject}
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  From {message.name} ({message.email})
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close message dialog"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono tabular-nums">
              {new Date(message.createdAt).toLocaleString()}
            </span>
            <span
              className={`font-medium capitalize ${
                message.status === 'resolved'
                  ? 'text-teal-300'
                  : message.status === 'read'
                  ? 'text-sky-300'
                  : 'text-amber-300'
              }`}
            >
              Status: {message.status}
            </span>
          </div>

          <p className="rounded-xl border border-slate-800 bg-slate-950/65 p-4 text-sm leading-relaxed text-slate-200">
            {message.message}
          </p>

          <div className="flex flex-wrap justify-end gap-2.5 pt-1">
            <VidaButton type="button" variant="secondary" onClick={onClose}>
              Close
            </VidaButton>
            {message.status !== 'read' && message.status !== 'resolved' && (
              <button
                type="button"
                onClick={() => {
                  onStatusChange(message.id, 'read');
                  onClose();
                }}
                className="inline-flex min-h-[40px] items-center rounded-lg border border-sky-400/40 bg-sky-400/10 px-4 py-2 text-xs font-medium text-sky-200 hover:bg-sky-400/20"
              >
                Mark as Read
              </button>
            )}
            {message.status !== 'resolved' && (
              <button
                type="button"
                onClick={() => {
                  onStatusChange(message.id, 'resolved');
                  onClose();
                }}
                className="inline-flex min-h-[40px] items-center rounded-lg bg-teal-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-teal-300"
              >
                Mark as Resolved
              </button>
            )}
          </div>
        </div>
      </GlassSurface>
    </div>
  );
};
