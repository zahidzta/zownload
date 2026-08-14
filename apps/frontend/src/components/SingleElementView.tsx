"use client";

import { useState } from "react";
import type { SingleMediaResult, TargetFormat } from "@zownload/shared";

interface Props {
    result: SingleMediaResult;
    format: TargetFormat;
    onDownload: (formatSelector: string) => void;
}

function formatDuration(seconds?: number): string {
    if (!seconds) return "—";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
}

export function SingleElementView({ result, format, onDownload }: Props) {
    const [selectedFormatId, setSelectedFormatId] = useState(
        result.formats[0]?.formatId ?? ""
    );

    const selected = result.formats.find((f) => f.formatId === selectedFormatId);

    return (
        <div className="border border-neutral-800 rounded-xl overflow-hidden">
            {result.thumbnail && (
                <img
                    src={result.thumbnail}
                    alt={result.title}
                    className="w-full aspect-video object-cover"
                />
            )}

            <div className="p-6 space-y-4">
                <div>
                    <p className="font-medium text-lg leading-snug">{result.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-sm text-neutral-400">
                        {result.artist && <span>{result.artist}</span>}
                        <span>·</span>
                        <span>{formatDuration(result.duration)}</span>
                        <span>·</span>
                        <span>{result.platform}</span>
                    </div>
                </div>

                <div>
                    <label className="block text-sm text-neutral-400 mb-2">Calidad</label>
                    <select
                        value={selectedFormatId}
                        onChange={(e) => setSelectedFormatId(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm outline-none"
                    >
                        {result.formats.map((f) => (
                            <option key={f.formatId} value={f.formatId}>
                                {f.label}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={() => selected && onDownload(selected.formatSelector)}
                    disabled={!selected}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg py-3 text-sm font-medium transition-colors"
                >
                    Descargar {format.toUpperCase()}
                </button>
            </div>
        </div>
    );
}