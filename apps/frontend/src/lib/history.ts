export interface HistoryEntry {
    id: string;
    title: string;
    sizeMB?: number;
    format: "mp3" | "mp4";
    sourceUrl: string;
    isPlaylist: boolean;
    downloadedAt: number;
}

const STORAGE_KEY = "zownload:history";
const MAX_ENTRIES = 50;

export function getHistory(): HistoryEntry[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function addHistoryEntry(entry: Omit<HistoryEntry, "id" | "downloadedAt">) {
    const current = getHistory();
    const newEntry: HistoryEntry = {
        ...entry,
        id: crypto.randomUUID(),
        downloadedAt: Date.now(),
    };
    const updated = [newEntry, ...current].slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
}

export function clearHistory() {
    if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_KEY);
    }
}