"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    useTransition,
} from "react";
import { Activity, Radar, RefreshCw, Sparkles, Zap } from "lucide-react";
import type { CheckResponse, MonitoredSite } from "@/lib/types";
import { makeId, readSites, writeSites } from "@/lib/storage";
import AddSiteForm from "./AddSiteForm";
import SiteCard from "./SiteCard";
import StatusIndicator from "./StatusIndicator";

const POLL_INTERVAL_MS = 60_000;

export default function Dashboard() {
    // LocalStorage is read once on mount to avoid hydration mismatches.
    // The first render is empty (matches server), then we hydrate.
    const [sites, setSites] = useState<MonitoredSite[]>([]);
    const [hydrated, setHydrated] = useState(false);
    const [countdown, setCountdown] = useState(POLL_INTERVAL_MS / 1000);
    const [, startTransition] = useTransition();

    // Refs for transient, synchronous state.
    // - `inFlight` dedupes parallel polling ticks.
    // - `sitesRef` mirrors `sites` so callbacks (e.g. `runChecks`) can read
    //   the current list synchronously. We can't do this via a
    //   `setState((prev) => { snapshot = prev })` because React may run
    //   that updater lazily (or warn) and the side-effect wouldn't be
    //   observable from outside.
    const inFlight = useRef(false);
    const sitesRef = useRef<MonitoredSite[]>([]);

    // -- Hydrate from LocalStorage on mount --
    useEffect(() => {
        const stored = readSites();
        if (stored.length) {
            setSites(
                stored.map((s) => ({
                    ...s,
                    status: s.status ?? "Checking",
                })),
            );
        }
        setHydrated(true);
    }, []);

    // -- Keep sitesRef in sync with the latest `sites` state. --
    useEffect(() => {
        sitesRef.current = sites;
    }, [sites]);

    // -- Persist whenever the list changes (after hydration) --
    useEffect(() => {
        if (!hydrated) return;
        writeSites(sites);
    }, [sites, hydrated]);

    // -- Single-site check that hits our /api/check proxy --
    const checkOne = useCallback(
        async (url: string): Promise<CheckResponse> => {
            try {
                const res = await fetch(
                    `/api/check?url=${encodeURIComponent(url)}`,
                    { cache: "no-store" },
                );
                if (!res.ok) {
                    return {
                        status: "Offline",
                        statusCode: res.status,
                        responseTime: 0,
                        lastChecked: new Date().toISOString(),
                        ssl: null,
                    };
                }
                const data = (await res.json()) as Partial<CheckResponse>;
                const statusCode =
                    typeof data.statusCode === "number" ? data.statusCode : 0;
                const responseTime =
                    typeof data.responseTime === "number"
                        ? data.responseTime
                        : 0;
                const lastChecked =
                    typeof data.lastChecked === "string"
                        ? data.lastChecked
                        : new Date().toISOString();
                const status =
                    data.status === "Online" &&
                    statusCode >= 200 &&
                    statusCode < 300
                        ? "Online"
                        : "Offline";
                return {
                    status,
                    statusCode,
                    responseTime,
                    lastChecked,
                    ssl: data.ssl ?? null,
                };
            } catch {
                return {
                    status: "Offline",
                    statusCode: 0,
                    responseTime: 0,
                    lastChecked: new Date().toISOString(),
                    ssl: null,
                };
            }
        },
        [],
    );

    // -- Polling loop --
    const runChecks = useCallback(async () => {
        if (inFlight.current) return;
        inFlight.current = true;

        // Read the current list synchronously from the ref.
        const snapshot = sitesRef.current;
        if (snapshot.length === 0) {
            inFlight.current = false;
            return;
        }

        setSites((prev) =>
            prev.map((s) => ({ ...s, status: "Checking" as const })),
        );

        const results = await Promise.all(
            snapshot.map(async (s) => ({
                id: s.id,
                url: s.url,
                r: await checkOne(s.url),
            })),
        );

        setSites((prev) =>
            prev.map((s) => {
                const found = results.find((r) => r.id === s.id);
                if (!found) return s;
                return {
                    ...s,
                    status: found.r.status,
                    statusCode: found.r.statusCode,
                    responseTime: found.r.responseTime,
                    lastCheckedAt: found.r.lastChecked,
                    ssl: found.r.ssl,
                };
            }),
        );

        inFlight.current = false;
    }, [checkOne]);

    // -- Initial run + 60s interval --
    useEffect(() => {
        if (!hydrated) return;

        const kickoff = window.setTimeout(() => {
            runChecks();
        }, 250);

        const id = window.setInterval(() => {
            runChecks();
        }, POLL_INTERVAL_MS);

        return () => {
            window.clearTimeout(kickoff);
            window.clearInterval(id);
        };
    }, [hydrated, runChecks]);

    // -- Countdown ticker (decorative, helps the user know we're alive) --
    useEffect(() => {
        const id = window.setInterval(() => {
            setCountdown((c) => (c <= 1 ? POLL_INTERVAL_MS / 1000 : c - 1));
        }, 1000);
        return () => window.clearInterval(id);
    }, []);

    const handleManualRefresh = useCallback(() => {
        setCountdown(POLL_INTERVAL_MS / 1000);
        startTransition(() => {
            void runChecks();
        });
    }, [runChecks]);

    // -- Mutations --
    const handleAdd = useCallback(
        (normalizedUrl: string) => {
            setSites((prev) => {
                const target = (() => {
                    try {
                        return new URL(normalizedUrl).hostname;
                    } catch {
                        return normalizedUrl;
                    }
                })();
                if (
                    prev.some((s) => {
                        try {
                            return new URL(s.url).hostname === target;
                        } catch {
                            return false;
                        }
                    })
                ) {
                    return prev;
                }
                const newSite: MonitoredSite = {
                    id: makeId(),
                    url: normalizedUrl,
                    status: "Checking",
                    statusCode: 0,
                    responseTime: 0,
                    lastCheckedAt: null,
                    ssl: null,
                };
                return [newSite, ...prev];
            });

            window.setTimeout(() => {
                void runChecks();
            }, 50);
        },
        [runChecks],
    );

    const handleRemove = useCallback((id: string) => {
        setSites((prev) => prev.filter((s) => s.id !== id));
    }, []);

    const stats = useMemo(() => {
        const online = sites.filter((s) => s.status === "Online").length;
        const offline = sites.filter((s) => s.status === "Offline").length;
        const checking = sites.filter((s) => s.status === "Checking").length;
        return {
            total: sites.length,
            online,
            offline,
            checking,
        };
    }, [sites]);

    return (
        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 pb-24">
            <Header
                stats={stats}
                countdown={countdown}
                onRefresh={handleManualRefresh}
            />

            <section className="mt-8">
                <AddSiteForm onAdd={handleAdd} />
            </section>

            <section className="mt-10">
                {sites.length === 0 ? (
                    <EmptyState />
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                        {sites.map((site) => (
                            <SiteCard
                                key={site.id}
                                site={site}
                                onRemove={handleRemove}
                            />
                        ))}
                    </div>
                )}
            </section>

            <Footer />
        </div>
    );
}

