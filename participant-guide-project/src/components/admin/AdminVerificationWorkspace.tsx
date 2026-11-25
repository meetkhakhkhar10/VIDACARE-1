import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileCheck2,
  FileText,
  History,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  XCircle,
} from 'lucide-react';
import {
  AdminAuditEntry,
  MedicalCampaign,
  MedicalDocument,
} from '../../types/campaign';
import { formatINR } from '../../lib/format';
import { GlassSurface } from '../ui/DesignPrimitives';

interface AdminVerificationWorkspaceProps {
  campaigns: MedicalCampaign[];
  selectedCampaignId: string;
  onSelectCampaign: (id: string) => void;
  auditLogs: AdminAuditEntry[];
  onApprove: (
    campaignId: string,
    verifiedByNote?: string
  ) => { ok: boolean; error?: string };
  onRequestResubmit: (
    campaignId: string,
    note: string
  ) => { ok: boolean; error?: string };
  onReject: (
    campaignId: string,
    reason: string
  ) => { ok: boolean; error?: string };
  onToast: (type: 'ok' | 'err', text: string) => void;
}

const REMARK_PRESETS = [
  'Hospital estimate and billing contact confirmed by review desk.',
  'Please re-upload a signed hospital letterhead estimate with visible registration seal.',
  'Diagnostic report date or treating physician details require clarification.',
];

export const AdminVerificationWorkspace: React.FC<
  AdminVerificationWorkspaceProps
