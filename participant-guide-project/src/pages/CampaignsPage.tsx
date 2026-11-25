import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUpDown, Clock, Search, X } from 'lucide-react';
import { useVidaCare } from '../context/VidaCareContext';
import { MedicalCategory } from '../types/campaign';
import { CampaignCard } from '../components/CampaignCard';
import {
  GlassSurface,
  SectionHeading,
} from '../components/ui/DesignPrimitives';

type SortOption = 'latest' | 'most_funded' | 'almost_goal' | 'urgent';

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'latest', label: 'Latest' },
  { value: 'most_funded', label: 'Most Funded' },
  { value: 'almost_goal', label: 'Almost Reached Goal' },
  { value: 'urgent', label: 'Urgent' },
];

const INITIAL_PAGE_SIZE = 6;
const LOAD_MORE_STEP = 3;

export const CampaignsPage: React.FC = () => {
  const { approvedCampaigns, activeCategories, categories } = useVidaCare();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawCategoryParam = searchParams.get('category');

  const categoryFilterOptions = useMemo<
    Array<{ key: 'All' | MedicalCategory; label: string }>
  >(
    () => [
      { key: 'All', label: 'All' },
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

  const [sortBy, setSortBy] = useState<SortOption>('latest');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(INITIAL_PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(INITIAL_PAGE_SIZE);
  }, [rawCategoryParam]);

  // Urgent approved campaigns highlighted at the top
  const urgentSpotlight = useMemo(() => {
    return [...approvedCampaigns]
      .filter((c) => c.isUrgent || c.daysRemaining <= 10)
      .sort((a, b) => a.daysRemaining - b.daysRemaining)
      .slice(0, 3);
  }, [approvedCampaigns]);

  // Filtered and sorted approved campaigns
  const filteredAndSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const matched = approvedCampaigns.filter((c) => {
      const matchesCategory =
        selectedCategory === 'All' || c.category === selectedCategory;
      const matchesQuery =
        !q ||
        c.patientName.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.condition.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.hospitalName.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q) ||
        c.summary.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });

    const sorted = [...matched].sort((a, b) => {
      if (sortBy === 'most_funded') {
        return b.raisedAmount - a.raisedAmount;
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
      // 'latest'
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Ensure strict uniqueness by id
    const seen = new Set<string>();
    return sorted.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [approvedCampaigns, selectedCategory, searchQuery, sortBy]);

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

  const handleSortChange = (nextSort: SortOption) => {
    setSortBy(nextSort);
    setVisibleCount(INITIAL_PAGE_SIZE);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setVisibleCount(INITIAL_PAGE_SIZE);
  };

  const handleResetAll = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('category');
    setSearchParams(next);
    setSearchQuery('');
    setSortBy('latest');
    setVisibleCount(INITIAL_PAGE_SIZE);
  };

  return (
    <div className="flex flex-col">
      {/* 1. Page Header */}
      <section className="pt-12 pb-10 sm:pt-16 sm:pb-12">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 border-b vc-hairline pb-10 md:flex-row md:items-end">
            <SectionHeading
              kicker="Verified Patient Directory"
              title="Stories of Hope"
              description="Every campaign here represents a real patient verified through accredited hospital partners. Your contribution directly bridges surgical, oncology, and recovery costs."
            />

            <div className="flex items-center gap-6 text-xs text-slate-400 shrink-0">
              <div className="flex flex-col">
                <span className="text-slate-400">Approved Funds</span>
                <span className="font-mono text-lg font-semibold tabular-nums text-amber-300">
                  {approvedCampaigns.length} Active
                </span>
              </div>
              <div className="h-8 w-px bg-slate-800" aria-hidden="true" />
              <div className="flex flex-col">
                <span className="text-slate-400">Clinical Review</span>
                <span className="font-mono text-lg font-semibold tabular-nums text-sky-300">
                  100% Verified
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Urgent Campaigns Section */}
      {urgentSpotlight.length > 0 && (
        <section aria-labelledby="urgent-campaigns-heading" className="pb-14">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-medium tracking-[0.14em] text-amber-300">
                  Time-Sensitive Care
                </p>
                <h2
                  id="urgent-campaigns-heading"
                  className="mt-1 font-display text-2xl font-semibold text-slate-50 sm:text-3xl"
                >
                  Urgent Campaigns
                </h2>
              </div>
              <div className="inline-flex items-center gap-2 text-xs text-slate-400">
                <Clock className="h-4 w-4 text-amber-300" aria-hidden="true" />
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

      {/* 3. Search, Category Filters, Sorting & Directory Grid */}
      <section className="border-t vc-hairline py-14 sm:py-16">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <h2 className="font-display text-2xl font-semibold text-slate-50 sm:text-3xl">
                Browse All Approved Campaigns
              </h2>
              <p className="font-mono text-xs tabular-nums text-slate-400">
                Showing {displayedCampaigns.length} of {filteredAndSorted.length}{' '}
                {filteredAndSorted.length === 1 ? 'campaign' : 'campaigns'}
              </p>
            </div>

            {/* Search & Sort Controls */}
            <GlassSurface className="flex flex-col gap-5 p-5 sm:p-6">
              <div className="grid gap-4 lg:grid-cols-12">
                {/* Search Bar */}
                <div className="relative lg:col-span-8">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Search by patient name, treatment, condition, or hospital..."
                    aria-label="Search medical campaigns"
                    className="min-h-[44px] w-full rounded-lg border border-slate-800 bg-slate-950/75 pr-10 pl-10 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-300/60 focus:outline-none focus:ring-2 focus:ring-amber-300/20"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => handleSearchChange('')}
                      aria-label="Clear search query"
                      className="absolute top-1/2 right-2.5 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-slate-400 hover:text-white"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>

                {/* Sorting Dropdown */}
                <div className="relative lg:col-span-4">
                  <label htmlFor="campaign-sort" className="sr-only">
                    Sort campaigns
                  </label>
                  <ArrowUpDown
                    className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-amber-300"
                    aria-hidden="true"
                  />
                  <select
                    id="campaign-sort"
                    value={sortBy}
                    onChange={(e) => handleSortChange(e.target.value as SortOption)}
                    className="min-h-[44px] w-full appearance-none rounded-lg border border-slate-800 bg-slate-950/75 pr-8 pl-10 text-sm text-slate-100 focus:border-amber-300/60 focus:outline-none focus:ring-2 focus:ring-amber-300/20"
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
                className="flex flex-wrap items-center gap-2 border-t vc-hairline pt-4"
              >
                {categoryFilterOptions.map((option) => {
                  const active = selectedCategory === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => handleCategoryChange(option.key)}
                      className={`min-h-[38px] rounded-lg px-3.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                        active
                          ? 'bg-amber-300 text-slate-950 font-semibold shadow-[0_0_20px_-6px_rgba(251,191,36,0.55)]'
                          : 'border border-slate-800 bg-slate-900/65 text-slate-300 hover:border-sky-300/40 hover:text-white'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </GlassSurface>
          </div>

          {/* Results Grid or Empty State */}
          {filteredAndSorted.length === 0 ? (
            <GlassSurface className="mt-10 flex flex-col items-center gap-4 p-12 text-center">
              <p className="text-xs font-medium tracking-[0.14em] text-amber-300">
                No Matching Campaigns
              </p>
              <h3 className="font-display text-2xl font-semibold text-slate-50">
                We couldn’t find any patient stories matching your filters.
              </h3>
              <p className="max-w-md text-sm leading-relaxed text-slate-300/85">
                Try broadening your keyword search or returning to all medical
                categories to view verified patients awaiting support.
              </p>
              <button
                type="button"
                onClick={handleResetAll}
                className="mt-2 inline-flex min-h-[42px] items-center justify-center rounded-lg bg-teal-400 px-5 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
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

              {/* Load More Control */}
              {hasMore && (
                <div className="mt-12 flex flex-col items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleCount((prev) =>
                        Math.min(filteredAndSorted.length, prev + LOAD_MORE_STEP)
                      )
                    }
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-amber-300/40 bg-slate-900/75 px-6 py-2.5 text-sm font-medium text-amber-200 transition-all hover:border-amber-300 hover:bg-amber-300/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
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
