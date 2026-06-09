// Lightweight SSL certificate inspector. Connects via `node:tls`, peeks at
// the peer's certificate, and returns normalized metadata. No external
// dependencies — everything is built into Node.

import { connect } from "node:tls";
import type { SslInfo } from "./types";

const TLS_TIMEOUT_MS = 4000;

/**
 * Inspect the SSL certificate of a URL's host. Returns `null` for non-https
 * URLs (no TLS to inspect) and throws for any inspection failure — the
 * caller wraps the call so a bad cert never breaks the parent /api/check
 * response.
 */
export function inspectSsl(rawUrl: string): Promise<SslInfo | null> {
  return new Promise((resolve, reject) => {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      resolve(null);
      return;
    }
    if (url.protocol !== "https:") {
      resolve(null);
      return;
    }

    const host = url.hostname;
    const port = url.port ? Number(url.port) : 443;

    const socket = connect(
      { host, port, servername: host, rejectUnauthorized: false, checkServerIdentity: () => undefined },
      () => {
        const cert = socket.getPeerCertificate(false);
        socket.end();
        if (!cert || Object.keys(cert).length === 0) {
          resolve(null);
          return;
        }

        // `valid_to` is a Node-formatted date string (e.g. "Jun 15 12:00:00 2026 GMT").
        // We re-parse it to a real Date.
        const validToRaw = cert.valid_to;
        const validToDate = validToRaw ? new Date(validToRaw) : null;

        const now = Date.now();
        const daysLeft = validToDate
          ? Math.floor((validToDate.getTime() - now) / 86_400_000)
          : 0;

        const valid = !!(cert.subject && validToDate && validToDate.getTime() > now);

        // Issuer CN: subject is an object like { CN: "...", O: "..." }.
        const issuerObj = cert.issuer as Record<string, unknown> | undefined;
        const issuer =
          (issuerObj && typeof issuerObj.CN === "string" && issuerObj.CN) ||
          (issuerObj && typeof issuerObj.O === "string" && issuerObj.O) ||
          "";

        resolve({
          valid,
          daysLeft,
          validTo: validToDate ? validToDate.toISOString() : new Date(0).toISOString(),
          issuer,
        });
      },
    );

    socket.setTimeout(TLS_TIMEOUT_MS);
    socket.once("timeout", () => {
      socket.destroy(new Error("TLS inspection timed out"));
    });
    socket.once("error", (err) => {
      reject(err);
    });
  });
}
