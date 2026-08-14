import { Router } from "express"
import { createReadStream } from "node:fs"
import { runDownload } from "../services/downloadService.js"
import { getIO } from "../socket.js"
import { randomUUID } from "node:crypto"
import { processPlaylist, takeFile } from "../services/playlsitService.js"
import path from "node:path"

export const downloadRouter = Router()

downloadRouter.post("/download", async (req, res) => {
    const { url, formatSelector, format, socketId } = req.body ?? {}

    if (!url || !formatSelector || (format !== "mp3" && format !== "mp4")) {
        return res.status(400).json({ error: "url, formatSelector, and format are required." })
    }

    const io = getIO()
    const emitProgress = (event: string, payload: unknown) => {
        if (socketId) io.to(socketId).emit(event, payload)
    }

    try {
        const { filePath, fileName, cleanup } = await runDownload(
            url,
            formatSelector,
            format,
            (update) => emitProgress("download:progress", update)
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
            cleanup().catch((err) => console.log("Cleanup failed:", err))
        })
        stream.on("error", (err) => {
            console.error("Stream error:", err)
            cleanup().catch(() => { })
        })
    } catch (err) {
        console.log("Download error: ", err)
        emitProgress("download:error", { message: "Download failed." })
        res.status(500).json({ error: "Download failed" })
    }
})

downloadRouter.post("/download/playlist", (req, res) => {
    const { items, formatSelector, format, socketId } = req.body ?? {}
    if (!Array.isArray(items) || items.length === 0 || !formatSelector || (format !== "mp3" && format !== "mp4")) {
        return res.status(400).json({ error: "items[], formatSelector, and format are required." })
    }

    const io = getIO()
    const jobId = randomUUID()
    const emit = (event: string, payload: unknown) => {
        if (socketId) io.to(socketId).emit(event, payload)
    }

    processPlaylist(jobId, items, formatSelector, format, emit).catch((err) => {
        console.error("Playlist processing crashed:", err)
        emit("playlist:error", { message: "Playlist processing failed unexpectedly." })
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