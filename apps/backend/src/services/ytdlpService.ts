import YTDlpWrapImport from "yt-dlp-wrap";
import type {
    AnalyzeResult,
    FormatOption,
    PlaylistMediaResult,
    SingleMediaResult,
    TargetFormat,
} from "@zownload/shared";

const YTDlpWrap: typeof YTDlpWrapImport = (YTDlpWrapImport as any).default ?? YTDlpWrapImport
const ytDlpBinary = process.env.YTDLP_PATH ?? "yt-dlp";
const ytDlpWrap = new YTDlpWrap(ytDlpBinary);

function formatBytes(bytes?: number | null): string | null {
    if (!bytes) return null;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)}MB`;
}

function cleanThumbnailUrl(url?: string): string | undefined {
    if (!url || typeof url !== "string") return undefined;
    const trimmed = url.trim();
    if (!trimmed) return undefined;

    // Direct YouTube image URL (e.g. i.ytimg.com/vi/ID/... or i.ytimg.com/vi_webp/ID/...)
    const ytMatch = trimmed.match(/https?:\/\/(?:i\.ytimg\.com|img\.youtube\.com)\/(?:vi|vi_webp)\/([a-zA-Z0-9_-]{11})/);
    if (ytMatch && ytMatch[1]) {
        return `https://i.ytimg.com/vi/${ytMatch[1]}/hqdefault.jpg`;
    }

    if (trimmed.includes("i.ytimg.com") && trimmed.includes("?")) {
        return trimmed.split("?")[0];
    }

    return trimmed;
}

function extractThumbnail(obj: any): string | undefined {
    if (!obj) return undefined;

    // Check string thumbnail
    if (typeof obj.thumbnail === "string" && obj.thumbnail.trim()) {
        const cleaned = cleanThumbnailUrl(obj.thumbnail);
        if (cleaned && !cleaned.includes("no_thumbnail")) return cleaned;
    }

    // Check object thumbnail.url
    if (obj.thumbnail && typeof obj.thumbnail === "object" && typeof obj.thumbnail.url === "string") {
        const cleaned = cleanThumbnailUrl(obj.thumbnail.url);
        if (cleaned && !cleaned.includes("no_thumbnail")) return cleaned;
    }

    // Check thumbnails array (prefer highest resolution at end)
    if (Array.isArray(obj.thumbnails) && obj.thumbnails.length > 0) {
        for (let i = obj.thumbnails.length - 1; i >= 0; i--) {
            const t = obj.thumbnails[i];
            const rawUrl = typeof t === "string" ? t : t?.url;
            if (rawUrl && typeof rawUrl === "string") {
                const cleaned = cleanThumbnailUrl(rawUrl);
                if (cleaned && !cleaned.includes("no_thumbnail")) return cleaned;
            }
        }
    }

    // Direct YouTube ID or URL fallback
    const videoId =
        typeof obj.id === "string" && /^[a-zA-Z0-9_-]{11}$/.test(obj.id)
            ? obj.id
            : typeof obj.url === "string"
                ? obj.url.match(/(?:v=|youtu\.be\/|\/v\/|\/embed\/)([a-zA-Z0-9_-]{11})/)?.[1]
                : undefined;

    if (videoId) {
        return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    }

    return undefined;
}

function estimateFilesize(f: any, duration?: number): number | null {
    if (typeof f.filesize === "number" && f.filesize > 0) return f.filesize;
    if (typeof f.filesize_approx === "number" && f.filesize_approx > 0) return f.filesize_approx;
    const bitrate = f.tbr ?? (f.vbr ? f.vbr + (f.abr || 128) : (f.abr ?? null));
    if (bitrate && typeof duration === "number" && duration > 0) {
        return Math.round((bitrate * 1000 / 8) * duration);
    }
    return null;
}

