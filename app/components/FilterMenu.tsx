"use client";

import {
    memo,
    useCallback,
    useEffect,
    useId,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { createPortal } from "react-dom";
import {
    Check,
    ChevronDown,
    Clock,
    Filter,
    Lock,
    Radio,
    Sparkles,
} from "lucide-react";
import type { SiteStatus } from "@/lib/types";
import { FILTER_OPTIONS, type FilterId, type FilterOption } from "@/lib/filter";

// SSR-safe alias: useLayoutEffect warns when rendered on the server. In
// practice this component is only mounted client-side, but the alias keeps
// the warning quiet during build.
const useIsoLayoutEffect =
    typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface FilterMenuProps {
    value: FilterId;
    onChange: (next: FilterId) => void;
    counts: Record<SiteStatus, number>;
    /** Total number of sites — shown next to "All sites". */
    total: number;
}

const ICON_FOR: Record<
    FilterId,
    React.ComponentType<{ className?: string }>
> = {
    all: Filter,
    online: Radio,
    offline: Lock,
    new: Sparkles,
    last: Clock,
};

const TONE_FOR: Record<FilterId, string> = {
    all: "text-white/55",
    online: "text-neon-green",
    offline: "text-neon-red",
    new: "text-neon-cyan",
    last: "text-white/55",
};

function FilterMenuBase({ value, onChange, counts, total }: FilterMenuProps) {
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    // The dropdown is rendered into a portal so it escapes any local
    // stacking context (e.g. `relative isolate` on <main> or
    // `relative` on neighbouring cards). We compute its screen
    // coordinates from the trigger's bounding rect.
    const [pos, setPos] = useState<{
        top: number;
        right: number;
    } | null>(null);

    // Stable refs for click-outside detection and portal placement.
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const listboxId = useId();

    const activeOption: FilterOption = useMemo(
        () => FILTER_OPTIONS.find((o) => o.id === value) ?? FILTER_OPTIONS[0],
        [value],
    );
    const ActiveIcon = ICON_FOR[activeOption.id];

    const close = useCallback((focusTrigger = true) => {
        setOpen(false);
        if (focusTrigger) triggerRef.current?.focus();
    }, []);

    const select = useCallback(
        (id: FilterId) => {
            onChange(id);
            setOpen(false);
            // Return focus to the trigger for keyboard users.
            triggerRef.current?.focus();
        },
        [onChange],
    );

    // Compute dropdown screen position from the trigger's bounding rect.
    // Re-runs when the menu opens and on window scroll/resize while open
    // so the panel stays glued to the trigger.
    useIsoLayoutEffect(() => {
        if (!open) {
            setPos(null);
            return;
        }
        const update = () => {
            const rect = triggerRef.current?.getBoundingClientRect();
            if (!rect) return;
            // 8px gap between trigger and panel.
            setPos({
                top: rect.bottom + 8,
                right: window.innerWidth - rect.right,
            });
        };
        update();
        window.addEventListener("resize", update);
        window.addEventListener("scroll", update, true);
        return () => {
            window.removeEventListener("resize", update);
            window.removeEventListener("scroll", update, true);
        };
    }, [open]);

    // Click-outside: only attach the listener while the menu is open.
    // Because the panel lives in a portal, we have to check both the
    // trigger container AND the panel listbox for containment.
    useEffect(() => {
        if (!open) return;
        const onPointerDown = (e: MouseEvent) => {
            const target = e.target as Node;
            if (containerRef.current?.contains(target)) return;
            if (listRef.current?.contains(target)) return;
            setOpen(false);
        };
        document.addEventListener("mousedown", onPointerDown);
        return () => document.removeEventListener("mousedown", onPointerDown);
    }, [open]);

    // When the menu opens, sync activeIndex to the current selection and
    // scroll the corresponding option into view.
    useEffect(() => {
        if (!open) return;
        const idx = FILTER_OPTIONS.findIndex((o) => o.id === value);
        const next = idx >= 0 ? idx : 0;
        setActiveIndex(next);
        // Defer to next frame so the list is mounted.
        requestAnimationFrame(() => {
            const el = listRef.current?.querySelector<HTMLButtonElement>(
                `[data-filter-index="${next}"]`,
            );
            el?.focus({ preventScroll: true });
        });
    }, [open, value]);

    // Keyboard handling on the trigger.
    const onTriggerKey = useCallback(
        (e: React.KeyboardEvent<HTMLButtonElement>) => {
            if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setOpen(true);
            }
        },
        [],
    );

    // Keyboard handling inside the listbox.
    const onListKey = useCallback(
        (e: React.KeyboardEvent<HTMLUListElement>) => {
            if (e.key === "Escape") {
                e.preventDefault();
                close();
                return;
            }
            if (e.key === "ArrowDown") {
                e.preventDefault();
                const next = (activeIndex + 1) % FILTER_OPTIONS.length;
                setActiveIndex(next);
                listRef.current
                    ?.querySelector<HTMLButtonElement>(
                        `[data-filter-index="${next}"]`,
                    )
                    ?.focus();
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                const next =
                    (activeIndex - 1 + FILTER_OPTIONS.length) %
                    FILTER_OPTIONS.length;
                setActiveIndex(next);
                listRef.current
                    ?.querySelector<HTMLButtonElement>(
                        `[data-filter-index="${next}"]`,
                    )
                    ?.focus();
            } else if (e.key === "Home") {
                e.preventDefault();
                setActiveIndex(0);
                listRef.current
                    ?.querySelector<HTMLButtonElement>(
                        '[data-filter-index="0"]',
                    )
                    ?.focus();
            } else if (e.key === "End") {
                e.preventDefault();
                const last = FILTER_OPTIONS.length - 1;
                setActiveIndex(last);
                listRef.current
                    ?.querySelector<HTMLButtonElement>(
                        `[data-filter-index="${last}"]`,
                    )
                    ?.focus();
            }
        },
        [activeIndex, close],
    );

    // Tiny per-filter count label shown on the right of each option.
    const countFor = useCallback(
        (id: FilterId): number | null => {
            if (id === "all") return total;
            if (id === "online") return counts.Online;
            if (id === "offline") return counts.Offline;
            if (id === "new") return null; // dynamic — not tracked cheaply
            return null;
        },
        [counts, total],
    );

    return (
        <div ref={containerRef} className="relative">
            <button
                ref={triggerRef}
                type="button"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={listboxId}
                onClick={() => setOpen((o) => !o)}
                onKeyDown={onTriggerKey}
                className={`group/filter inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium tracking-wide transition-colors duration-200 ${
                    open
                        ? "border-neon-cyan/55 bg-white/[0.05] text-white shadow-[0_0_18px_rgba(34,233,255,0.25)]"
                        : "border-white/10 bg-white/[0.03] text-white/80 hover:border-white/20 hover:bg-white/[0.05]"
                } border`}
            >
                <Filter
                    className={`w-3.5 h-3.5 transition-colors ${
                        open ? "text-neon-cyan" : "text-white/45"
                    }`}
                />
                <span className="text-white/45 uppercase tracking-[0.18em] text-[10px]">
                    Filter
                </span>
                <span className="text-white/30">·</span>
                <ActiveIcon
                    className={`w-3.5 h-3.5 ${TONE_FOR[activeOption.id]}`}
                />
                <span className="text-white">{activeOption.label}</span>
                <ChevronDown
                    className={`w-3.5 h-3.5 text-white/40 transition-transform duration-200 ${
                        open ? "rotate-180 text-neon-cyan" : ""
                    }`}
                />
            </button>

            {open && pos
                ? createPortal(
                      <ul
                          ref={listRef}
                          id={listboxId}
                          role="listbox"
                          aria-label="Filter sites"
                          tabIndex={-1}
                          onKeyDown={onListKey}
                          style={{
                              position: "fixed",
                              top: pos.top,
                              right: pos.right,
                              // 2147483647 is the max safe int. Higher than
                              // any reasonable z-index in the app, and not
                              // constrained by `relative isolate` or
                              // `relative` ancestors.
                              zIndex: 2147483647,
                          }}
                          className="filter-menu-panel animate-filter-menu-in w-64 origin-top-right rounded-2xl border border-white/10 bg-ink-900/85 p-1.5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7),0_0_0_1px_rgba(34,233,255,0.08),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl"
                      >
                          {FILTER_OPTIONS.map((opt, idx) => {
                              const Icon = ICON_FOR[opt.id];
                              const isActive = opt.id === value;
                              const c = countFor(opt.id);
                              return (
                                  <li
                                      key={opt.id}
                                      role="presentation"
                                      className="list-none"
                                  >
                                      <button
                                          type="button"
                                          role="option"
                                          aria-selected={isActive}
                                          data-filter-index={idx}
                                          onClick={() => select(opt.id)}
                                          onMouseEnter={() =>
                                              setActiveIndex(idx)
                                          }
                                          className={`group/opt flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-100 ${
                                              isActive
                                                  ? "bg-white/[0.06]"
                                                  : "hover:bg-white/[0.04] focus:bg-white/[0.04]"
                                          } focus:outline-none`}
                                      >
                                          <span
                                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-white/[0.03] ${TONE_FOR[opt.id]}`}
                                          >
                                              <Icon className="w-3.5 h-3.5" />
                                          </span>
                                          <span className="flex-1 min-w-0">
                                              <span className="block text-[13px] font-medium text-white">
                                                  {opt.label}
                                              </span>
                                              <span className="block text-[10.5px] text-white/40 font-mono truncate">
                                                  {opt.hint}
                                              </span>
                                          </span>
                                          {c !== null ? (
                                              <span className="font-mono text-[10px] tabular-nums text-white/40 group-hover/opt:text-white/60">
                                                  {c}
                                              </span>
                                          ) : null}
                                          <span className="ml-1 w-3.5 flex justify-end">
                                              {isActive ? (
                                                  <Check className="w-3.5 h-3.5 text-neon-cyan" />
                                              ) : null}
                                          </span>
                                      </button>
                                  </li>
                              );
                          })}
                      </ul>,
                      document.body,
                  )
                : null}
        </div>
    );
}

export default memo(FilterMenuBase);
