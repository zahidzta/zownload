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
}

const PROGRESS_REGEX = /\[download\]\s+(\d{1,3}\.\d)%\s+of\s+[\d.]+\w+\s+at\s+([\d.]+\w+\/s|\bUnknown\b)\s+ETA\s+([\d:]+|\bUnknown\b)/

function parseProgressLine(line: string): ProgressUpdate | null {
    const match = PROGRESS_REGEX.exec(line)
    if (!match) return null
    return {
        percent: parseFloat(match[1]),
        speed: match[2],
        eta: match[3]
    }
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

    const outputTemplate = path.join(jobDir, "%(title)s.%(ext)s")

    const args = [
        url,
        "-f", formatSelector,
        "-o", outputTemplate,
        "--no-warnings",
        "--newline",
        "--extractor-args", "youtube:player_client=default,ios"
    ]

    if (target === "mp3") {
        args.push("--extract-audio", "--audio-format", "mp3")
    } else {
        args.push("--merge-output-format", "mp4")
    }

    await new Promise<void>((resolve, reject) => {
        const proc = spawn(YTDLP_BIN, args)
        let buffer = ""
        let errorLines: string[] = []

        const handleChunk = (chunk: Buffer, isStderr: boolean) => {
            const text = chunk.toString()
            buffer += text
            const lines = buffer.split("\n")
            buffer = lines.pop() ?? ""
            for (const line of lines) {
                const update = parseProgressLine(line)
                if (update && onProgress) onProgress(update)
                else if (isStderr || line.toLowerCase().includes("error")) {
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
                else resolve()
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

    const fileName = files[0]
    const filePath = path.join(jobDir, fileName)
    const { size } = await stat(filePath)

    return {
        filePath,
        fileName,
        fileSizeBytes: size,
        cleanup: () => rm(jobDir, { recursive: true, force: true })
    }
}