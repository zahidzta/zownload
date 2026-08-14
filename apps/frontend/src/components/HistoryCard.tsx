"use client";

import type { HistoryEntry } from "@/lib/history";

interface Props {
    entries: HistoryEntry[];
    onRedownload: (entry: HistoryEntry) => void;
}

export function HistoryCard({ entries, onRedownload }: Props) {
    if (entries.length === 0) {
        return <p className="text-neutral-500 text-sm">No history yet</p>;
    }

    return (
        <div className="space-y-2 max-h-64 overflow-y-auto">
            {entries.map((entry) => (
                <div
                    key={entry.id}
                    className="flex items-center justify-between gap-2 text-sm border border-neutral-800 rounded-lg px-3 py-2"
                >
                    <div className="min-w-0">
                        <p className="truncate text-neutral-200">{entry.title}</p>
                        <p className="text-xs text-neutral-500">
                            {entry.isPlaylist ? "Playlist" : entry.sizeMB ? `${entry.sizeMB.toFixed(1)} MB` : entry.format.toUpperCase()}
                        </p>
                    </div>
                    <button
                        onClick={() => onRedownload(entry)}
                        className="shrink-0 text-xs text-blue-400 hover:text-blue-300 whitespace-nowrap"
                    >
                        Redescargar
                    </button>
                </div>
            ))}
        </div>
    );
}