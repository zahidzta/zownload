"use client";

import { useState } from "react";
import type { AnalyzeRequest, AnalyzeResult, TargetFormat } from "@zownload/shared";
import { API_URL } from "@/lib/config";

interface Props {
    onResult: (result: AnalyzeResult, url: string, format: TargetFormat) => void;
}

export function UrlInputForm({ onResult }: Props) {
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
                throw new Error(data.error ?? "Could not analyze this URL.");
            }

            const result: AnalyzeResult = await res.json();
            onResult(result, url.trim(), format);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="border border-neutral-800 rounded-xl p-6 space-y-5">
            <div>
                <label className="block text-sm text-neutral-400 mb-2">Ingresa la URL</label>
                <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-sm outline-none focus:border-neutral-600"
                />
            </div>

            <div>
                <label className="block text-sm text-neutral-400 mb-2">Formato</label>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => setFormat("mp3")}
                        className={`rounded-lg py-2 text-sm font-medium border ${format === "mp3"
                                ? "border-blue-500 text-blue-400 bg-blue-500/10"
                                : "border-neutral-800 text-neutral-400"
                            }`}
                    >
                        MP3 (Audio)
                    </button>
                    <button
                        type="button"
                        onClick={() => setFormat("mp4")}
                        className={`rounded-lg py-2 text-sm font-medium border ${format === "mp4"
                                ? "border-blue-500 text-blue-400 bg-blue-500/10"
                                : "border-neutral-800 text-neutral-400"
                            }`}
                    >
                        MP4 (Video)
                    </button>
                </div>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg py-3 text-sm font-medium transition-colors"
            >
                {loading ? "Analizando..." : "Convertir"}
            </button>
        </form>
    );
}