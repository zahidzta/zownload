"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { SingleMediaResult, TargetFormat } from "@zownload/shared";
import { FiClock, FiFile, FiDownload } from "react-icons/fi";

interface Props {
    result: SingleMediaResult;
    format: TargetFormat;
    onDownload: (formatSelector: string) => void;
    isDownloading?: boolean;
}

function formatDuration(seconds?: number): string {
    if (!seconds) return "—";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function SingleElementView({ result, format, onDownload, isDownloading }: Props) {
    const { t } = useTranslation();
    const [selectedFormatId, setSelectedFormatId] = useState(
        result.formats[0]?.formatId ?? ""
    );

    const selected = result.formats.find((f) => f.formatId === selectedFormatId);

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden w-full max-w-3xl">
            {/* Top Section */}
            <div className="flex flex-row items-center gap-5 p-5">
                {result.thumbnail && (
                    <img
                        src={result.thumbnail}
                        alt={result.title}
                        className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                    />
                )}
                
                <div className="flex flex-col flex-grow min-w-0">
                    <h2 className="text-2xl font-bold text-neutral-100 truncate">
                        {result.title}
                    </h2>
                    {result.artist && (
                        <p className="text-neutral-400 mt-1 truncate">
                            {result.artist}
                        </p>
                    )}
                    
                    <div className="flex items-center gap-3 mt-3">
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-neutral-800 rounded-full text-xs text-neutral-300 font-medium">
                            <FiClock className="w-3.5 h-3.5 text-neutral-400" />
                            <span>{formatDuration(result.duration)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-neutral-800 rounded-full text-xs text-neutral-300 font-medium">
                            <FiFile className="w-3.5 h-3.5 text-neutral-400" />
                            <span>{result.platform || "Media"}</span>
                        </div>
                    </div>
                </div>
            </div>

            <hr className="border-neutral-800" />

            {/* Bottom Section */}
            <div className="p-5 flex flex-row items-end justify-between">
                <div className="flex flex-col w-64">
                    <label className="text-xs text-neutral-400 font-medium mb-1.5">{t("quality")}</label>
                    <select
                        value={selectedFormatId}
                        onChange={(e) => setSelectedFormatId(e.target.value)}
                        disabled={isDownloading}
                        className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-300 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all disabled:opacity-50"
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
                    disabled={!selected || isDownloading}
                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg px-6 py-2.5 text-sm font-medium transition-colors"
                >
                    <FiDownload className="w-4 h-4" />
                    <span>{isDownloading ? t("downloading") : t("download")}</span>
                </button>
            </div>
        </div>
    );
}