import React, { useMemo, useState } from 'react';
import { Calendar, Download, FileSpreadsheet, TrendingUp } from 'lucide-react';
import {
  CategoryItem,
  DonationRecord,
  MedicalCampaign,
  RegisteredAccount,
} from '../../types/campaign';
import { formatINR } from '../../lib/format';
import { GlassSurface, ProgressMeter } from '../ui/DesignPrimitives';

export const DONATION_CSV_HEADERS = [
  'ID',
  'Campaign',
  'Donor',
  'Email',
  'Anonymous',
  'Amount',
  'Method',
  'Status',
  'Reference',
  'Timestamp',
];

export function buildDonationsCsvRows(
  donations: DonationRecord[]
): Array<Array<string | number | boolean | undefined>> {
  return donations.map((d) => [
    d.id,
    d.campaignTitle,
    d.isAnonymous ? 'Anonymous Donor' : d.donorName,
    d.isAnonymous ? 'Hidden (Anonymous)' : d.donorEmail || '',
    d.isAnonymous ? 'Yes' : 'No',
    d.amount,
    d.paymentMethod || 'UPI',
    d.paymentStatus || 'Completed',
    d.transactionRef || '',
    d.timestamp,
  ]);
}

interface AdminAnalyticsSectionProps {
  campaigns: MedicalCampaign[];
  donations: DonationRecord[];
  accounts: RegisteredAccount[];
  categories: CategoryItem[];
}

type DatePreset = 'all' | '30d' | '7d' | 'custom';