> = ({
  campaigns,
  selectedCampaignId,
  onSelectCampaign,
  auditLogs,
  onApprove,
  onRequestResubmit,
  onReject,
  onToast,
}) => {
  const [queueFilter, setQueueFilter] = useState<'pending' | 'all'>('pending');
  const [activeDocId, setActiveDocId] = useState<string>('');
  const [reviewNote, setReviewNote] = useState<string>('');
  const [noteError, setNoteError] = useState<string>('');
  const [checklists, setChecklists] = useState<
    Record<string, { estimate: boolean; diagnosis: boolean; settlement: boolean }>
  >({});

  const queueCampaigns = useMemo(() => {
    const sorted = [...campaigns].sort((a, b) => {
      const rank = (s: MedicalCampaign['status']) =>
        s === 'pending' ? 0 : s === 'rejected' ? 1 : 2;
      return rank(a.status) - rank(b.status);
    });
    if (queueFilter === 'pending') {
      const pending = sorted.filter((c) => c.status === 'pending');
      return pending.length > 0 ? pending : sorted;
    }
    return sorted;
  }, [campaigns, queueFilter]);

  const selectedCampaign = useMemo(() => {
    return (
      campaigns.find((c) => c.id === selectedCampaignId) ||
      queueCampaigns[0] ||
      null
    );
  }, [campaigns, selectedCampaignId, queueCampaigns]);

  useEffect(() => {
    if (!selectedCampaign) return;
    const docs = selectedCampaign.documents || [];
    setActiveDocId(docs[0]?.id || '');
    setReviewNote('');
    setNoteError('');
  }, [selectedCampaign?.id]);

  const activeDoc: MedicalDocument | null = useMemo(() => {
    if (!selectedCampaign?.documents?.length) return null;
    return (
      selectedCampaign.documents.find((d) => d.id === activeDocId) ||
      selectedCampaign.documents[0]
    );
  }, [selectedCampaign, activeDocId]);

  const checklistState = selectedCampaign
    ? checklists[selectedCampaign.id] || {
        estimate: selectedCampaign.hospitalVerified === true,
        diagnosis: selectedCampaign.hospitalVerified === true,
        settlement: selectedCampaign.hospitalVerified === true,
      }
    : { estimate: false, diagnosis: false, settlement: false };

  const toggleCheck = (key: 'estimate' | 'diagnosis' | 'settlement') => {
    if (!selectedCampaign) return;
    setChecklists((prev) => ({
      ...prev,
      [selectedCampaign.id]: {
        ...checklistState,
        [key]: !checklistState[key],
      },
    }));
  };

  const campaignLogs = useMemo(() => {
    if (!selectedCampaign) return auditLogs.slice(0, 6);
    const matched = auditLogs.filter((l) => l.campaignId === selectedCampaign.id);
    return matched.length > 0 ? matched : auditLogs.slice(0, 5);
  }, [auditLogs, selectedCampaign]);

  const handleAction = (kind: 'approve' | 'resubmit' | 'reject') => {
    if (!selectedCampaign) return;
    setNoteError('');
    const trimmed = reviewNote.trim();

    if ((kind === 'resubmit' || kind === 'reject') && !trimmed) {
      setNoteError(
        `Please enter a clear clinical remark before choosing ${
          kind === 'resubmit' ? 'Request Resubmission' : 'Reject Campaign'
        }.`
      );
      return;
    }

    if (kind === 'approve') {
      const res = onApprove(
        selectedCampaign.id,
        trimmed || 'Approved via Clinical Split-Screen Verification'
      );
      if (res.ok) {
        onToast('ok', `Approved “${selectedCampaign.title}” for public listing.`);
        setReviewNote('');
      } else {
        onToast('err', res.error || 'Could not approve campaign.');
      }
      return;
    }

    if (kind === 'resubmit') {
      const res = onRequestResubmit(selectedCampaign.id, trimmed);
      if (res.ok) {
        onToast(
          'ok',
          `Resubmission note sent to ${selectedCampaign.organizerName} and recorded in Audit Trail.`
        );
        setReviewNote('');
      } else {
        onToast('err', res.error || 'Could not request resubmission.');
      }
      return;
    }

    const res = onReject(selectedCampaign.id, trimmed);
    if (res.ok) {
      onToast('ok', `Rejected “${selectedCampaign.title}” and logged decision.`);
      setReviewNote('');
    } else {
      onToast('err', res.error || 'Could not reject campaign.');
    }
  };

  if (!selectedCampaign) {
    return (
      <GlassSurface className="p-8 text-sm text-[#414846]">
        No campaigns available for document inspection.
      </GlassSurface>
    );
  }

  const pendingCount = campaigns.filter((c) => c.status === 'pending').length;

  return (
    <div className="flex flex-col gap-5">
      {/* Queue Selector Strip */}
      <GlassSurface className="flex flex-col gap-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#159B79]">
              Split-Screen Clinical Desk
            </p>
            <h2 className="mt-0.5 font-display text-lg font-bold text-[#123C35]">
              Campaign Document Verification Queue
            </h2>
          </div>

          <div className="inline-flex items-center gap-1 rounded-[10px] border border-[#123C35]/15 bg-[#F8FAF7] p-1">
            <button
              type="button"
              onClick={() => setQueueFilter('pending')}
              className={`min-h-[32px] rounded-[8px] px-3 py-1 text-xs font-semibold transition-colors ${
                queueFilter === 'pending'
                  ? 'bg-[#123C35] text-white'
                  : 'text-[#414846] hover:text-[#123C35]'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setQueueFilter('all')}
              className={`min-h-[32px] rounded-[8px] px-3 py-1 text-xs font-semibold transition-colors ${
                queueFilter === 'all'
                  ? 'bg-[#123C35] text-white'
                  : 'text-[#414846] hover:text-[#123C35]'
              }`}
            >
              All Cases ({campaigns.length})
            </button>
          </div>
        </div>

        <div className="flex gap-2.5 overflow-x-auto pb-1">
          {queueCampaigns.map((c) => {
            const isSelected = c.id === selectedCampaign.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectCampaign(c.id)}
                className={`flex min-w-[230px] shrink-0 flex-col gap-1 rounded-[10px] border p-3 text-left transition-colors ${
                  isSelected
                    ? 'border-[#123C35] bg-[#DDF3E9]/65'
                    : 'border-[#123C35]/12 bg-[#F8FAF7] hover:border-[#159B79]/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span
                    className={`font-semibold ${
                      c.status === 'approved'
                        ? 'text-[#159B79]'
                        : c.status === 'rejected'
                        ? 'text-red-700'
                        : 'text-amber-800'
                    }`}
                  >
                    {c.status === 'approved'
                      ? 'Approved'
                      : c.status === 'rejected'
                      ? 'Rejected'
                      : 'Pending'}
                  </span>
                  <span className="vc-numeric text-[#414846]">
                    {c.documents?.length || 0} docs
                  </span>
                </div>
                <p className="truncate text-xs font-semibold text-[#123C35]">
                  {c.patientName} · {c.category}
                </p>
                <p className="truncate text-[11px] text-[#414846]">{c.hospitalName}</p>
              </button>
            );
          })}
        </div>
      </GlassSurface>

      {/* Split-Screen 2-Pane Workspace */}
      <div className="grid items-start gap-6 xl:grid-cols-12">
        {/* LEFT PANE: Patient Case Header & Document Preview Viewport */}
        <GlassSurface className="flex flex-col gap-5 p-5 sm:p-6 xl:col-span-7">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#123C35]/10 pb-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#414846]">
                <span className="font-semibold text-[#159B79]">{selectedCampaign.category}</span>
                <span aria-hidden="true">·</span>
                <span className="vc-numeric">ID {selectedCampaign.id.toUpperCase()}</span>
                <span aria-hidden="true">·</span>
                <span>Submitted {selectedCampaign.createdAt}</span>
              </div>
              <h3 className="mt-1 font-display text-xl font-bold text-[#123C35]">
                {selectedCampaign.title}
              </h3>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-[8px] border px-2.5 py-1 text-xs font-semibold ${
                selectedCampaign.status === 'approved'
                  ? 'border-[#159B79]/25 bg-[#DDF3E9] text-[#123C35]'
                  : selectedCampaign.status === 'rejected'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-amber-200 bg-amber-50 text-amber-800'
              }`}
            >
              {selectedCampaign.status === 'approved' ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-[#159B79]" aria-hidden="true" />
              ) : selectedCampaign.status === 'rejected' ? (
                <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span className="capitalize">{selectedCampaign.status}</span>
            </span>
          </div>

          {/* Clinical Metadata Grid */}
          <div className="grid gap-3 rounded-[12px] border border-[#123C35]/10 bg-[#F8FAF7] p-4 text-xs sm:grid-cols-2">
            <div>
              <span className="text-[#414846]">Patient &amp; Condition</span>
              <p className="mt-0.5 font-semibold text-[#131E1C]">
                {selectedCampaign.patientName} ({selectedCampaign.ageLabel}) ·{' '}
                {selectedCampaign.condition}
              </p>
            </div>
            <div>
              <span className="text-[#414846]">Treating Hospital</span>
              <p className="mt-0.5 flex items-center gap-1.5 font-semibold text-[#131E1C]">
                <Building2 className="h-3.5 w-3.5 shrink-0 text-[#159B79]" aria-hidden="true" />
                <span>{selectedCampaign.hospitalName}</span>
              </p>
            </div>
            <div>
              <span className="text-[#414846]">Physician &amp; Settlement</span>
              <p className="mt-0.5 flex items-center gap-1.5 font-semibold text-[#131E1C]">
                <Stethoscope className="h-3.5 w-3.5 shrink-0 text-[#159B79]" aria-hidden="true" />
                <span>
                  {selectedCampaign.treatingDoctor || 'Hospital Care Desk'} ·{' '}
                  {selectedCampaign.settlementPreference || 'Direct Hospital Billing'}
                </span>
              </p>
            </div>
            <div>
              <span className="text-[#414846]">Target Estimate &amp; Organizer</span>
              <p className="vc-numeric mt-0.5 font-semibold text-[#123C35]">
                {formatINR(selectedCampaign.goalAmount)} · {selectedCampaign.organizerName} (
                {selectedCampaign.organizerRelation})
              </p>
            </div>
          </div>

          {/* Document Selector & Inline Preview */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#123C35]">
                Submitted Medical Documents ({selectedCampaign.documents?.length || 0})
              </h4>
            </div>

            {!selectedCampaign.documents || selectedCampaign.documents.length === 0 ? (
              <div className="rounded-[12px] border border-amber-200 bg-amber-50 p-5 text-xs text-amber-900">
                No medical estimates or diagnostic reports are attached to this submission.
                Request resubmission with signed hospital paperwork before approving.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {selectedCampaign.documents.map((doc) => {
                    const isActive = activeDoc?.id === doc.id;
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => setActiveDocId(doc.id)}
                        className={`inline-flex min-h-[38px] items-center gap-2 rounded-[10px] border px-3 py-1.5 text-xs font-semibold transition-colors ${
                          isActive
                            ? 'border-[#123C35] bg-[#123C35] text-white'
                            : 'border-[#123C35]/18 bg-[#F8FAF7] text-[#123C35] hover:bg-[#DDF3E9]'
                        }`}
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className="max-w-[200px] truncate">{doc.title}</span>
                      </button>
                    );
                  })}
                </div>

                {activeDoc && (
                  <div className="rounded-[12px] border border-[#123C35]/15 bg-[#F8FAF7] p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#123C35]/10 pb-3.5">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#159B79]">
                          {activeDoc.docType}
                        </p>
                        <h5 className="mt-0.5 font-display text-base font-bold text-[#123C35]">
                          {activeDoc.title}
                        </h5>
                        <p className="vc-numeric mt-1 text-[11px] text-[#414846]">
                          Issued by {activeDoc.issuedBy} · Ref {activeDoc.referenceCode} ·{' '}
                          {activeDoc.issuedDate} · {activeDoc.fileSize}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-[8px] px-2.5 py-1 text-[11px] font-semibold ${
                          activeDoc.verified
                            ? 'bg-[#DDF3E9] text-[#123C35]'
                            : 'border border-amber-200 bg-amber-50 text-amber-800'
                        }`}
                      >
                        {activeDoc.verified ? (
                          <FileCheck2 className="h-3.5 w-3.5 text-[#159B79]" aria-hidden="true" />
                        ) : (
                          <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        <span>
                          {activeDoc.verified ? 'Cleared in Seeded Preview' : 'Pending Review'}
                        </span>
                      </span>
                    </div>

                    <p className="mt-3 text-xs leading-relaxed text-[#131E1C]">
                      {activeDoc.summary}
                    </p>

                    {activeDoc.previewUrl ? (
                      <div className="mt-4">
                        {activeDoc.mimeType === 'application/pdf' ? (
                          <iframe
                            title={activeDoc.fileName || activeDoc.title}
                            src={activeDoc.previewUrl}
                            className="h-64 w-full rounded-[10px] border border-[#123C35]/15 bg-white"
                          />
                        ) : (
                          <img
                            src={activeDoc.previewUrl}
                            alt={activeDoc.fileName || activeDoc.title}
                            className="max-h-72 w-full rounded-[10px] border border-[#123C35]/15 bg-white object-contain"
                          />
                        )}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-[10px] border border-dashed border-[#123C35]/20 bg-white p-4 text-xs text-[#414846]">
                        {activeDoc.isTemporaryPreview
                          ? 'Temporary browser file preview expired on reload (files stay in memory only during upload session). Document metadata remains intact above.'
                          : 'Seeded hospital record preview — verified metadata and reference code logged above for demonstration inspection.'}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </GlassSurface>

        {/* RIGHT PANE: Checklist, Decision Controls & Audit Trail */}
        <div className="flex flex-col gap-5 xl:col-span-5">
          <GlassSurface className="flex flex-col gap-4 p-5 sm:p-6">
            <div className="flex items-center gap-2 border-b border-[#123C35]/10 pb-3">
              <ClipboardCheck className="h-4 w-4 text-[#159B79]" aria-hidden="true" />
              <h4 className="font-display text-base font-bold text-[#123C35]">
                Hospital Verification Checklist
              </h4>
            </div>

            <div className="flex flex-col gap-2.5 text-xs">
              <label className="flex cursor-pointer items-start gap-2.5 rounded-[10px] border border-[#123C35]/10 bg-[#F8FAF7] p-3">
                <input
                  type="checkbox"
                  checked={checklistState.estimate}
                  onChange={() => toggleCheck('estimate')}
                  className="mt-0.5 h-4 w-4 rounded accent-[#159B79]"
                />
                <span className="text-[#131E1C]">
                  Itemized hospital cost estimate aligns with target{' '}
                  <strong className="vc-numeric text-[#123C35]">
                    {formatINR(selectedCampaign.goalAmount)}
                  </strong>
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-2.5 rounded-[10px] border border-[#123C35]/10 bg-[#F8FAF7] p-3">
                <input
                  type="checkbox"
                  checked={checklistState.diagnosis}
                  onChange={() => toggleCheck('diagnosis')}
                  className="mt-0.5 h-4 w-4 rounded accent-[#159B79]"
                />
                <span className="text-[#131E1C]">
                  Diagnosis ({selectedCampaign.condition}) &amp; hospital facility verified
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-2.5 rounded-[10px] border border-[#123C35]/10 bg-[#F8FAF7] p-3">
                <input
                  type="checkbox"
                  checked={checklistState.settlement}
                  onChange={() => toggleCheck('settlement')}
                  className="mt-0.5 h-4 w-4 rounded accent-[#159B79]"
                />
                <span className="text-[#131E1C]">
                  Organizer relation &amp; settlement route (
                  {selectedCampaign.settlementPreference || 'Direct Hospital Billing'}) confirmed
                </span>
              </label>
            </div>

            {/* Clinical Remarks */}
            <div className="flex flex-col gap-2 pt-1">
              <label
                htmlFor="split-review-note"
                className="text-xs font-semibold text-[#131E1C]"
              >
                Clinical Remarks / Resubmission Note
              </label>
              <div className="flex flex-wrap gap-1.5">
                {REMARK_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setReviewNote(preset);
                      setNoteError('');
                    }}
                    className="rounded-[8px] border border-[#123C35]/15 bg-[#F8FAF7] px-2.5 py-1 text-left text-[11px] font-medium text-[#414846] hover:border-[#159B79] hover:text-[#123C35]"
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <textarea
                id="split-review-note"
                rows={3}
                value={reviewNote}
                onChange={(e) => {
                  setReviewNote(e.target.value);
                  if (noteError) setNoteError('');
                }}
                placeholder="Enter verification note, requested documents, or rejection reason..."
                className="vc-input min-h-[88px] py-2.5 text-xs"
              />
              {noteError && (
                <p role="alert" className="text-xs font-medium text-red-700">
                  {noteError}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleAction('approve')}
                className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-[10px] bg-[#123C35] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#159B79]"
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                <span>Approve &amp; Mark Hospital Verified</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleAction('resubmit')}
                  className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-[10px] border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Request Resubmit</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAction('reject')}
                  className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
                >
                  <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Reject Case</span>
                </button>
              </div>
            </div>
          </GlassSurface>

          {/* Audit Trail */}
          <GlassSurface className="flex flex-col gap-3 p-5 sm:p-6">
            <div className="flex items-center justify-between border-b border-[#123C35]/10 pb-3">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-[#159B79]" aria-hidden="true" />
                <h4 className="font-display text-base font-bold text-[#123C35]">
                  Verification Audit Trail
                </h4>
              </div>
              <span className="vc-numeric text-[11px] font-medium text-[#414846]">
                {campaignLogs.length} entries
              </span>
            </div>

            {campaignLogs.length === 0 ? (
              <p className="text-xs text-[#414846]">
                No administrative review decisions logged yet in this session.
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-[#123C35]/10">
                {campaignLogs.map((log) => {
                  const matchedCampaign = campaigns.find((c) => c.id === log.campaignId);
                  return (
                    <div key={log.id} className="py-2.5 first:pt-0 last:pb-0 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`font-semibold ${
                            log.action === 'approved'
                              ? 'text-[#159B79]'
                              : log.action === 'rejected' || log.action === 'removed'
                              ? 'text-red-700'
                              : 'text-amber-800'
                          }`}
                        >
                          {log.action === 'approved'
                            ? 'Approved'
                            : log.action === 'rejected'
                            ? 'Rejected'
                            : log.action === 'removed'
                            ? 'Removed'
                            : 'Resubmission Requested'}
                        </span>
                        <span className="vc-numeric text-[11px] text-[#414846]">
                          {new Date(log.timestamp).toLocaleString('en-IN', {
                            month: 'short',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate font-medium text-[#131E1C]">
                        {matchedCampaign?.title || log.campaignId}
                      </p>
                      <p className="mt-0.5 text-[#414846]">{log.note}</p>
                      <p className="mt-0.5 text-[11px] text-[#414846]">
                        Officer: {log.actor}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassSurface>
        </div>
      </div>
    </div>
  );
};
