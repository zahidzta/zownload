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

function buildSingleResult(data: any, format: TargetFormat): SingleMediaResult {
    const rawFormats = data.formats ?? []

    const formats: FormatOption[] =
        format === "mp3"
            ? rawFormats
                .filter((f: any) => f.format_id && f.acodec !== "none")
                .map((f: any) => {
                    const size = f.filesize ?? f.filesize_approx ?? null;
                    const abr = f.abr ? `${Math.round(f.abr)}kbps` : undefined;
                    const label = [abr, "mp3", formatBytes(size) && `~${formatBytes(size)}`]
                        .filter(Boolean)
                        .join(" · ") || f.format_id;
                    return {
                        formatId: f.format_id,
                        formatSelector: f.format_id,
                        label,
                        ext: "mp3",
                        filesizeApprox: size,
                        acodec: f.acodec,
                    };
                })
                .sort((a: any, b: any) => (b.filesizeApprox ?? 0) - (a.filesizeApprox ?? 0))
            : rawFormats
                .filter((f: any) => f.format_id && f.vcodec !== "none")
                .map((f: any) => {
                    const size = f.filesize ?? f.filesize_approx ?? null;
                    const resolution = f.height ? `${f.height}p` : f.resolution ?? undefined;
                    const label = [resolution, "mp4", formatBytes(size) && `~${formatBytes(size)}`]
                        .filter(Boolean)
                        .join(" · ") || f.format_id;
                    
                    const hasAudio = f.acodec && f.acodec !== "none";
                    const formatSelector = hasAudio ? f.format_id : `${f.format_id}+bestaudio/${f.format_id}`;

                    return {
                        formatId: f.format_id,
                        formatSelector,
                        label,
                        ext: "mp4",
                        resolution,
                        filesizeApprox: size,
                        vcodec: f.vcodec,
                    };
                })
                .reduce((acc: any[], f: any) => {
                    const existing = acc.find((x) => x.resolution === f.resolution);
                    if (!existing) {
                        acc.push(f);
                    } else if ((f.filesizeApprox ?? 0) > (existing.filesizeApprox ?? 0)) {
                        acc[acc.indexOf(existing)] = f;
                    }
                    return acc;
                }, [])
                .sort((a: FormatOption, b: FormatOption) => {
                    const resA = parseInt(a.resolution ?? "0");
                    const resB = parseInt(b.resolution ?? "0");
                    return resB - resA;
                });

    return {
        type: "single",
        id: data.id,
        title: data.title,
        artist: data.uploader ?? data.channel ?? data.artist ?? undefined,
        thumbnail: extractThumbnail(data),
        duration: data.duration,
        platform: data.extractor_key ?? data.extractor,
        requiresExtraction: format === "mp3",
        formats,
    }
}

function buildPlaylistResult(data: any, format: TargetFormat): PlaylistMediaResult {
    const entries = Array.isArray(data.entries) ? data.entries : [];

    // For playlists, check the track entries first to get actual album/video art
    // instead of YouTube's generic composite placeholder icon
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
                { label: "Max" as const, formatSelector: "bestaudio/best" },
                { label: "Min" as const, formatSelector: "worstaudio/worst" },
            ]
            : [
                { label: "Max" as const, formatSelector: "bestvideo+bestaudio/best" },
                { label: "Min" as const, formatSelector: "worstvideo+worstaudio/worst" },
            ]

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
        url,
        "--dump-single-json",
        "--no-warnings",
        "--flat-playlist",
    ];

    if (url.includes("youtube.com") || url.includes("youtu.be")) {
        args.push("--extractor-args", "youtube:player_client=android");
    } else {
        args.push("--impersonate", "chrome-110");
    }

    const raw = await ytDlpWrap.execPromise(args);

    const data = JSON.parse(raw);

    if (Array.isArray(data.entries)) {
        return buildPlaylistResult(data, format);
    }

    return buildSingleResult(data, format);
}