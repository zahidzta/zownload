"use client";

import { useState } from "react";
import type { PlaylistMediaResult, TargetFormat } from "@zownload/shared";

interface Props {
    result: PlaylistMediaResult;
    format: TargetFormat;
    onDownload: (formatSelector: string) => void;
}

export function PlaylistView({ result, format, onDownload }: Props) {
    const [selectedLabel, setSelectedLabel] = useState<"Max" | "Min">("Max");

    const selected = result.qualityOptions.find((q) => q.label === selectedLabel);

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
                        <span>{result.itemCount} elementos</span>
                    </div>
                </div>

                <div>
                    <label className="block text-sm text-neutral-400 mb-2">Calidad</label>
                    <div className="grid grid-cols-2 gap-2">
                        {result.qualityOptions.map((q) => (
                            <button
                                key={q.label}
                                type="button"
                                onClick={() => setSelectedLabel(q.label)}
                                className={`rounded-lg py-2 text-sm font-medium border ${selectedLabel === q.label
                                        ? "border-blue-500 text-blue-400 bg-blue-500/10"
                                        : "border-neutral-800 text-neutral-400"
                                    }`}
                            >
                                {q.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1 border-t border-neutral-800 pt-3">
                    {result.items.map((item, i) => (
                        <div key={item.id} className="flex items-center gap-2 text-sm text-neutral-400">
                            <span className="text-neutral-600 w-5 shrink-0">{i + 1}.</span>
                            <span className="truncate">{item.title}</span>
                        </div>
                    ))}
                </div>

                <button
                    onClick={() => selected && onDownload(selected.formatSelector)}
                    disabled={!selected}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg py-3 text-sm font-medium transition-colors"
                >
                    Descargar {format.toUpperCase()} · {result.itemCount} elementos
                </button>
            </div>
        </div>
    );
}