"use client";

import { memo, useCallback } from "react";
import {
    Activity,
    ArrowUpRight,
    Clock,
    Hash,
    Lock,
    ShieldAlert,
    ShieldCheck,
    Trash2,
} from "lucide-react";
import type { MonitoredSite, SslInfo } from "@/lib/types";
import StatusIndicator from "./StatusIndicator";

interface SiteCardProps {
    site: MonitoredSite;
    onRemove: (id: string) => void;
}

function hostnameOf(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./, "");
    } catch {
        return url;
    }
}

function formatTime(iso: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

function sslTone(ssl: SslInfo | null): {
    iconColor: string;
    badge: "ok" | "warn" | "danger" | "unknown";
} {
    if (!ssl) return { iconColor: "text-white/25", badge: "unknown" };
    if (!ssl.valid || ssl.daysLeft < 0) {
        return { iconColor: "text-neon-red", badge: "danger" };
    }
    if (ssl.daysLeft < 7)
        return { iconColor: "text-neon-red", badge: "danger" };
    if (ssl.daysLeft < 30)
        return { iconColor: "text-amber-400", badge: "warn" };
    return { iconColor: "text-white/40", badge: "ok" };
}

function SslBadge({ ssl }: { ssl: SslInfo | null }) {
    const { iconColor, badge } = sslTone(ssl);
    const Icon = badge === "danger" ? ShieldAlert : Lock;

    // Tooltip text — shows the full cert picture
    const tip = (() => {
        if (!ssl) return "No SSL — site uses HTTP";
        if (!ssl.valid)
            return `SSL Invalid — expired ${Math.abs(ssl.daysLeft)}d ago`;
        return `SSL Valid: ${ssl.daysLeft} days left`;
    })();

    const tipSub = (() => {
        if (!ssl) return null;
        const d = new Date(ssl.validTo);
        if (Number.isNaN(d.getTime())) return null;
        return d.toLocaleDateString();
    })();

    return (
        <div className="group/ssl relative inline-flex">
            <span
                className={`inline-flex items-center justify-center ${iconColor} transition-colors hover:text-white/80`}
                aria-label={tip}
            >
                <Icon className="w-3.5 h-3.5" />
            </span>

            {/* Glass tooltip — pure CSS, no library */}
            <div
                role="tooltip"
                className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-ink-900/85 px-3 py-2 text-[11px] font-mono text-white/85 opacity-0 shadow-[0_8px_24px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition-all duration-200 group-hover/ssl:translate-y-0 group-hover/ssl:opacity-100 translate-y-[-2px]"
            >
                <div className="flex items-center gap-2">
                    {badge === "ok" ? (
                        <ShieldCheck className="w-3 h-3 text-neon-green" />
                    ) : badge === "warn" ? (
                        <ShieldAlert className="w-3 h-3 text-amber-400" />
                    ) : badge === "danger" ? (
                        <ShieldAlert className="w-3 h-3 text-neon-red" />
                    ) : (
                        <Lock className="w-3 h-3 text-white/40" />
                    )}
                    <span>{tip}</span>
                </div>
                {tipSub ? (
                    <div className="mt-0.5 text-white/45">expires {tipSub}</div>
                ) : null}
                {ssl?.issuer ? (
                    <div className="mt-0.5 text-white/35">
                        issued by {ssl.issuer}
                    </div>
                ) : null}
                {/* Tooltip arrow */}
                <span
                    aria-hidden
                    className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-l border-t border-white/10 bg-ink-900/85"
                />
            </div>
        </div>
    );
}

function SiteCardBase({ site, onRemove }: SiteCardProps) {
    const host = hostnameOf(site.url);

    const handleRemove = useCallback(
        () => onRemove(site.id),
        [onRemove, site.id],
    );
    const handleOpen = useCallback(() => {
        window.open(site.url, "_blank", "noopener,noreferrer");
    }, [site.url]);

    // Subtle border glow that matches the status
    const ringClass =
        site.status === "Online"
            ? "ring-1 ring-emerald-300/10"
            : site.status === "Offline"
              ? "ring-1 ring-rose-400/20"
              : "ring-1 ring-white/5";

    return (
        <article
            data-site-id={site.id}
            data-status={site.status}
            className={`gsap-reveal glass-card group relative flex flex-col gap-4 p-5 ${ringClass} transition-transform duration-300 hover:-translate-y-0.5`}
        >
            {/* Header row */}
            <header className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0 inline-flex items-center justify-center h-3.5 w-3.5">
                        <StatusIndicator status={site.status} size="lg" />
                        {site.status === "Online" ? (
                            <span
                                aria-hidden
                                className="pointer-events-none absolute inset-0 rounded-full animate-pulse-soft-green"
                            />
                        ) : null}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="truncate font-display text-[20px] leading-none tracking-tight text-white">
                                {site.label || host}
                            </h3>
                            <SslBadge ssl={site.ssl} />
                            <button
                                onClick={handleOpen}
                                aria-label={`Open ${site.url} in a new tab`}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-white/40 hover:text-neon-cyan"
                            >
                                <ArrowUpRight className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="mt-1 truncate font-mono text-[12px] text-white/45">
                            {site.url}
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleRemove}
                    aria-label="Remove site"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-white/30 hover:text-neon-red p-1 -m-1 rounded-md"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </header>

            {/* Divider */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-3">
                <Metric
                    icon={<Activity className="w-3.5 h-3.5" />}
                    label="STATUS"
                    value={site.status.toUpperCase()}
                    tone={
                        site.status === "Online"
                            ? "text-neon-green"
                            : site.status === "Offline"
                              ? "text-neon-red"
                              : "text-white/60"
                    }
                />
                <Metric
                    icon={<Hash className="w-3.5 h-3.5" />}
                    label="CODE"
                    value={
                        site.statusCode === 0 ? "—" : String(site.statusCode)
                    }
                    tone="text-white/80"
                />
                <Metric
                    icon={<Clock className="w-3.5 h-3.5" />}
                    label="RTT"
                    value={site.responseTime ? `${site.responseTime}ms` : "—"}
                    tone="text-white/80"
                />
            </div>

            {/* Footer: last check (subtle, bottom-right) */}
            <footer className="flex items-center justify-end gap-1.5 text-[10px] font-mono text-white/40 tracking-wide">
                <span className="uppercase">Last check</span>
                <span className="text-white/55">
                    {formatTime(site.lastCheckedAt)}
                </span>
            </footer>
        </article>
    );
}

interface MetricProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    tone?: string;
}

function Metric({ icon, label, value, tone = "text-white/80" }: MetricProps) {
    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-white/40">
                {icon}
                <span className="text-[10px] tracking-[0.18em] font-medium">
                    {label}
                </span>
            </div>
            <span className={`font-mono text-[15px] leading-none ${tone}`}>
                {value}
            </span>
        </div>
    );
}

export default memo(SiteCardBase);