function buildSingleResult(data: any, format: TargetFormat): SingleMediaResult {
    const rawFormats = data.formats ?? [];
    const duration = data.duration ?? 0;

    if (format === "mp3") {
        const qualities = [
            { id: "mp3-320", quality: "320k", label: "320kbps (Best Quality)", abr: 320 },
            { id: "mp3-256", quality: "256k", label: "256kbps (High Quality)", abr: 256 },
            { id: "mp3-192", quality: "192k", label: "192kbps (Medium Quality)", abr: 192 },
            { id: "mp3-128", quality: "128k", label: "128kbps (Standard)", abr: 128 },
        ];

        const formats: FormatOption[] = qualities.map((q) => {
            const approxBytes = duration > 0 ? Math.round((q.abr * 1000 / 8) * duration) : null;
            const sizeStr = formatBytes(approxBytes);
            const label = sizeStr ? `${q.label} · mp3 · ~${sizeStr}` : `${q.label} · mp3`;
            return {
                formatId: q.id,
                formatSelector: `bestaudio/best@${q.quality}`,
                label,
                ext: "mp3",
                filesizeApprox: approxBytes,
                acodec: "mp3",
            };
        });

        return {
            type: "single",
            id: data.id,
            title: data.title,
            artist: data.uploader ?? data.channel ?? data.artist ?? undefined,
            thumbnail: extractThumbnail(data),
            duration: data.duration,
            platform: data.extractor_key ?? data.extractor,
            requiresExtraction: true,
            formats,
        };
    }

    // Video streams
    const videoStreams = rawFormats.filter(
        (f: any) => f.format_id && f.vcodec && f.vcodec !== "none"
    );

    const mappedVideos = videoStreams.map((f: any) => {
        const height = f.height ?? parseInt(f.resolution?.match(/(\d+)x(\d+)/)?.[2] ?? "0") ?? 0;
        const size = estimateFilesize(f, duration);
        const hasAudio = f.acodec && f.acodec !== "none";
        const formatSelector = hasAudio ? f.format_id : `${f.format_id}+bestaudio/best`;
        const isAvc = f.vcodec?.startsWith("avc") || f.vcodec?.startsWith("h264");

        const isHls = f.protocol?.includes("m3u8") || f.format_id?.includes("m3u8");

        let resolutionLabel = height ? `${height}p` : f.resolution ?? f.format_id;
        if (height >= 2160) resolutionLabel = "4K (2160p)";
        else if (height >= 1440) resolutionLabel = "1440p (2K)";
        else if (height >= 1080) resolutionLabel = "1080p (Full HD)";
        else if (height >= 720) resolutionLabel = "720p (HD)";

        const sizeStr = formatBytes(size);
        const label = [resolutionLabel, "mp4", sizeStr && `~${sizeStr}`]
            .filter(Boolean)
            .join(" · ");

        return {
            height,
            formatId: f.format_id,
            formatSelector,
            label,
            ext: "mp4",
            resolution: `${height}p`,
            filesizeApprox: size,
            vcodec: f.vcodec,
            isAvc,
            isHls,
            tbr: f.tbr ?? f.vbr ?? 0,
        };
    });

    const grouped = new Map<number, typeof mappedVideos[0]>();
    for (const v of mappedVideos) {
        if (!v.height || v.height <= 0) continue;
        const existing = grouped.get(v.height);
        if (!existing) {
            grouped.set(v.height, v);
        } else {
            if (existing.isHls && !v.isHls) {
                grouped.set(v.height, v);
            } else if (!existing.isHls && v.isHls) {
                // Keep direct HTTPS stream
            } else if (v.height <= 1080) {
                if (!existing.isAvc && v.isAvc) {
                    grouped.set(v.height, v);
                } else if (
                    existing.isAvc === v.isAvc &&
                    (v.tbr > existing.tbr || (v.filesizeApprox ?? 0) > (existing.filesizeApprox ?? 0))
                ) {
                    grouped.set(v.height, v);
                }
            } else {
                if (v.tbr > existing.tbr || (v.filesizeApprox ?? 0) > (existing.filesizeApprox ?? 0)) {
                    grouped.set(v.height, v);
                }
            }
        }
    }

    const formats: FormatOption[] = Array.from(grouped.values())
        .sort((a, b) => b.height - a.height)
        .map((v) => ({
            formatId: v.formatId,
            formatSelector: v.formatSelector,
            label: v.label,
            ext: "mp4",
            resolution: v.resolution,
            filesizeApprox: v.filesizeApprox,
            vcodec: v.vcodec,
        }));

    if (formats.length === 0) {
        formats.push({
            formatId: "best",
            formatSelector: "bestvideo+bestaudio/best",
            label: "Best Quality · mp4",
            ext: "mp4",
        });
    }

    return {
        type: "single",
        id: data.id,
        title: data.title,
        artist: data.uploader ?? data.channel ?? data.artist ?? undefined,
        thumbnail: extractThumbnail(data),
        duration: data.duration,
        platform: data.extractor_key ?? data.extractor,
        requiresExtraction: false,
        formats,
    };
}

function buildPlaylistResult(data: any, format: TargetFormat): PlaylistMediaResult {
    const entries = Array.isArray(data.entries) ? data.entries : [];

    let playlistThumbnail: string | undefined = undefined;

    for (const entry of entries) {
        const thumb = extractThumbnail(entry);
        if (thumb) {
            playlistThumbnail = thumb;
            break;
        }
    }

    if (!playlistThumbnail) {
        playlistThumbnail = extractThumbnail(data);
    }

    const items = entries.map((e: any) => ({
        id: e.id,
        title: e.title,
        duration: e.duration,
        thumbnail: extractThumbnail(e) ?? playlistThumbnail,
        url: e.url ?? (e.id ? `https://www.youtube.com/watch?v=${e.id}` : e.webpage_url)
    }));

    const qualityOptions =
        format === "mp3"
            ? [
                { label: "Max" as const, formatSelector: "bestaudio/best@320k" },
                { label: "Min" as const, formatSelector: "worstaudio/worst@128k" },
            ]
            : [
                { label: "Max" as const, formatSelector: "bestvideo+bestaudio/best" },
                { label: "Min" as const, formatSelector: "worstvideo+worstaudio/worst" },
            ];

    return {
        type: "playlist",
        id: data.id,
        title: data.title,
        artist: data.uploader ?? data.channel ?? data.artist ?? undefined,
        thumbnail: playlistThumbnail,
        itemCount: items.length,
        items,
        qualityOptions
    };
}

export async function analyzeUrl(url: string, format: TargetFormat): Promise<AnalyzeResult> {
    const args = [
        "--dump-single-json",
        "--no-warnings",
        "--flat-playlist",
    ];

    if (!url.includes("youtube.com") && !url.includes("youtu.be")) {
        args.push("--impersonate", "chrome-110");
    }

    args.push("--", url);

    const raw = await ytDlpWrap.execPromise(args);

    const data = JSON.parse(raw);

    if (Array.isArray(data.entries)) {
        return buildPlaylistResult(data, format);
    }

    return buildSingleResult(data, format);
}