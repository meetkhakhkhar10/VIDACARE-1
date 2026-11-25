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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#123C35]/45 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <GlassSurface className="w-full max-w-md p-6 sm:p-7">
        <div onClick={(e) => e.stopPropagation()} className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                  tone === 'danger'
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : 'border-[#159B79]/30 bg-[#DDF3E9] text-[#123C35]'
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
                className="font-display text-xl font-bold text-[#123C35]"
              >
                {title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onCancel}
              aria-label="Close confirmation dialog"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#123C35]/15 bg-[#F0FCF8] text-[#414846] hover:bg-[#DDF3E9] hover:text-[#123C35]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <p className="text-sm leading-relaxed text-[#414846]">{description}</p>

          <div className="flex justify-end gap-3 pt-1">
            <VidaButton type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </VidaButton>
            <button
              type="button"
              onClick={onConfirm}
              className={`inline-flex min-h-[44px] items-center justify-center rounded-xl px-5 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                tone === 'danger'
                  ? 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600'
                  : 'bg-[#123C35] text-white hover:bg-[#159B79] focus-visible:ring-[#159B79]'
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
  onOpenSplitReview?: (campaign: MedicalCampaign) => void;
}

export const CampaignInspectorModal: React.FC<CampaignInspectorModalProps> = ({
  campaign,
  onClose,
  onApprove,
  onReject,
  onOpenSplitReview,
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#123C35]/45 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <GlassSurface className="max-h-[90vh] w-full max-w-3xl overflow-y-auto p-6 sm:p-8">
        <div onClick={(e) => e.stopPropagation()} className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b vc-hairline pb-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-[#159B79] uppercase">
                Campaign Review · {campaign.id.toUpperCase()}
              </p>
              <h2
                id="inspect-campaign-title"
                className="mt-1 font-display text-2xl font-bold text-[#123C35]"
              >
                {campaign.title}
              </h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[#414846]">
                <span className="font-medium text-[#131E1C]">{campaign.patientName}</span>
                <span aria-hidden="true">·</span>
                <span>{campaign.ageLabel}</span>
                <span aria-hidden="true">·</span>
                <span>{campaign.category}</span>
                <span aria-hidden="true">·</span>
                <span
                  className={
                    campaign.status === 'approved'
                      ? 'font-semibold text-[#159B79]'
                      : campaign.status === 'rejected'
                      ? 'font-semibold text-red-700'
                      : 'font-semibold text-amber-800'
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
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#123C35]/15 bg-[#F0FCF8] text-[#414846] hover:bg-[#DDF3E9] hover:text-[#123C35]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Patient & Funding Snapshot */}
          <div className="grid gap-6 md:grid-cols-12">
            <div className="h-48 overflow-hidden rounded-2xl border border-[#123C35]/14 bg-[#DDF3E9] md:col-span-5">
              <SafeImage
                src={campaign.imageUrl}
                alt={campaign.patientName}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="flex flex-col justify-between gap-4 md:col-span-7">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[#414846]">Medical Condition</span>
                  <p className="mt-0.5 font-semibold text-[#131E1C]">{campaign.condition}</p>
                </div>
                <div>
                  <span className="text-[#414846]">Hospital / Facility</span>
                  <p className="mt-0.5 font-semibold text-[#131E1C]">{campaign.hospitalName}</p>
                </div>
                <div>
                  <span className="text-[#414846]">Organizer</span>
                  <p className="mt-0.5 font-semibold text-[#131E1C]">
                    {campaign.organizerName} ({campaign.organizerRelation})
                  </p>
                </div>
                <div>
                  <span className="text-[#414846]">Settlement &amp; Location</span>
                  <p className="mt-0.5 font-semibold text-[#131E1C]">
                    {campaign.settlementPreference || 'Direct Hospital Billing'} · {campaign.location}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 border-t vc-hairline pt-3">
                <ProgressMeter value={pct} />
                <div className="vc-numeric flex justify-between text-xs">
                  <span className="font-semibold text-[#159B79]">
                    {formatINR(campaign.raisedAmount)} raised ({campaign.donorCount} donors)
                  </span>
                  <span className="font-semibold text-[#123C35]">
                    Goal: {formatINR(campaign.goalAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Story & Treatment Details */}
          <div className="flex flex-col gap-3 border-t vc-hairline pt-4">
            <h3 className="text-xs font-semibold tracking-[0.14em] text-[#159B79] uppercase">
              Clinical Summary &amp; Patient Story
            </h3>
            <p className="text-sm leading-relaxed text-[#131E1C]">{campaign.summary}</p>
            <p className="text-xs leading-relaxed text-[#414846]">
              <span className="font-semibold text-[#131E1C]">Planned Treatment: </span>
              {campaign.treatmentDetails}
            </p>
            {campaign.status === 'rejected' && campaign.rejectionReason && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                <span className="font-semibold">Recorded Rejection Reason: </span>
                {campaign.rejectionReason}
              </div>
            )}
          </div>

          {/* Medical Documents */}
          <div className="flex flex-col gap-3 border-t vc-hairline pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold tracking-[0.14em] text-[#159B79] uppercase">
                Uploaded Medical Documents (Demo Previews)
              </h3>
              <span className="font-mono text-xs font-medium tabular-nums text-[#414846]">
                {campaign.documents?.length ?? 0} attached
              </span>
            </div>

            {!campaign.documents || campaign.documents.length === 0 ? (
              <div className="rounded-xl border border-[#123C35]/12 bg-[#F8FAF7] p-4 text-xs text-[#414846]">
                No clinical estimate or hospital verification documents are attached to this submission.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {campaign.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-col gap-2 rounded-xl border border-[#123C35]/14 bg-[#F8FAF7] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-[#159B79] shrink-0" aria-hidden="true" />
                        <span className="text-sm font-semibold text-[#123C35]">{doc.title}</span>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold ${
                          doc.verified ? 'text-[#159B79]' : 'text-amber-800'
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
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#414846]">
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
                    <p className="text-xs leading-relaxed text-[#131E1C]">{doc.summary}</p>
                    {doc.previewUrl ? (
                      doc.mimeType === 'application/pdf' ? (
                        <iframe
                          title={doc.fileName || doc.title}
                          src={doc.previewUrl}
                          className="mt-2 h-56 w-full rounded-xl border border-[#123C35]/15 bg-white"
                        />
                      ) : (
                        <img
                          src={doc.previewUrl}
                          alt={doc.fileName || doc.title}
                          className="mt-2 max-h-56 w-full rounded-xl border border-[#123C35]/15 bg-white object-contain"
                        />
                      )
                    ) : doc.isTemporaryPreview ? (
                      <p className="mt-1 text-[11px] font-medium text-amber-800">
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
            {onOpenSplitReview && (
              <button
                type="button"
                onClick={() => onOpenSplitReview(campaign)}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[10px] border border-[#123C35]/20 bg-[#F8FAF7] px-4 py-2 text-xs font-semibold text-[#123C35] hover:bg-[#DDF3E9]"
              >
                <ShieldCheck className="h-4 w-4 text-[#159B79]" aria-hidden="true" />
                <span>Open Split-Screen Verification</span>
              </button>
            )}
            {campaign.status !== 'rejected' && (
              <button
                type="button"
                onClick={() => onReject(campaign)}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
              >
                <XCircle className="h-4 w-4" aria-hidden="true" />
                <span>Reject Campaign</span>
              </button>
            )}
            {campaign.status !== 'approved' && (
              <button
                type="button"
                onClick={() => onApprove(campaign)}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#123C35] px-5 py-2 text-xs font-semibold text-white hover:bg-[#159B79]"
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#123C35]/45 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <GlassSurface className="w-full max-w-lg p-6 sm:p-7">
        <div onClick={(e) => e.stopPropagation()} className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-3 border-b vc-hairline pb-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-red-700 uppercase">
                Decline Fundraiser
              </p>
              <h2
                id="reject-campaign-title"
                className="mt-1 font-display text-xl font-bold text-[#123C35]"
              >
                Reject “{campaign.title}”
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close reject dialog"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#123C35]/15 bg-[#F0FCF8] text-[#414846] hover:bg-[#DDF3E9] hover:text-[#123C35]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-[#414846]">
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
                    className="rounded-xl border border-[#123C35]/18 bg-[#F0FCF8] px-3 py-1.5 text-left text-[11px] font-medium text-[#131E1C] hover:border-[#159B79] hover:bg-[#DDF3E9]"
                  >
                    {tpl}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="reject-reason" className="text-xs font-semibold text-[#131E1C]">
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
                className="vc-input min-h-[96px] py-3"
              />
            </div>

            {error && (
              <p role="alert" className="text-xs font-medium text-red-700">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <VidaButton type="button" variant="secondary" onClick={onClose}>
                Cancel
              </VidaButton>
              <button
                type="submit"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700"
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#123C35]/45 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <GlassSurface className="max-h-[90vh] w-full max-w-xl overflow-y-auto p-6 sm:p-8">
        <div onClick={(e) => e.stopPropagation()} className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4 border-b vc-hairline pb-4">
            <div className="flex items-center gap-3.5">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-[#159B79]/30 bg-[#DDF3E9]">
                {account.avatarUrl ? (
                  <SafeImage
                    src={account.avatarUrl}
                    alt={account.fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[#123C35]">
                    <UserIcon className="h-6 w-6" aria-hidden="true" />
                  </div>
                )}
              </div>
              <div>
                <h2
                  id="inspect-user-title"
                  className="font-display text-xl font-bold text-[#123C35]"
                >
                  {account.fullName}
                </h2>
                <p className="text-xs text-[#414846]">
                  {account.role} · Joined {account.createdAt}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close user profile dialog"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#123C35]/15 bg-[#F0FCF8] text-[#414846] hover:bg-[#DDF3E9] hover:text-[#123C35]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="grid gap-3 text-xs sm:grid-cols-2">
            <div>
              <span className="text-[#414846]">Email</span>
              <p className="mt-0.5 font-medium text-[#131E1C]">{account.email}</p>
            </div>
            <div>
              <span className="text-[#414846]">Phone</span>
              <p className="mt-0.5 font-mono font-medium text-[#131E1C]">{account.phone}</p>
            </div>
            <div>
              <span className="text-[#414846]">Location</span>
              <p className="mt-0.5 font-medium text-[#131E1C]">{account.location || 'Not provided'}</p>
            </div>
            <div>
              <span className="text-[#414846]">Account Status</span>
              <p
                className={`mt-0.5 font-semibold ${
                  account.blocked ? 'text-red-700' : 'text-[#159B79]'
                }`}
              >
                {account.blocked ? 'Blocked' : 'Active'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-y vc-hairline py-4">
            <div>
              <span className="text-xs font-medium text-[#414846]">Campaigns Created</span>
              <p className="vc-numeric mt-1 text-xl font-bold text-[#123C35]">
                {userCampaigns.length}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-[#414846]">Total Donated</span>
              <p className="vc-numeric mt-1 text-xl font-bold text-[#159B79]">
                {formatINR(totalDonated)}
              </p>
            </div>
          </div>

          {userCampaigns.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold text-[#123C35]">Created Campaigns</h3>
              <ul className="flex flex-col gap-1.5 text-xs text-[#414846]">
                {userCampaigns.map((c) => (
                  <li key={c.id} className="flex justify-between gap-2">
                    <span className="truncate font-medium text-[#131E1C]">{c.title}</span>
                    <span className="shrink-0 font-semibold capitalize text-[#159B79]">{c.status}</span>
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
                className={`inline-flex min-h-[44px] items-center rounded-xl px-4 py-2 text-xs font-semibold ${
                  account.blocked
                    ? 'bg-[#123C35] text-white hover:bg-[#159B79]'
                    : 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#123C35]/45 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <GlassSurface className="w-full max-w-md p-6 sm:p-7">
        <div onClick={(e) => e.stopPropagation()} className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-3 border-b vc-hairline pb-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-[#159B79] uppercase">
                Taxonomy Control
              </p>
              <h2
                id="category-modal-title"
                className="mt-1 font-display text-xl font-bold text-[#123C35]"
              >
                {editingCategory ? 'Edit Medical Category' : 'Add Medical Category'}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close category dialog"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#123C35]/15 bg-[#F0FCF8] text-[#414846] hover:bg-[#DDF3E9] hover:text-[#123C35]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cat-name" className="text-xs font-semibold text-[#131E1C]">
                Category Name *
              </label>
              <input
                id="cat-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Pediatric Neurology"
                className="vc-input"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="cat-display-title" className="text-xs font-semibold text-[#131E1C]">
                Display Title (Optional)
              </label>
              <input
                id="cat-display-title"
                type="text"
                value={displayTitle}
                onChange={(e) => setDisplayTitle(e.target.value)}
                placeholder="Shown on category showcase cards (defaults to Name)"
                className="vc-input"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="cat-desc" className="text-xs font-semibold text-[#131E1C]">
                Clinical Scope Description
              </label>
              <textarea
                id="cat-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Summarize treatments covered under this category..."
                className="vc-input min-h-[96px] py-3"
              />
            </div>

            {error && (
              <p role="alert" className="text-xs font-medium text-red-700">
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#123C35]/45 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <GlassSurface className="w-full max-w-lg p-6 sm:p-7">
        <div onClick={(e) => e.stopPropagation()} className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-3 border-b vc-hairline pb-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#159B79]/30 bg-[#DDF3E9] text-[#123C35]">
                <Mail className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2
                  id="inspect-msg-title"
                  className="font-display text-xl font-bold text-[#123C35]"
                >
                  {message.subject}
                </h2>
                <p className="mt-0.5 text-xs text-[#414846]">
                  From {message.name} ({message.email})
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close message dialog"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#123C35]/15 bg-[#F0FCF8] text-[#414846] hover:bg-[#DDF3E9] hover:text-[#123C35]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="flex items-center justify-between text-xs text-[#414846]">
            <span className="font-mono tabular-nums">
              {new Date(message.createdAt).toLocaleString()}
            </span>
            <span
              className={`font-semibold capitalize ${
                message.status === 'resolved'
                  ? 'text-[#159B79]'
                  : message.status === 'read'
                  ? 'text-[#123C35]'
                  : 'text-amber-800'
              }`}
            >
              Status: {message.status}
            </span>
          </div>

          <p className="rounded-2xl border border-[#123C35]/14 bg-[#F0FCF8] p-4 text-sm leading-relaxed text-[#131E1C]">
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
                className="inline-flex min-h-[44px] items-center rounded-xl border border-[#123C35]/20 bg-[#DDF3E9] px-4 py-2 text-xs font-semibold text-[#123C35] hover:bg-[#DDF3E9]/70"
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
                className="inline-flex min-h-[44px] items-center rounded-xl bg-[#123C35] px-4 py-2 text-xs font-semibold text-white hover:bg-[#159B79]"
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
