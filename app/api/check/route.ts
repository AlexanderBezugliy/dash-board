import { NextResponse } from "next/server";
import type { CheckResponse } from "@/lib/types";
import { inspectSsl } from "@/lib/ssl";

// Force Node.js runtime so the global AbortController / fetch with timeout
// behaves predictably across hosts.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIMEOUT_MS = 5000;

// Realistic Chrome UA + Accept headers — many sites / WAFs (Cloudflare,
// Akamai, custom) block or challenge requests with a `node` / empty UA.
// We impersonate a current stable Chrome on macOS.
const BROWSER_HEADERS = {
    "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "accept-language": "en-US,en;q=0.9,ru;q=0.8",
    "accept-encoding": "gzip, deflate, br",
    "cache-control": "no-cache",
    pragma: "no-cache",
    "sec-ch-ua":
        '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "none",
    "sec-fetch-user": "?1",
    "upgrade-insecure-requests": "1",
} as const;

/**
 * GET /api/check?url=https%3A%2F%2Fexample.com
 *
 * Acts as a CORS-friendly proxy that performs the actual HTTP request
 * from the server. Returns a normalized status payload.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const raw = searchParams.get("url");

    if (!raw) {
        return NextResponse.json(
            { error: "Missing `url` query parameter" },
            { status: 400 },
        );
    }

    let target: URL;
    try {
        target = new URL(raw);
    } catch {
        return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // SSRF guard: only http(s)
    if (target.protocol !== "http:" && target.protocol !== "https:") {
        return NextResponse.json(
            { error: "Only http(s) URLs are allowed" },
            { status: 400 },
        );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const started = performance.now();
    try {
        // Do not throw on non-2xx — we want to capture the status code itself.
        const res = await fetch(target.toString(), {
            method: "GET",
            redirect: "follow",
            signal: controller.signal,
            headers: { ...BROWSER_HEADERS },
            // Node 18+ supports this; ignored in edge runtimes.
            ...({ keepalive: true } as Record<string, unknown>),
        });
        const responseTime = Math.round(performance.now() - started);

        // Inspect the SSL certificate of the *final* host (post-redirect).
        // We only attempt TLS inspection for https; http returns ssl: null.
        const ssl = await inspectSsl(res.url || target.toString()).catch(
            () => null,
        );

        const payload: CheckResponse = {
            status: res.ok ? "Online" : "Offline",
            statusCode: res.status,
            responseTime,
            lastChecked: new Date().toISOString(),
            ssl,
        };

        return NextResponse.json(payload, {
            status: 200,
            headers: corsHeaders(),
        });
    } catch {
        const responseTime = Math.round(performance.now() - started);
        // No response received — no status code, no SSL info.
        const payload: CheckResponse = {
            status: "Offline",
            statusCode: 0,
            responseTime,
            lastChecked: new Date().toISOString(),
            ssl: null,
        };
        return NextResponse.json(payload, {
            status: 200,
            headers: corsHeaders(),
        });
    } finally {
        clearTimeout(timer);
    }
}

function corsHeaders() {
    return {
        "cache-control": "no-store",
        "access-control-allow-origin": "*",
    };
}
