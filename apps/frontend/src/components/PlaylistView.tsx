"use client";

import { useState } from "react";
import type { PlaylistMediaResult, TargetFormat } from "@zownload/shared";
import { FiDownload } from "react-icons/fi";

interface Props {
    result: PlaylistMediaResult;
    format: TargetFormat;
    onDownload: (formatSelector: string) => void;
}

export function PlaylistView({ result, format, onDownload }: Props) {
    const [selectedLabel, setSelectedLabel] = useState<"Max" | "Min">("Max");

    const selected = result.qualityOptions.find((q) => q.label === selectedLabel);

    return (
        <div className="w-full max-w-5xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row gap-8 bg-neutral-900/40 p-4 sm:p-6 border border-neutral-800 rounded-[2rem] shadow-2xl">
                
                {/* Left Section: Cover Card */}
                <div className="w-full md:w-[320px] lg:w-[360px] shrink-0 bg-neutral-900 border border-neutral-800 rounded-3xl p-6 flex flex-col">
                    <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-xl border border-neutral-800/50 bg-neutral-950">
                        {result.thumbnail ? (
                            <img
                                src={result.thumbnail}
                                alt={result.title}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-700">
                                No Image
                            </div>
                        )}
                    </div>
                    
                    <div className="mt-6 text-center space-y-1.5 pb-2">
                        <p className="font-bold text-neutral-100 text-xl line-clamp-1">{result.title}</p>
                        <p className="text-neutral-400 text-sm line-clamp-1">{result.artist || "Playlist"}</p>
                        <p className="text-neutral-500 text-xs mt-2 uppercase tracking-wide font-medium">Playlist • {result.itemCount} items</p>
                    </div>
                </div>

                {/* Right Section: Info & Controls */}
                <div className="flex-grow flex flex-col justify-center py-2 md:py-6 md:pr-6">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-neutral-100 tracking-tight line-clamp-2">
                        {result.title}
                    </h1>
                    <p className="text-xl text-neutral-400 mt-2 sm:mt-4">
                        {result.artist || "Various Artists"}
                    </p>

                    <div className="flex flex-row gap-3 sm:gap-4 mt-8 sm:mt-10">
                        <div className="flex-1 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-5">
                            <p className="text-[10px] sm:text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">
                                CANT. ELEMENTOS
                            </p>
                            <p className="text-lg sm:text-xl font-semibold text-neutral-200">
                                {result.itemCount} Tracks
                            </p>
                        </div>
                        <div className="flex-1 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-5">
                            <p className="text-[10px] sm:text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">
                                FORMATO
                            </p>
                            <p className="text-lg sm:text-xl font-semibold text-neutral-200">
                                {format.toUpperCase()}
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 sm:mt-8">
                        <label className="block text-sm font-semibold text-neutral-400 mb-2.5">
                            Quality
                        </label>
                        <div className="relative">
                            <select
                                value={selectedLabel}
                                onChange={(e) => setSelectedLabel(e.target.value as "Max" | "Min")}
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-4 pr-10 py-3.5 sm:py-4 text-sm sm:text-base text-neutral-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                            >
                                {result.qualityOptions.map((q) => (
                                    <option key={q.label} value={q.label}>
                                        {q.label}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-neutral-500">
                                <svg width="14" height="8" viewBox="0 0 14 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 1.5L7 6.5L13 1.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => selected && onDownload(selected.formatSelector)}
                        disabled={!selected}
                        className="w-full mt-6 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl py-4 text-sm sm:text-base font-semibold transition-colors shadow-lg shadow-blue-900/20"
                    >
                        <FiDownload className="w-5 h-5" />
                        <span>Descargar</span>
                    </button>
                </div>
            </div>

            {/* Tracks List */}
            <div className="bg-neutral-900/30 border border-neutral-800 rounded-2xl p-6 shadow-sm">
                <h3 className="text-neutral-400 font-semibold mb-4 text-sm uppercase tracking-wider">
                    Tracks en la lista
                </h3>
                <div className="max-h-72 overflow-y-auto space-y-1.5 pr-2">
                    {result.items.map((item, i) => (
                        <div 
                            key={item.id} 
                            className="flex items-center gap-4 py-2.5 px-3 hover:bg-neutral-800/60 rounded-xl group transition-all"
                        >
                            <span className="text-neutral-500 text-sm font-mono w-6 text-right shrink-0">
                                {i + 1}
                            </span>
                            <span className="text-neutral-300 text-sm sm:text-base truncate group-hover:text-neutral-100 transition-colors">
                                {item.title}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}