function Header({
    stats,
    countdown,
    onRefresh,
}: {
    stats: {
        total: number;
        online: number;
        offline: number;
        checking: number;
    };
    countdown: number;
    onRefresh: () => void;
}) {
    return (
        <header className="gsap-reveal flex flex-col gap-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                {/* <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="absolute inset-0 -m-2 rounded-full bg-neon-cyan/20 blur-2xl" />
                        <Radar className="relative w-6 h-6 text-neon-cyan" />
                    </div>
                    <div className="leading-none">
                        <p className="font-mono text-[10px] tracking-[0.32em] text-white/40">
                            UPTIME · MONITOR
                        </p>
                        <h1 className="mt-1 font-display text-[44px] sm:text-[56px] leading-[0.95] tracking-tight text-white">
                            <span className="italic text-neon-cyan/90">
                                Pulse
                            </span>{" "}
                            <span className="text-white/85">— всё онлайн?</span>
                        </h1>
                    </div>
                </div> */}

                <div className="flex items-center gap-2">
                    <button
                        onClick={onRefresh}
                        className="btn-neon inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium tracking-wide"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Check now</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatTile
                    label="Total"
                    value={stats.total}
                    icon={<Sparkles className="w-3.5 h-3.5" />}
                />
                <StatTile
                    label="Online"
                    value={stats.online}
                    icon={<StatusIndicator status="Online" size="sm" />}
                    tone="text-neon-green"
                />
                <StatTile
                    label="Offline"
                    value={stats.offline}
                    icon={<StatusIndicator status="Offline" size="sm" />}
                    tone="text-neon-red"
                />
                <StatTile
                    label="Next poll"
                    value={`${countdown}s`}
                    icon={<Zap className="w-3.5 h-3.5" />}
                    tone="text-neon-cyan"
                />
            </div>
        </header>
    );
}

function StatTile({
    label,
    value,
    icon,
    tone = "text-white",
}: {
    label: string;
    value: number | string;
    icon: React.ReactNode;
    tone?: string;
}) {
    return (
        <div className="gsap-reveal glass-card relative p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-white/45 text-[10px] tracking-[0.2em] font-medium">
                {icon}
                <span>{label.toUpperCase()}</span>
            </div>
            <div className={`font-display text-3xl leading-none ${tone}`}>
                {value}
            </div>
        </div>
    );
}

function EmptyState() {
    return (
        <div className="gsap-reveal glass-card relative flex flex-col items-center justify-center text-center px-6 py-16">
            <div className="relative mb-4">
                <span className="absolute inset-0 -m-4 rounded-full bg-neon-cyan/10 blur-2xl" />
                <Activity className="relative w-7 h-7 text-neon-cyan" />
            </div>
            <h2 className="font-display text-2xl text-white">Пока пусто</h2>
            <p className="mt-2 max-w-md text-sm text-white/55">
                Добавьте URL выше — Pulse будет опрашивать endpoint каждые 60
                секунд и подсвечивать состояние мягким зелёным неоном или
                пульсирующим красным.
            </p>
        </div>
    );
}

function Footer() {
    return (
        <footer className="mt-16 flex items-center justify-center gap-2 text-[11px] font-mono text-white/30">
            <span className="inline-block w-1 h-1 rounded-full bg-neon-cyan/70 shadow-[0_0_8px_rgba(34,233,255,0.7)]" />
            <span>
                Pulse · Next.js · LocalStorage · {new Date().getFullYear()}
            </span>
        </footer>
    );
}
