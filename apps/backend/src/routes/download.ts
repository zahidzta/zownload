import { Router } from "express"
import { createReadStream } from "node:fs"
import { runDownload } from "../services/downloadService.js"
import { getIO } from "../socket.js"
import { randomUUID } from "node:crypto"
import { processPlaylist, takeFile } from "../services/playlsitService.js"
import path from "node:path"

export const downloadRouter = Router()

const activeDownloads = new Map<string, AbortController>()

function registerDownload(socketId: string, controller: AbortController) {
    activeDownloads.set(socketId, controller)
}

function unregisterDownload(socketId: string) {
    activeDownloads.delete(socketId)
}

function cancelDownload(socketId: string) {
    const controller = activeDownloads.get(socketId)
    if (controller) {
        controller.abort()
        activeDownloads.delete(socketId)
    }
}

downloadRouter.post("/download/cancel", (req, res) => {
    const { socketId } = req.body ?? {}
    if (socketId) cancelDownload(socketId)
    res.status(200).json({ success: true })
})
downloadRouter.post("/download", async (req, res) => {
    const { url, formatSelector, format, socketId } = req.body ?? {}

    if (
        !url ||
        typeof url !== "string" ||
        (!url.startsWith("http://") && !url.startsWith("https://")) ||
        !formatSelector ||
        (format !== "mp3" && format !== "mp4")
    ) {
        return res.status(400).json({ error: "A valid 'url' (http/https), 'formatSelector', and 'format' are required." })
    }

    const io = getIO()
    const emitProgress = (event: string, payload: unknown) => {
        if (socketId) io.to(socketId).emit(event, payload)
    }

    const abortController = new AbortController()
    if (socketId) registerDownload(socketId, abortController)

    try {
        const { filePath, fileName, cleanup } = await runDownload(
            url,
            formatSelector,
            format,
            (update) => emitProgress("download:progress", update),
            abortController.signal
        )

        emitProgress("download:complete", { fileName })


        const mimeTypes: Record<string, string> = {
            mp3: "audio/mpeg",
            mp4: "video/mp4",
        }
        const ext = path.extname(fileName).slice(1).toLowerCase()
        res.setHeader("Content-Type", mimeTypes[ext] ?? "application/octet-stream")
        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`)

        const stream = createReadStream(filePath)
        stream.pipe(res)
        stream.on("close", () => {
            if (socketId) unregisterDownload(socketId)
            cleanup().catch((err) => console.log("Cleanup failed:", err))
        })
        stream.on("error", (err) => {
            if (socketId) unregisterDownload(socketId)
            console.error("Stream error:", err)
            cleanup().catch(() => { })
        })
    } catch (err) {
        if (socketId) unregisterDownload(socketId)
        
        if (abortController.signal.aborted) {
            console.log("Download aborted by user")
            return
        }

        console.log("Download error: ", err)
        emitProgress("download:error", { message: "Download failed." })
        if (!res.headersSent) {
            res.status(500).json({ error: "Download failed" })
        }
    }
})

downloadRouter.post("/download/playlist", (req, res) => {
    const { items, formatSelector, format, socketId } = req.body ?? {}
    if (!Array.isArray(items) || items.length === 0 || !formatSelector || (format !== "mp3" && format !== "mp4")) {
        return res.status(400).json({ error: "items[], formatSelector, and format are required." })
    }

    for (const item of items) {
        if (!item?.url || typeof item.url !== "string" || (!item.url.startsWith("http://") && !item.url.startsWith("https://"))) {
            return res.status(400).json({ error: "Each playlist item must have a valid http/https url." })
        }
    }

    const io = getIO()
    const jobId = randomUUID()
    const emit = (event: string, payload: unknown) => {
        if (socketId) io.to(socketId).emit(event, payload)
    }

    const abortController = new AbortController()
    if (socketId) registerDownload(socketId, abortController)

    processPlaylist(jobId, items, formatSelector, format, emit, abortController.signal)
        .catch((err) => {
            if (abortController.signal.aborted) {
                console.log("Playlist processing aborted by user")
                return
            }
            console.error("Playlist processing crashed:", err)
            emit("playlist:error", { message: "Playlist processing failed unexpectedly." })
        })
        .finally(() => {
            if (socketId) unregisterDownload(socketId)
        })

    res.status(202).json({ jobId, message: "Playlist processing started." })
})

downloadRouter.get("/download/file/:jobId/:itemId", (req, res) => {
    const { jobId, itemId } = req.params
    const file = takeFile(jobId, itemId)

    if (!file) {
        return res.status(404).json({ error: "File not found or already downloaded." })
    }

    const mimeTypes: Record<string, string> = {
        mp3: "audio/mpeg",
        mp4: "video/mp4",
    }
    const ext = path.extname(file.fileName).slice(1).toLowerCase()
    res.setHeader("Content-Type", mimeTypes[ext] ?? "application/octet-stream")
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(file.fileName)}"`)

    const stream = createReadStream(file.filePath)
    stream.pipe(res)

    stream.on("close", () => file.cleanup().catch((err) => console.error("Cleanup failed:", err)))
    stream.on("error", (err) => {
        console.error("Stream error:", err)
        file.cleanup().catch(() => { })
    })
})