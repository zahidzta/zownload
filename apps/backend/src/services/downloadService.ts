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
    onProgress?: (update: ProgressUpdate) => void
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
        "--newline"
    ]

    if (target === "mp3") {
        args.push("--extract-audio", "--audio-format", "mp3")
    } else {
        args.push("--merge-output-format", "mp4")
    }

    await new Promise<void>((resolve, reject) => {
        const proc = spawn(YTDLP_BIN, args)

        let buffer = ""
        const handleChunk = (chunk: Buffer) => {
            buffer += chunk.toString()
            const lines = buffer.split("\n")
            buffer = lines.pop() ?? ""

            for (const line of lines) {
                const update = parseProgressLine(line)
                if (update && onProgress) onProgress(update)
            }
        }

        proc.stdout.on("data", handleChunk)
        proc.stderr.on("data", handleChunk)

        proc.on("error", reject)
        proc.on("close", (code) => {
            if (code === 0) resolve()
            else reject(new Error(`yt-dlp exited with code ${code}`))
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