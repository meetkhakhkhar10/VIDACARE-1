import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUpDown, Clock, Search, ShieldCheck, X } from 'lucide-react';
import { useVidaCare } from '../context/VidaCareContext';
import { MedicalCategory } from '../types/campaign';
import { formatINR } from '../lib/format';
import { CampaignCard } from '../components/CampaignCard';
import {
  GlassSurface,
  SectionHeading,
} from '../components/ui/DesignPrimitives';

type SortOption = 'urgent' | 'almost_goal' | 'most_donors' | 'latest' | 'most_funded';

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'urgent', label: 'Urgency (Soonest First)' },
  { value: 'almost_goal', label: 'Goal Proximity' },
  { value: 'most_donors', label: 'Most Donors' },
  { value: 'latest', label: 'Recently Added' },
  { value: 'most_funded', label: 'Most Funded' },
];

const INITIAL_PAGE_SIZE = 6;
const LOAD_MORE_STEP = 3;

export const CampaignsPage: React.FC = () => {
  const {
    approvedCampaigns,
    activeCategories,
    categories,
    totalRaisedPlatform,
  } = useVidaCare();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawCategoryParam = searchParams.get('category');

  const categoryFilterOptions = useMemo<
    Array<{ key: 'All' | MedicalCategory; label: string }>
  >(
    () => [
      { key: 'All', label: 'All Specialties' },
      ...activeCategories.map((c) => ({
        key: c.name,
        label: c.displayTitle || c.name,
      })),
    ],
    [activeCategories]
  );

  const selectedCategory = useMemo<'All' | MedicalCategory>(() => {
    if (!rawCategoryParam || rawCategoryParam.trim().toLowerCase() === 'all') {
      return 'All';
    }
    const q = rawCategoryParam.trim().toLowerCase();
    const matched =
      activeCategories.find(
        (c) =>
          c.name.toLowerCase() === q ||
          (c.displayTitle && c.displayTitle.toLowerCase() === q)
      ) ||
      categories.find(
        (c) =>
          c.name.toLowerCase() === q ||
          (c.displayTitle && c.displayTitle.toLowerCase() === q)
      );
    return matched ? matched.name : 'All';
  }, [rawCategoryParam, activeCategories, categories]);

  const [sortBy, setSortBy] = useState<SortOption>('urgent');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyHospitalVerified, setOnlyHospitalVerified] = useState(false);
  const [only80G, setOnly80G] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(INITIAL_PAGE_SIZE);
  }, [rawCategoryParam]);

  const urgentSpotlight = useMemo(() => {
    return [...approvedCampaigns]
      .filter((c) => c.isUrgent || c.daysRemaining <= 10)
      .sort((a, b) => a.daysRemaining - b.daysRemaining)
      .slice(0, 3);
  }, [approvedCampaigns]);

  const filteredAndSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const matched = approvedCampaigns.filter((c) => {
      const matchesCategory =
        selectedCategory === 'All' || c.category === selectedCategory;
      const matchesHospital = !onlyHospitalVerified || Boolean(c.hospitalVerified);
      const matches80G = !only80G || Boolean(c.eligible80G);
      const matchesQuery =
        !q ||
        c.patientName.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.condition.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.hospitalName.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q) ||
        c.summary.toLowerCase().includes(q);
      return matchesCategory && matchesHospital && matches80G && matchesQuery;
    });

    const sorted = [...matched].sort((a, b) => {
      if (sortBy === 'most_funded') {
        return b.raisedAmount - a.raisedAmount;
      }
      if (sortBy === 'most_donors') {
        return b.donorCount - a.donorCount;
      }
      if (sortBy === 'almost_goal') {
        const ratioA = a.goalAmount > 0 ? a.raisedAmount / a.goalAmount : 0;
        const ratioB = b.goalAmount > 0 ? b.raisedAmount / b.goalAmount : 0;
        return ratioB - ratioA;
      }
      if (sortBy === 'urgent') {
        const urgA = a.isUrgent ? 0 : 1;
        const urgB = b.isUrgent ? 0 : 1;
        if (urgA !== urgB) return urgA - urgB;
        return a.daysRemaining - b.daysRemaining;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const seen = new Set<string>();
    return sorted.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [
    approvedCampaigns,
    selectedCategory,
    onlyHospitalVerified,
    only80G,
    searchQuery,
    sortBy,
  ]);

  const displayedCampaigns = useMemo(
    () => filteredAndSorted.slice(0, visibleCount),
    [filteredAndSorted, visibleCount]
  );

  const hasMore = visibleCount < filteredAndSorted.length;

  const handleCategoryChange = (category: 'All' | MedicalCategory) => {
    const next = new URLSearchParams(searchParams);
    if (category === 'All') {
      next.delete('category');
    } else {
      next.set('category', category);
    }
    setSearchParams(next);
    setVisibleCount(INITIAL_PAGE_SIZE);
  };

  const handleResetAll = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('category');
    setSearchParams(next);
    setSearchQuery('');
    setOnlyHospitalVerified(false);
    setOnly80G(false);
    setSortBy('urgent');
    setVisibleCount(INITIAL_PAGE_SIZE);
  };

  return (
    <div className="flex flex-col">
      {/* 1. Editorial Page Header aligned with compact metrics */}
      <section className="bg-[#F8FAF7] pt-12 pb-10 sm:pt-14">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-8 border-b border-[#123C35]/12 pb-10 lg:flex-row lg:items-end">
            <SectionHeading
              as="h1"
              kicker="Verified Patient Directory"
              title="Stories of Hope"
              description="Every fundraiser here represents a patient reviewed alongside accredited hospital estimates. Contributions support scheduled surgery, oncology infusions, and recovery care."
            />

            <div className="flex flex-wrap items-center gap-6 text-xs text-[#414846] shrink-0">
              <div className="flex flex-col">
                <span className="font-medium text-[#414846]">Active Cases</span>
                <span className="vc-numeric mt-0.5 text-xl font-bold text-[#123C35]">
                  {approvedCampaigns.length} Verified
                </span>
              </div>
              <div className="h-9 w-px bg-[#123C35]/15" aria-hidden="true" />
              <div className="flex flex-col">
                <span className="font-medium text-[#414846]">Raised to Date</span>
                <span className="vc-numeric mt-0.5 text-xl font-bold text-[#159B79]">
                  {formatINR(totalRaisedPlatform)}
                </span>
              </div>
              <div className="h-9 w-px bg-[#123C35]/15" aria-hidden="true" />
              <div className="flex flex-col">
                <span className="font-medium text-[#414846]">Platform Fee</span>
                <span className="vc-numeric mt-0.5 text-xl font-bold text-[#123C35]">
                  0%
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Time-Sensitive Urgent Campaigns Section */}
      {urgentSpotlight.length > 0 && (
        <section
          aria-labelledby="urgent-campaigns-heading"
          className="bg-[#F8FAF7] pb-14"
        >
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.16em] text-[#159B79] uppercase">
                  Time-Sensitive Care
                </p>
                <h2
                  id="urgent-campaigns-heading"
                  className="mt-1 font-display text-2xl font-bold text-[#123C35] sm:text-3xl"
                >
                  Urgent Campaigns
                </h2>
              </div>
              <div className="inline-flex items-center gap-2 text-xs font-medium text-[#414846]">
                <Clock className="h-4 w-4 text-[#159B79]" aria-hidden="true" />
                <span>Procedures scheduled within the coming days</span>
              </div>
            </div>

            <div className="mt-7 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {urgentSpotlight.map((campaign) => (
                <CampaignCard
                  key={`urgent-${campaign.id}`}
                  campaign={campaign}
                  variant="detailed"
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 3. Search, Filters, Sorting & Directory Grid */}
      <section className="border-t border-[#123C35]/10 bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <h2 className="font-display text-2xl font-bold text-[#123C35] sm:text-3xl">
                Browse All Verified Campaigns
              </h2>
              <p className="vc-numeric text-xs font-medium text-[#414846]">
                Showing {displayedCampaigns.length} of {filteredAndSorted.length}{' '}
                {filteredAndSorted.length === 1 ? 'campaign' : 'campaigns'}
              </p>
            </div>

            {/* Search, Sort & Clinical Filter Controls */}
            <GlassSurface className="flex flex-col gap-4 p-5 sm:p-6">
              <div className="grid gap-3.5 lg:grid-cols-12">
                <div className="relative lg:col-span-7">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#414846]"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setVisibleCount(INITIAL_PAGE_SIZE);
                    }}
                    placeholder="Search patient name, diagnosis, hospital, or city..."
                    aria-label="Search medical campaigns"
                    className="vc-input pr-10 pl-10"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setVisibleCount(INITIAL_PAGE_SIZE);
                      }}
                      aria-label="Clear search query"
                      className="absolute top-1/2 right-2.5 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-[#414846] hover:bg-[#DDF3E9] hover:text-[#123C35]"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>

                <div className="relative lg:col-span-5">
                  <label htmlFor="campaign-sort" className="sr-only">
                    Sort campaigns
                  </label>
                  <ArrowUpDown
                    className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#159B79]"
                    aria-hidden="true"
                  />
                  <select
                    id="campaign-sort"
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value as SortOption);
                      setVisibleCount(INITIAL_PAGE_SIZE);
                    }}
                    className="vc-input appearance-none pr-8 pl-10"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        Sort: {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Category Filter Buttons */}
              <div
                role="group"
                aria-label="Filter campaigns by medical category"
                className="flex flex-wrap items-center gap-2 border-t border-[#123C35]/10 pt-4"
              >
                {categoryFilterOptions.map((option) => {
                  const active = selectedCategory === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => handleCategoryChange(option.key)}
                      className={`min-h-[38px] rounded-[10px] px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#159B79] ${
                        active
                          ? 'bg-[#123C35] text-white'
                          : 'border border-[#123C35]/15 bg-[#F8FAF7] text-[#414846] hover:border-[#159B79]/50 hover:bg-[#DDF3E9] hover:text-[#123C35]'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              {/* Verification & Tax Summary Toggles */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#123C35]/10 pt-3.5 text-xs">
                <div className="flex flex-wrap items-center gap-4">
                  <label className="inline-flex cursor-pointer items-center gap-2 font-medium text-[#131E1C]">
                    <input
                      type="checkbox"
                      checked={onlyHospitalVerified}
                      onChange={(e) => {
                        setOnlyHospitalVerified(e.target.checked);
                        setVisibleCount(INITIAL_PAGE_SIZE);
                      }}
                      className="h-4 w-4 rounded border-[#159B79]/40 accent-[#159B79]"
                    />
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-[#159B79]" aria-hidden="true" />
                      <span>Verified Hospital Record</span>
                    </span>
                  </label>

                  <label className="inline-flex cursor-pointer items-center gap-2 font-medium text-[#131E1C]">
                    <input
                      type="checkbox"
                      checked={only80G}
                      onChange={(e) => {
                        setOnly80G(e.target.checked);
                        setVisibleCount(INITIAL_PAGE_SIZE);
                      }}
                      className="h-4 w-4 rounded border-[#159B79]/40 accent-[#159B79]"
                    />
                    <span>Tax Receipt Eligible (Demo 80G Summary)</span>
                  </label>
                </div>

                {(searchQuery ||
                  selectedCategory !== 'All' ||
                  onlyHospitalVerified ||
                  only80G) && (
                  <button
                    type="button"
                    onClick={handleResetAll}
                    className="font-semibold text-[#159B79] hover:text-[#123C35]"
                  >
                    Reset all filters
                  </button>
                )}
              </div>
            </GlassSurface>
          </div>

          {/* Directory Grid or Empty State */}
          {filteredAndSorted.length === 0 ? (
            <GlassSurface className="mt-10 flex flex-col items-center gap-4 p-12 text-center">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-[#159B79] uppercase">
                No Matching Campaigns
              </p>
              <h3 className="font-display text-2xl font-bold text-[#123C35]">
                No verified patient stories matched your current filters.
              </h3>
              <p className="max-w-md text-sm leading-relaxed text-[#414846]">
                Broaden your search keywords or clear specialty filters to view
                active clinical fundraisers.
              </p>
              <button
                type="button"
                onClick={handleResetAll}
                className="mt-2 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#123C35] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#159B79] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#159B79]"
              >
                Reset Search &amp; Filters
              </button>
            </GlassSurface>
          ) : (
            <>
              <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {displayedCampaigns.map((campaign) => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    variant="detailed"
                  />
                ))}
              </div>

              {hasMore && (
                <div className="mt-12 flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleCount((prev) =>
                        Math.min(filteredAndSorted.length, prev + LOAD_MORE_STEP)
                      )
                    }
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#123C35]/20 bg-[#F8FAF7] px-6 py-2.5 text-sm font-semibold text-[#123C35] transition-colors hover:border-[#159B79] hover:bg-[#DDF3E9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#159B79]"
                  >
                    <span>
                      Load More Campaigns ({filteredAndSorted.length - visibleCount}{' '}
                      remaining)
                    </span>
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
};
