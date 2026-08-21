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

function buildSingleResult(data: any, format: TargetFormat): SingleMediaResult {
    const rawFormats = data.formats ?? []

    const formats: FormatOption[] =
        format === "mp3"
            ? rawFormats
                .filter((f: any) => f.format_id && f.acodec !== "none" && (f.vcodec === "none" || !f.vcodec))
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
        artist: data.uploader ?? data.channel ?? undefined,
        thumbnail: data.thumbnail,
        duration: data.duration,
        platform: data.extractor_key ?? data.extractor,
        requiresExtraction: format === "mp3",
        formats,
    }
}

function buildPlaylistResult(data: any, format: TargetFormat): PlaylistMediaResult {
    const playlistThumbnail = data.thumbnails?.[data.thumbnails.length - 1]?.url ?? data.thumbnail
    const items = (data.entries ?? []).map((e: any) => ({
        id: e.id,
        title: e.title,
        duration: e.duration,
        thumbnail: format === "mp3" ? playlistThumbnail : (e.thumbnail ?? e.thumbnails?.[0]?.url ?? playlistThumbnail),
        url: e.url ?? e.webpage_url
    }));

    const qualityOptions =
        format === "mp3"
            ? [
                { label: "Max" as const, formatSelector: "bestaudio" },
                { label: "Min" as const, formatSelector: "worstaudio" },
            ]
            : [
                { label: "Max" as const, formatSelector: "bestvideo+bestaudio" },
                { label: "Min" as const, formatSelector: "worstvideo+worstaudio" },
            ]

    return {
        type: "playlist",
        id: data.id,
        title: data.title,
        artist: data.uploader ?? data.channel ?? undefined,
        thumbnail: playlistThumbnail,
        itemCount: items.length,
        items,
        qualityOptions
    };
}

export async function analyzeUrl(url: string, format: TargetFormat): Promise<AnalyzeResult> {
    const raw = await ytDlpWrap.execPromise([
        url,
        "--dump-single-json",
        "--no-warnings",
        "--flat-playlist",
        "--impersonate", "chrome-110"
    ]);

    const data = JSON.parse(raw);

    if (Array.isArray(data.entries)) {
        return buildPlaylistResult(data, format);
    }

    return buildSingleResult(data, format);
}