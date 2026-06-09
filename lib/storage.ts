"use client";

import type { MonitoredSite } from "./types";

/**
 * LocalStorage schema is versioned so future migrations are explicit
 * and we keep the data footprint minimal (`client-localstorage-schema`).
 */
const STORAGE_KEY = "uptime-monitor:v1:sites";

/**
 * SSR-safe read. Always returns a fresh array — never undefined — so
 * consumers can render directly without null checks.
 */
export function readSites(): MonitoredSite[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        // Defensive shape-check + forward-compat migration: older entries may
        // lack `ssl`. We coerce missing fields to safe defaults instead of
        // dropping the entry.
        return parsed
            .filter(
                (s) =>
                    s &&
                    typeof s === "object" &&
                    typeof s.id === "string" &&
                    typeof s.url === "string",
            )
            .map((s) => ({
                ...s,
                ssl: (s as Partial<MonitoredSite>).ssl ?? null,
                lastCheckedAt:
                    typeof (s as Partial<MonitoredSite>).lastCheckedAt ===
                    "string"
                        ? (s as MonitoredSite).lastCheckedAt
                        : null,
            })) as MonitoredSite[];
    } catch {
        return [];
    }
}

export function writeSites(sites: MonitoredSite[]): void {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sites));
    } catch {
        // Quota exceeded or storage disabled — fail silently for the user
    }
}

export function clearSites(): void {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.removeItem(STORAGE_KEY);
    } catch {
        // ignore
    }
}

/**
 * Strip whitespace and invisible characters that sneak in from copy/paste
 * (zero-width space/BOM, NBSP, control chars). Keeps the input comparable
 * to what the user actually meant to type.
 */
function cleanInput(input: string): string {
    return input
        .replace(/[\u0000-\u001F\u007F\u00A0\u200B-\u200D\u2060\uFEFF]/g, "")
        .trim();
}

/**
 * Lenient hostname check. The WHATWG URL parser already enforces RFC 3986
 * host syntax (subdomains, hyphens, IDN/punycode, any TLD, IPv4, IPv6,
 * `localhost`). We only reject obviously malformed shapes.
 */
function isAcceptableHost(hostname: string): boolean {
    if (!hostname) return false;
    if (hostname.startsWith(".") || hostname.endsWith(".")) return false;
    if (hostname.includes("..")) return false;
    return true;
}

/**
 * Normalize a user-entered URL so we always have a valid origin to fetch.
 *
 * - Trims whitespace and strips invisible characters
 * - Auto-prepends `https://` when no protocol is provided
 * - Strips a trailing `?` / empty query for cosmetic consistency
 * - Returns null only for input that genuinely cannot be parsed
 */
export function normalizeUrl(input: string): string | null {
    if (typeof input !== "string") return null;
    const cleaned = cleanInput(input);
    if (!cleaned) return null;

    let candidate = cleaned;
    if (!/^https?:\/\//i.test(candidate)) {
        candidate = `https://${candidate}`;
    }

    let u: URL;
    try {
        u = new URL(candidate);
    } catch {
        return null;
    }

    if (!isAcceptableHost(u.hostname)) return null;
    if (u.search === "?") u.search = "";

    return u.toString();
}

/**
 * Non-throwing validator used to drive UI state (e.g. the submit button).
 * Accepts the same input as `normalizeUrl`.
 */
export function isValidUrl(input: string): boolean {
    return normalizeUrl(input) !== null;
}

/**
 * Tiny id generator. Avoids the crypto.randomUUID() dependency for older
 * environments and keeps the data JSON-portable.
 */
export function makeId(): string {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
