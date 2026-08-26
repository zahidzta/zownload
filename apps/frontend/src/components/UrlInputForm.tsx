"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { AnalyzeRequest, AnalyzeResult, TargetFormat } from "@zownload/shared";
import { API_URL } from "@/lib/config";

interface Props {
    onResult: (result: AnalyzeResult, url: string, format: TargetFormat) => void;
}

export function UrlInputForm({ onResult }: Props) {
    const { t } = useTranslation();
    const [url, setUrl] = useState("");
    const [format, setFormat] = useState<TargetFormat>("mp3");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!url.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const body: AnalyzeRequest = { url: url.trim(), format };
            const res = await fetch(`${API_URL}/api/analyze`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error ?? t("error_analyze"));
            }

            const result: AnalyzeResult = await res.json();
            onResult(result, url.trim(), format);
        } catch (err) {
            setError(err instanceof Error ? err.message : t("error_generic"));
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="border border-neutral-800 rounded-xl p-6 space-y-5">
            <div>
                <label className="block text-sm text-neutral-400 mb-2">{t("enter_url")}</label>
                <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-sm outline-none focus:border-neutral-600"
                />
            </div>

            <div>
                <label className="block text-sm text-neutral-400 mb-2">{t("format")}</label>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => setFormat("mp3")}
                        className={`rounded-lg py-2 text-sm font-medium border ${format === "mp3"
                                ? "border-blue-500 text-blue-400 bg-blue-500/10"
                                : "border-neutral-800 text-neutral-400"
                            }`}
                    >
                        {t("mp3_audio")}
                    </button>
                    <button
                        type="button"
                        onClick={() => setFormat("mp4")}
                        className={`rounded-lg py-2 text-sm font-medium border ${format === "mp4"
                                ? "border-blue-500 text-blue-400 bg-blue-500/10"
                                : "border-neutral-800 text-neutral-400"
                            }`}
                    >
                        {t("mp4_video")}
                    </button>
                </div>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg py-3 text-sm font-medium transition-colors"
            >
                {loading ? (
                    <>
                        <svg
                            className="animate-spin h-4 w-4 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                        </svg>
                        <span>{t("analyzing")}</span>
                    </>
                ) : (
                    t("convert")
                )}
            </button>
        </form>
    );
}