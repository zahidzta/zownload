import { spawn } from "node:child_process"
import { mkdir, rm, stat } from "node:fs/promises"
import path from "node:path"
import { randomUUID } from "node:crypto"


const DOWNLOADS_DIR = process.env.DOWNLOADS_DIR ?? "/app/downloads"
const YTDLP_BIN = process.env.YTDLP_PATH ?? "yt-dlp"

export type DownloadResult = {
    filePath: string
    fileName: string
    fileSizeBytes: number
    cleanup: () => Promise<void>
}

export type ProgressUpdate = {
    percent: number
    speed?: string
    eta?: string
    status?: string
    stage?: "preparing" | "downloading" | "merging" | "converting" | "processing" | "finalizing" | "complete"
}

export async function runDownload(
    url: string,
    formatSelector: string,
    target: "mp3" | "mp4",
    onProgress?: (update: ProgressUpdate) => void,
    signal?: AbortSignal
): Promise<DownloadResult> {
    const jobId = randomUUID()
    const jobDir = path.join(DOWNLOADS_DIR, jobId)
    await mkdir(jobDir, { recursive: true })

    const outputTemplate = path.join(jobDir, "%(title).80s.%(ext)s")

    let cleanFormatSelector = formatSelector;
    let audioQuality = "0";

    if (formatSelector.includes("@")) {
        const parts = formatSelector.split("@");
        cleanFormatSelector = parts[0];
        audioQuality = parts[1];
    }

    const args = [
        "-f", cleanFormatSelector,
        "-o", outputTemplate,
        "--trim-filenames", "80",
        "--windows-filenames",
        "--no-warnings",
        "--newline",
        "--embed-thumbnail",
        "--embed-metadata",
        "--convert-thumbnails", "jpg",
        "--progress-template", "download:[PROGRESS] %(progress._percent_str)s | %(progress._speed_str)s | %(progress._eta_str)s",
        "--progress-template", "postprocess:[POSTPROCESS] %(progress.postprocessor)s | %(progress.status)s",
    ];

    if (!url.includes("youtube.com") && !url.includes("youtu.be")) {
        args.push("--impersonate", "chrome-110");
    }

    if (target === "mp3") {
        args.push("--extract-audio", "--audio-format", "mp3", "--audio-quality", audioQuality);
    } else {
        args.push("--merge-output-format", "mp4");
    }

    args.push("--", url);

    await new Promise<void>((resolve, reject) => {
        const proc = spawn(YTDLP_BIN, args)
        let buffer = ""
        let errorLines: string[] = []

        // Initial feedback immediately
        onProgress?.({
            percent: 5,
            stage: "preparing",
            status: "status_preparing",
        })

        let currentStream = 0;
        let lastPercent = 5;

        const processLine = (line: string) => {
            const trimmed = line.trim()
            if (!trimmed) return
            // Thumbnail preparation before media download
            if (trimmed.includes("[ThumbnailsConvertor]") || trimmed.startsWith("[ThumbnailsConvertor] Converting")) {
                lastPercent = Math.max(lastPercent, 8)
                onProgress?.({
                    percent: lastPercent,
                    stage: "preparing",
                    status: "status_preparing",
                })
                return
            }

            // Stream destination
            if (trimmed.startsWith("[download] Destination:")) {
                currentStream++
                const isAudioStream = trimmed.includes(".m4a") || trimmed.includes(".webm") || trimmed.includes(".opus") || target === "mp3"
                const statusKey = isAudioStream ? "status_downloading_audio" : "status_downloading_video"
                const minPercent = currentStream >= 2 ? 65 : 10
                lastPercent = Math.max(lastPercent, minPercent)
                onProgress?.({
                    percent: lastPercent,
                    stage: "downloading",
                    status: statusKey,
                })
                return
            }

            // Custom progress template: [PROGRESS] 45.2% | 2.5MiB/s | 00:03
            const tmplMatch = /\[PROGRESS\]\s+(\d{1,3}(?:\.\d+)?)%\s*\|\s*([^|]+?)\s*\|\s*([^|\r\n]+)/.exec(trimmed)
            if (tmplMatch) {
                const rawPercent = parseFloat(tmplMatch[1])
                const speed = tmplMatch[2].trim() === "NA" ? undefined : tmplMatch[2].trim()
                const eta = tmplMatch[3].trim() === "NA" ? undefined : tmplMatch[3].trim()

                let scaledPercent: number
                let statusKey: string

                if (target === "mp3") {
                    scaledPercent = 10 + (rawPercent * 0.65)
                    statusKey = "status_downloading_audio"
                } else {
                    if (currentStream <= 1) {
                        scaledPercent = 10 + (rawPercent * 0.55)
                        statusKey = "status_downloading_video"
                    } else {
                        scaledPercent = 65 + (rawPercent * 0.15)
                        statusKey = "status_downloading_audio"
                    }
                }

                lastPercent = Math.max(lastPercent, Math.min(80, Math.round(scaledPercent)))
                onProgress?.({
                    percent: lastPercent,
                    speed,
                    eta,
                    stage: "downloading",
                    status: statusKey,
                })
                return
            }

            // Standard fallback download regex
            const stdMatch = /\[download\]\s+(\d{1,3}(?:\.\d+)?)%\s+of\s+[\d.]+\w+(?:\s+at\s+([^\s]+))?(?:\s+ETA\s+([^\s]+))?/.exec(trimmed)
            if (stdMatch) {
                const rawPercent = parseFloat(stdMatch[1])
                const speed = stdMatch[2]
                const eta = stdMatch[3]

                let scaledPercent: number
                let statusKey: string

                if (target === "mp3") {
                    scaledPercent = 10 + (rawPercent * 0.65)
                    statusKey = "status_downloading_audio"
                } else {
                    if (currentStream <= 1) {
                        scaledPercent = 10 + (rawPercent * 0.55)
                        statusKey = "status_downloading_video"
                    } else {
                        scaledPercent = 65 + (rawPercent * 0.15)
                        statusKey = "status_downloading_audio"
                    }
                }

                lastPercent = Math.max(lastPercent, Math.min(80, Math.round(scaledPercent)))
                onProgress?.({
                    percent: lastPercent,
                    speed,
                    eta,
                    stage: "downloading",
                    status: statusKey,
                })
                return
            }

            // Post-processing stages (after stream download)
            if (trimmed.includes("[POSTPROCESS] Merger") || trimmed.startsWith("[Merger] Merging")) {
                lastPercent = Math.max(lastPercent, 82)
                onProgress?.({
                    percent: lastPercent,
                    stage: "merging",
                    status: "status_merging",
                })
                return
            }

            if (trimmed.includes("[POSTPROCESS] ExtractAudio") || trimmed.startsWith("[ExtractAudio] Destination:")) {
                lastPercent = Math.max(lastPercent, 82)
                onProgress?.({
                    percent: lastPercent,
                    stage: "converting",
                    status: "status_converting",
                })
                return
            }

            if (trimmed.includes("[POSTPROCESS] Metadata") || trimmed.startsWith("[Metadata] Adding metadata")) {
                lastPercent = Math.max(lastPercent, 92)
                onProgress?.({
                    percent: lastPercent,
                    stage: "processing",
                    status: "status_processing",
                })
                return
            }

            if (
                trimmed.includes("[POSTPROCESS] EmbedThumbnail") ||
                trimmed.includes("Adding thumbnail to")
            ) {
                lastPercent = Math.max(lastPercent, 95)
                onProgress?.({
                    percent: lastPercent,
                    stage: "processing",
                    status: "status_processing",
                })
                return
            }

            if (trimmed.includes("[POSTPROCESS] MoveFiles")) {
                lastPercent = Math.max(lastPercent, 98)
                onProgress?.({
                    percent: lastPercent,
                    stage: "finalizing",
                    status: "status_finalizing",
                })
                return
            }
        }

        const handleChunk = (chunk: Buffer, isStderr: boolean) => {
            const text = chunk.toString()
            buffer += text
            const lines = buffer.split("\n")
            buffer = lines.pop() ?? ""
            for (const line of lines) {
                processLine(line)
                if (isStderr || line.toLowerCase().includes("error")) {
                    errorLines.push(line)
                }
            }
        }

        const onAbort = () => {
            proc.kill("SIGTERM")
            reject(new Error("Download aborted"))
        }

        if (signal) {
            if (signal.aborted) {
                return onAbort()
            }
            signal.addEventListener("abort", onAbort)
        }

        proc.stdout.on("data", (chunk) => handleChunk(chunk, false))
        proc.stderr.on("data", (chunk) => handleChunk(chunk, true))

        proc.on("error", reject)
        proc.on("close", (code) => {
            if (signal) signal.removeEventListener("abort", onAbort)
            
            if (code === 0 || (code === null && signal?.aborted)) {
                if (signal?.aborted) reject(new Error("Download aborted"))
                else {
                    onProgress?.({
                        percent: 100,
                        stage: "complete",
                        status: "status_complete",
                    })
                    resolve()
                }
            } else {
                const detail = errorLines.slice(-5).join(" | ") || "no error output captured"
                reject(new Error(`yt-dlp exited with code ${code}: ${detail}`))
            }
        })
    })

    const fs = await import("node:fs/promises")
    const files = await fs.readdir(jobDir)
    if (files.length === 0) {
        throw new Error("yt-dlp completed but no output file was found.")
    }

    // Filter out thumbnails and temporary files, preferring the requested target format
    const mediaFiles = files.filter(
        (f) => !f.endsWith(".jpg") && !f.endsWith(".webp") && !f.endsWith(".part") && !f.endsWith(".temp")
    )
    const fileName = mediaFiles.find((f) => f.endsWith(`.${target}`)) ?? mediaFiles[0] ?? files[0]
    const filePath = path.join(jobDir, fileName)
    const { size } = await stat(filePath)

    return {
        filePath,
        fileName,
        fileSizeBytes: size,
        cleanup: () => rm(jobDir, { recursive: true, force: true })
    }
}