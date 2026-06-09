// Pure filter logic for the dashboard's site list. Kept out of the React
// tree so it can be unit-tested and memoized easily.

import type { MonitoredSite, SiteStatus } from "./types";

export type FilterId = "all" | "online" | "offline" | "new" | "last";

export interface FilterOption {
  id: FilterId;
  label: string;
  /** Tiny helper text shown under the label in the dropdown. */
  hint: string;
}

export const FILTER_OPTIONS: readonly FilterOption[] = [
  { id: "all", label: "All sites", hint: "Show every monitored endpoint" },
  { id: "online", label: "Online only", hint: "Endpoints that responded 2xx" },
  { id: "offline", label: "Offline only", hint: "Endpoints that errored or timed out" },
  { id: "new", label: "New", hint: "Recently added (no successful check yet)" },
  { id: "last", label: "Last checked", hint: "Sort by most recent check time" },
] as const;

/**
 * Returns a filtered (and optionally sorted) view of the sites array.
 * - `all`: identity
 * - `online`/`offline`: filter by status
 * - `new`: keep only sites that have never been successfully checked
 *   (`lastCheckedAt` is null or the status is still Checking AND no
 *   positive statusCode arrived). We treat sites with no last-checked
 *   timestamp as "new" because they've never produced a definitive
 *   Online/Offline result.
 * - `last`: same as `all` but sorted by `lastCheckedAt` desc. Sites with
 *   `null` lastCheckedAt float to the end.
 */
export function applyFilter(
  sites: MonitoredSite[],
  filter: FilterId,
): MonitoredSite[] {
  switch (filter) {
    case "all":
      return sites;
    case "online":
      return sites.filter((s) => s.status === "Online");
    case "offline":
      return sites.filter((s) => s.status === "Offline");
    case "new":
      return sites.filter((s) => s.lastCheckedAt === null);
    case "last":
      return [...sites].sort((a, b) => {
        const ta = a.lastCheckedAt ? Date.parse(a.lastCheckedAt) : -Infinity;
        const tb = b.lastCheckedAt ? Date.parse(b.lastCheckedAt) : -Infinity;
        return tb - ta;
      });
  }
}

/** Helper used by the dashboard's stat tiles — counts by status. */
export function countByStatus(sites: MonitoredSite[]): Record<SiteStatus, number> {
  const counts: Record<SiteStatus, number> = {
    Online: 0,
    Offline: 0,
    Checking: 0,
  };
  for (const s of sites) counts[s.status]++;
  return counts;
}
