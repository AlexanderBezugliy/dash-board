// Shared types for the Uptime Monitor dashboard

export type SiteStatus = "Online" | "Offline" | "Checking";

export interface SslInfo {
  /** True when the cert chain is valid AND not yet expired. */
  valid: boolean;
  /** Days until `valid_to`. Negative if already expired. `null` if unknown. */
  daysLeft: number;
  /** ISO timestamp when the certificate expires. */
  validTo: string;
  /** Issuer Common Name (best-effort, may be empty for opaque certs). */
  issuer: string;
}

export interface CheckResponse {
  status: "Online" | "Offline";
  statusCode: number;
  responseTime: number;
  /** ISO timestamp of when this check ran. */
  lastChecked: string;
  /** SSL cert info for the final host, or `null` for http / failures. */
  ssl: SslInfo | null;
}

export interface MonitoredSite {
  /** Stable client-generated id (uuid-ish) */
  id: string;
  /** Normalized URL (always starts with http:// or https://) */
  url: string;
  /** Optional human-friendly label, defaults to hostname */
  label?: string;
  /** Last known status */
  status: SiteStatus;
  /** HTTP status code from the last check, 0 if unreachable */
  statusCode: number;
  /** Last measured response time in ms, 0 if not measured */
  responseTime: number;
  /** ISO timestamp of the last check */
  lastCheckedAt: string | null;
  /** Last known SSL info, may be `null` */
  ssl: SslInfo | null;
}