function csvEscape(val: string | number | boolean | undefined): string {
  const s = String(val ?? '');
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function triggerCsvDownload(filename: string, headers: string[], rows: Array<Array<string | number | boolean | undefined>>) {
  const lines = [
    headers.map(csvEscape).join(','),
    ...rows.map((r) => r.map(csvEscape).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const AdminAnalyticsSection: React.FC<AdminAnalyticsSectionProps> = ({
  campaigns,
  donations,
  accounts,
  categories,
}) => {
  const [preset, setPreset] = useState<DatePreset>('all');
  const [fromDate, setFromDate] = useState('2026-11-01');
  const [toDate, setToDate] = useState(() =>
    new Date(
      Math.max(Date.now(), new Date('2026-11-30T00:00:00Z').getTime())
    )
      .toISOString()
      .slice(0, 10)
  );
  const [exportNotice, setExportNotice] = useState<string>('');
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  const dateBounds = useMemo(() => {
    const refEnd = new Date(
      Math.max(Date.now(), new Date('2026-11-24T23:59:59Z').getTime())
    );
    if (preset === 'all') return { start: null as Date | null, end: null as Date | null };
    if (preset === '30d') {
      const start = new Date(refEnd);
      start.setDate(start.getDate() - 30);
      return { start, end: refEnd };
    }
    if (preset === '7d') {
      const start = new Date(refEnd);
      start.setDate(start.getDate() - 7);
      return { start, end: refEnd };
    }
    const start = fromDate ? new Date(`${fromDate}T00:00:00Z`) : null;
    const end = toDate ? new Date(`${toDate}T23:59:59Z`) : null;
    return { start, end };
  }, [preset, fromDate, toDate]);

  const inRange = (isoDate: string) => {
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return true;
    if (dateBounds.start && d < dateBounds.start) return false;
    if (dateBounds.end && d > dateBounds.end) return false;
    return true;
  };

  const filteredDonations = useMemo(
    () => donations.filter((d) => inRange(d.timestamp)),
    [donations, dateBounds]
  );

  const filteredCampaigns = useMemo(
    () => campaigns.filter((c) => inRange(c.createdAt)),
    [campaigns, dateBounds]
  );

  const filteredAccounts = useMemo(
    () => accounts.filter((a) => inRange(a.createdAt)),
    [accounts, dateBounds]
  );

  // Aggregate daily donation trend
  const dailyTrend = useMemo(() => {
    const map = new Map<string, { date: string; total: number; count: number }>();
    filteredDonations.forEach((d) => {
      const day = d.timestamp.slice(0, 10);
      const prev = map.get(day) || { date: day, total: 0, count: 0 };
      map.set(day, {
        date: day,
        total: prev.total + d.amount,
        count: prev.count + 1,
      });
    });
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredDonations]);

  const maxDailyTotal = useMemo(
    () => Math.max(1000, ...dailyTrend.map((d) => d.total)),
    [dailyTrend]
  );

  // Category breakdown across filtered campaigns
  const categoryStats = useMemo(() => {
    return categories.map((cat) => {
      const matched = filteredCampaigns.filter((c) => c.category === cat.name);
      const raised = matched.reduce((s, c) => s + c.raisedAmount, 0);
      const goal = matched.reduce((s, c) => s + c.goalAmount, 0);
      return {
        name: cat.name,
        count: matched.length,
        raised,
        goal,
        pct: goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0,
      };
    });
  }, [categories, filteredCampaigns]);

  // User growth by month
  const userGrowthByMonth = useMemo(() => {
    const map = new Map<string, { month: string; donors: number; fundraisers: number; total: number }>();
    filteredAccounts.forEach((acc) => {
      const month = acc.createdAt.slice(0, 7);
      const curr = map.get(month) || { month, donors: 0, fundraisers: 0, total: 0 };
      if (acc.role === 'Donor') curr.donors += 1;
      if (acc.role === 'Patient/Fundraiser') curr.fundraisers += 1;
      curr.total += 1;
      map.set(month, curr);
    });
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredAccounts]);

  const totalFilteredDonated = useMemo(
    () => filteredDonations.reduce((sum, d) => sum + d.amount, 0),
    [filteredDonations]
  );

  const avgDonation =
    filteredDonations.length > 0
      ? Math.round(totalFilteredDonated / filteredDonations.length)
      : 0;

  const handleExportDonations = () => {
    const file = `vidacare-donations-${new Date().toISOString().slice(0, 10)}.csv`;
    triggerCsvDownload(
      file,
      DONATION_CSV_HEADERS,
      buildDonationsCsvRows(filteredDonations)
    );
    setExportNotice(`Exported ${filteredDonations.length} donation rows to ${file}`);
  };

  const handleExportCampaigns = () => {
    const file = `vidacare-campaigns-${new Date().toISOString().slice(0, 10)}.csv`;
    triggerCsvDownload(
      file,
      ['ID', 'Title', 'Patient', 'Category', 'Hospital', 'Status', 'Raised', 'Goal', 'Donors', 'CreatedAt'],
      filteredCampaigns.map((c) => [
        c.id,
        c.title,
        c.patientName,
        c.category,
        c.hospitalName,
        c.status,
        c.raisedAmount,
        c.goalAmount,
        c.donorCount,
        c.createdAt,
      ])
    );
    setExportNotice(`Exported ${filteredCampaigns.length} campaign rows to ${file}`);
  };

  const handleExportUsers = () => {
    const file = `vidacare-users-${new Date().toISOString().slice(0, 10)}.csv`;
    triggerCsvDownload(
      file,
      ['ID', 'FullName', 'Email', 'Phone', 'Location', 'Role', 'Status', 'JoinedAt'],
      filteredAccounts.map((a) => [
        a.id,
        a.fullName,
        a.email,
        a.phone,
        a.location || '',
        a.role,
        a.blocked ? 'Blocked' : 'Active',
        a.createdAt,
      ])
    );
    setExportNotice(`Exported ${filteredAccounts.length} user rows to ${file}`);
  };

  const activePoint =
    dailyTrend.find((d) => d.date === hoveredDay) ||
    dailyTrend[dailyTrend.length - 1] ||
    null;

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Date Filter Bar */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-[#159B79] uppercase">
            Platform Telemetry (Demo Store)
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold text-[#123C35]">
            Reports &amp; Analytics
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'all', label: 'All Time' },
              { id: '30d', label: 'Last 30 Days' },
              { id: '7d', label: 'Last 7 Days' },
              { id: 'custom', label: 'Custom Range' },
            ] as Array<{ id: DatePreset; label: string }>
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPreset(item.id)}
              className={`min-h-[38px] rounded-xl px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#159B79] ${
                preset === item.id
                  ? 'bg-[#123C35] text-white shadow-sm'
                  : 'border border-[#123C35]/18 bg-white text-[#414846] hover:border-[#159B79] hover:text-[#123C35]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {preset === 'custom' && (
        <GlassSurface className="flex flex-wrap items-center gap-4 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#123C35]">
            <Calendar className="h-4 w-4 text-[#159B79]" aria-hidden="true" />
            <span>Date Window:</span>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="analytics-from" className="text-xs font-medium text-[#414846]">
              From
            </label>
            <input
              id="analytics-from"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="vc-input min-h-[38px] w-auto px-3 font-mono text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="analytics-to" className="text-xs font-medium text-[#414846]">
              To
            </label>
            <input
              id="analytics-to"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="vc-input min-h-[38px] w-auto px-3 font-mono text-xs"
            />
          </div>
        </GlassSurface>
      )}

      {/* Summary KPI Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <GlassSurface className="flex flex-col gap-1.5 p-5">
          <span className="text-xs font-medium text-[#414846]">Recorded Gift Volume</span>
          <span className="vc-numeric font-display text-2xl font-bold text-[#123C35]">
            {formatINR(totalFilteredDonated)}
          </span>
          <span className="text-xs text-[#414846]">
            Across {filteredDonations.length} transactions in range
          </span>
        </GlassSurface>

        <GlassSurface className="flex flex-col gap-1.5 p-5">
          <span className="text-xs font-medium text-[#414846]">Average Contribution</span>
          <span className="vc-numeric font-display text-2xl font-bold text-[#159B79]">
            {formatINR(avgDonation)}
          </span>
          <span className="text-xs text-[#414846]">
            Mean donation size in period
          </span>
        </GlassSurface>

        <GlassSurface className="flex flex-col gap-1.5 p-5">
          <span className="text-xs font-medium text-[#414846]">New Member Signups</span>
          <span className="vc-numeric font-display text-2xl font-bold text-[#123C35]">
            {filteredAccounts.length}
          </span>
          <span className="text-xs text-[#414846]">
            {filteredCampaigns.length} campaigns created in range
          </span>
        </GlassSurface>
      </div>

      {/* Donation Trends Bar Chart */}
      <GlassSurface className="flex flex-col gap-5 p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <TrendingUp className="h-4 w-4 text-[#159B79]" aria-hidden="true" />
            <h3 className="font-display text-xl font-bold text-[#123C35]">
              Donation Trends
            </h3>
          </div>
          {activePoint && (
            <div className="vc-numeric text-xs text-[#414846]">
              <span className="font-semibold text-[#123C35]">{activePoint.date}</span>
              <span className="mx-2 text-[#414846]/50">·</span>
              <span className="font-semibold text-[#159B79]">{formatINR(activePoint.total)}</span>
              <span className="mx-2 text-[#414846]/50">·</span>
              <span>
                {activePoint.count}{' '}
                {activePoint.count === 1 ? 'donation' : 'donations'}
              </span>
            </div>
          )}
        </div>

        {dailyTrend.length === 0 ? (
          <div className="rounded-xl border border-[#123C35]/12 bg-[#F8FAF7] p-8 text-center text-sm text-[#414846]">
            No donation transactions recorded inside the selected date window.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex h-52 items-end gap-3 overflow-x-auto rounded-xl border border-[#123C35]/12 bg-[#F8FAF7] px-4 pt-6 pb-3 sm:gap-5 sm:px-6">
              {dailyTrend.map((day) => {
                const heightPct = Math.max(
                  10,
                  Math.round((day.total / maxDailyTotal) * 100)
                );
                const isSelected = activePoint?.date === day.date;
                return (
                  <button
                    key={day.date}
                    type="button"
                    onMouseEnter={() => setHoveredDay(day.date)}
                    onFocus={() => setHoveredDay(day.date)}
                    onClick={() => setHoveredDay(day.date)}
                    className="group flex h-full min-w-[44px] flex-1 flex-col items-center justify-end gap-2 focus:outline-none"
                    aria-label={`${day.date}: ${formatINR(day.total)} across ${day.count} donations`}
                  >
                    <span className="vc-numeric text-[10px] font-medium text-[#414846] group-hover:text-[#123C35]">
                      {formatINR(day.total)}
                    </span>
                    <div className="flex w-full max-w-[44px] flex-1 items-end">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full rounded-t-lg transition-all duration-150 ${
                          isSelected
                            ? 'bg-gradient-to-t from-[#123C35] to-[#159B79] shadow-sm'
                            : 'bg-[#159B79]/45 group-hover:bg-[#159B79]'
                        }`}
                      />
                    </div>
                    <span className="vc-numeric text-[10px] font-medium text-[#414846]">
                      {day.date.slice(5)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </GlassSurface>

      {/* Campaign Category Statistics & User Growth */}
      <div className="grid gap-6 lg:grid-cols-12">
        <GlassSurface className="flex flex-col gap-4 p-6 lg:col-span-7">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-bold text-[#123C35]">
              Campaign Statistics by Category
            </h3>
            <span className="vc-numeric text-xs font-medium text-[#414846]">
              {filteredCampaigns.length} campaigns
            </span>
          </div>

          {categoryStats.every((s) => s.count === 0) ? (
            <p className="text-sm text-[#414846]">
              No campaigns created within this date window.
            </p>
          ) : (
            <div className="flex flex-col gap-3.5">
              {categoryStats.map((stat) => (
                <div key={stat.name} className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-[#131E1C]">
                      {stat.name}{' '}
                      <span className="vc-numeric font-normal text-[#414846]">
                        ({stat.count})
                      </span>
                    </span>
                    <span className="vc-numeric font-semibold text-[#123C35]">
                      {formatINR(stat.raised)} / {formatINR(stat.goal)}
                    </span>
                  </div>
                  <ProgressMeter value={stat.pct} />
                </div>
              ))}
            </div>
          )}
        </GlassSurface>

        <GlassSurface className="flex flex-col gap-4 p-6 lg:col-span-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-bold text-[#123C35]">
              User Growth
            </h3>
            <span className="vc-numeric text-xs font-semibold text-[#159B79]">
              {filteredAccounts.length} accounts
            </span>
          </div>

          {userGrowthByMonth.length === 0 ? (
            <p className="text-sm text-[#414846]">
              No user registrations inside this date range.
            </p>
          ) : (
            <div className="flex flex-col divide-y vc-hairline">
              {userGrowthByMonth.map((row) => (
                <div
                  key={row.month}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0 text-xs"
                >
                  <div>
                    <p className="vc-numeric font-semibold text-[#131E1C]">
                      {row.month}
                    </p>
                    <p className="text-[#414846]">
                      {row.donors} donors · {row.fundraisers} fundraisers
                    </p>
                  </div>
                  <span className="vc-numeric text-base font-bold text-[#159B79]">
                    +{row.total}
                  </span>
                </div>
              ))}
            </div>
          )}
        </GlassSurface>
      </div>

      {/* Mock CSV Export Bar */}
      <GlassSurface className="flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="mt-0.5 h-5 w-5 text-[#159B79] shrink-0" aria-hidden="true" />
          <div>
            <h3 className="font-display text-lg font-bold text-[#123C35]">
              Mock CSV Report Exports
            </h3>
            <p className="text-xs text-[#414846]">
              Download filtered demo datasets directly as CSV spreadsheets from
              LocalStorage.
            </p>
            {exportNotice && (
              <p role="status" className="mt-1.5 text-xs font-semibold text-[#159B79]">
                {exportNotice}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleExportDonations}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#123C35]/20 bg-white px-3.5 py-2 text-xs font-semibold text-[#123C35] hover:bg-[#DDF3E9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#159B79]"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Donations CSV</span>
          </button>
          <button
            type="button"
            onClick={handleExportCampaigns}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#123C35]/20 bg-white px-3.5 py-2 text-xs font-semibold text-[#123C35] hover:bg-[#DDF3E9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#159B79]"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Campaigns CSV</span>
          </button>
          <button
            type="button"
            onClick={handleExportUsers}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#123C35]/20 bg-white px-3.5 py-2 text-xs font-semibold text-[#123C35] hover:bg-[#DDF3E9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#159B79]"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Users CSV</span>
          </button>
        </div>
      </GlassSurface>
    </div>
  );
};
