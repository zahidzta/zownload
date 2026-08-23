"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { AnalyzeResult, TargetFormat } from "@zownload/shared";
import { UrlInputForm } from "@/components/UrlInputForm";
import { SingleElementView } from "@/components/SingleElementView";
import { PlaylistView } from "@/components/PlaylistView";
import { HistoryCard } from "@/components/HistoryCard";
import { API_URL } from "@/lib/config";
import { getSocket } from "@/lib/socket";
import { getHistory, addHistoryEntry, clearHistory, type HistoryEntry } from "@/lib/history";
import { FiTrash2 } from "react-icons/fi";

type ColaState =
    | { kind: "single"; percent: number; speed?: string; eta?: string }
    | { kind: "playlist"; index: number; total: number; title?: string; percent?: number; speed?: string; eta?: string }
    | null;



export default function HomePage() {
    const { t } = useTranslation();
    const [result, setResult] = useState<AnalyzeResult | null>(null);
    const [originalUrl, setOriginalUrl] = useState("");
    const [format, setFormat] = useState<TargetFormat>("mp3");
    const [cola, setCola] = useState<ColaState>(null);
    const [History, setHistory] = useState<HistoryEntry[]>([]);
    const activeFetch = useRef<AbortController | null>(null);

    useEffect(() => {
        setHistory(getHistory());
    }, []);

    useEffect(() => {
        const socket = getSocket();

        socket.on("download:progress", (data) => setCola({ kind: "single", ...data }));
        socket.on("download:complete", () => setCola(null));
        socket.on("download:error", () => setCola(null));

        socket.on("playlist:item:start", (data) =>
            setCola({ kind: "playlist", index: data.index, total: data.total, title: data.title })
        );
        socket.on("playlist:item:progress", (data) =>
            setCola((prev) => (prev?.kind === "playlist" ? { ...prev, ...data } : { kind: "playlist", ...data }))
        );
        socket.on("playlist:item:ready", (data) => {
            const link = document.createElement("a");
            link.href = `${API_URL}${data.downloadUrl}`;
            link.download = data.fileName;
            link.click();
        });
        socket.on("playlist:item:error", () => { });
        socket.on("playlist:complete", () => setCola(null));

        return () => {
            socket.off("download:progress");
            socket.off("download:complete");
            socket.off("download:error");
            socket.off("playlist:item:start");
            socket.off("playlist:item:progress");
            socket.off("playlist:item:ready");
            socket.off("playlist:item:error");
            socket.off("playlist:complete");
        };
    }, []);

    async function runAnalyzeAndSetState(url: string, targetFormat: TargetFormat): Promise<AnalyzeResult | null> {
        const res = await fetch(`${API_URL}/api/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url, format: targetFormat }),
        });
        if (!res.ok) return null;
        return res.json();
    }

    async function handleSingleDownload(formatSelector: string) {
        if (result?.type !== "single") return;
        const socket = getSocket();
        setCola({ kind: "single", percent: 0 });

        const abortController = new AbortController();
        activeFetch.current = abortController;

        try {
            const res = await fetch(`${API_URL}/api/download`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: originalUrl, formatSelector, format, socketId: socket.id }),
                signal: abortController.signal
            });

            if (!res.ok) {
                setCola(null);
                return;
            }

            const blob = await res.blob();
            const disposition = res.headers.get("Content-Disposition") ?? "";
            const match = disposition.match(/filename="?(.+?)"?$/);
            const fileName = match ? decodeURIComponent(match[1]) : "download";

            setHistory(
                addHistoryEntry({
                    title: result.title,
                    sizeMB: blob.size / (1024 * 1024),
                    format,
                    sourceUrl: originalUrl,
                    isPlaylist: false,
                })
            );

            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            link.click();
            URL.revokeObjectURL(link.href);
        } catch (err: any) {
            if (err.name === 'AbortError') {
                console.log("Download aborted from frontend");
            } else {
                console.error("Single download fetch error:", err);
            }
            setCola(null);
        } finally {
            activeFetch.current = null;
        }
    }

    async function handlePlaylistDownload(formatSelector: string) {
        if (result?.type !== "playlist") return;
        const socket = getSocket();

        setHistory(
            addHistoryEntry({
                title: result.title,
                format,
                sourceUrl: originalUrl,
                isPlaylist: true,
            })
        );

        await fetch(`${API_URL}/api/download/playlist`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                items: result.items.map((i) => ({ id: i.id, title: i.title, url: i.url })),
                formatSelector,
                format,
                socketId: socket.id,
            }),
        });
    }

    async function handleRedownload(entry: HistoryEntry) {
        // Redownload = rerun the whole flow from scratch, same as pasting the URL fresh.
        const fresh = await runAnalyzeAndSetState(entry.sourceUrl, entry.format);
        if (fresh) {
            setResult(fresh);
            setOriginalUrl(entry.sourceUrl);
            setFormat(entry.format);
        }
    }

    function handleBack() {
        setResult(null);
        setOriginalUrl("");
    }

    async function handleCancel() {
        if (activeFetch.current) {
            activeFetch.current.abort();
        }
        
        const socket = getSocket();
        await fetch(`${API_URL}/api/download/cancel`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ socketId: socket.id }),
        }).catch(console.error);

        setCola(null);
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
            <section aria-label="Dynamic view">
                {result && (
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-200 mb-4 transition-colors"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {t("volver")}
                    </button>
                )}

                {!result && (
                    <UrlInputForm
                        onResult={(r, url, f) => {
                            setResult(r);
                            setOriginalUrl(url);
                            setFormat(f);
                        }}
                    />
                )}

                {result?.type === "single" && (
                    <SingleElementView result={result} format={format} onDownload={handleSingleDownload} isDownloading={cola !== null} />
                )}

                {result?.type === "playlist" && (
                    <PlaylistView result={result} format={format} onDownload={handlePlaylistDownload} isDownloading={cola !== null} />
                )}
            </section>

            <aside aria-label="Persistent state" className="flex flex-col gap-4">
                <div className="border border-neutral-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-sm font-medium text-neutral-400">{t("cola")}</h2>
                        {cola && (
                            <button onClick={handleCancel} className="text-xs font-medium text-red-500 hover:text-red-400 transition-colors">
                                {t("cancelar")}
                            </button>
                        )}
                    </div>
                    {!cola && <p className="text-neutral-500 text-sm">{t("no_active_downloads")}</p>}

                    {cola?.kind === "single" && (
                        <div className="space-y-1">
                            <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 transition-all" style={{ width: `${cola.percent}%` }} />
                            </div>
                            <p className="text-xs text-neutral-500">
                                {cola.percent}% {cola.speed && `· ${cola.speed}`} {cola.eta && `· ${t("eta")} ${cola.eta}`}
                            </p>
                        </div>
                    )}

                    {cola?.kind === "playlist" && (
                        <div className="space-y-1">
                            <p className="text-xs text-neutral-400">
                                {t("item_progress", { index: cola.index, total: cola.total })}
                                {cola.title && ` · ${cola.title}`}
                            </p>
                            <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 transition-all" style={{ width: `${cola.percent ?? 0}%` }} />
                            </div>
                            <p className="text-xs text-neutral-500">
                                {cola.percent ?? 0}% {cola.speed && `· ${cola.speed}`} {cola.eta && `· ${t("eta")} ${cola.eta}`}
                            </p>
                        </div>
                    )}
                </div>

                <div className="border border-neutral-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-medium text-neutral-400">{t("history")}</h2>
                        <button
                            onClick={() => {
                                clearHistory();
                                setHistory([]);
                            }}
                            className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors flex items-center justify-center"
                            title={t("clear_history")}
                        >
                            <FiTrash2 size={16} />
                        </button>
                    </div>
                    <HistoryCard entries={History} onRedownload={handleRedownload} />
                </div>
            </aside>
        </div>
    );
}