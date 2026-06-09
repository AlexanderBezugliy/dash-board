"use client";

import { useState, useCallback, useMemo } from "react";
import { Plus, Globe2, Check, X } from "lucide-react";
import { isValidUrl, normalizeUrl } from "@/lib/storage";

interface AddSiteFormProps {
    onAdd: (normalizedUrl: string) => void;
    disabled?: boolean;
}

export default function AddSiteForm({ onAdd, disabled }: AddSiteFormProps) {
    const [value, setValue] = useState("");
    const [error, setError] = useState<string | null>(null);

    // Derived validity drives the button + a subtle indicator. Recomputed
    // only when the raw input changes (rule: derived state during render).
    const validity = useMemo(() => {
        if (!value)
            return { ok: false, normalized: null, reason: "empty" as const };
        const normalized = normalizeUrl(value);
        if (normalized) return { ok: true, normalized, reason: null };
        return { ok: false, normalized: null, reason: "invalid" as const };
    }, [value]);

    const submit = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            if (!validity.ok || !validity.normalized) {
                setError(
                    "Введите корректный URL, например https://example.com",
                );
                return;
            }
            onAdd(validity.normalized);
            setValue("");
            setError(null);
        },
        [validity, onAdd],
    );

    return (
        <form
            onSubmit={submit}
            // noValidate — we run our own validation, not the browser's stricter one
            noValidate
            className="gsap-reveal glass-card scanlines relative w-full"
        >
            <div className="flex flex-col sm:flex-row items-stretch gap-2 p-3 sm:p-4">
                <label className="relative flex-1 flex items-center group">
                    <span className="pointer-events-none absolute left-3 text-white/40 group-focus-within:text-neon-cyan transition-colors">
                        <Globe2 className="w-4 h-4" />
                    </span>
                    <input
                        type="text"
                        inputMode="url"
                        autoComplete="off"
                        spellCheck={false}
                        value={value}
                        onChange={(e) => {
                            setValue(e.target.value);
                            if (error) setError(null);
                        }}
                        // Trim pasted whitespace on commit so the value is canonical
                        onBlur={(e) => {
                            const trimmed = e.target.value
                                .replace(/\s+/g, "")
                                .trim();
                            if (trimmed !== e.target.value) setValue(trimmed);
                        }}
                        placeholder="https://example.com"
                        aria-label="Site URL"
                        aria-invalid={validity.reason === "invalid"}
                        disabled={disabled}
                        className="input-neon w-full pl-9 pr-10 py-3 rounded-xl text-[15px] text-white placeholder-white/30 font-mono tracking-tight"
                    />
                    {/* Live validity indicator — appears only when the user has typed something */}
                    {value.length > 0 ? (
                        <span
                            className={`pointer-events-none absolute right-3 transition-opacity ${
                                validity.ok
                                    ? "text-neon-green opacity-90"
                                    : "text-neon-red/70 opacity-60"
                            }`}
                            aria-hidden
                        >
                            {validity.ok ? (
                                <Check className="w-4 h-4" />
                            ) : (
                                <X className="w-4 h-4" />
                            )}
                        </span>
                    ) : null}
                </label>

                <button
                    type="submit"
                    // Enable only when the normalized URL is actually valid
                    disabled={disabled || !validity.ok}
                    className="btn-neon inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-medium tracking-wide"
                >
                    <Plus className="w-4 h-4" />
                    <span>Add Site</span>
                </button>
            </div>

            {error ? (
                <div className="px-4 pb-3 -mt-1 text-xs text-neon-red/90 font-mono">
                    {error}
                </div>
            ) : null}
        </form>
    );
}
