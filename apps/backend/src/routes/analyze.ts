import { Router } from "express"
import { analyzeUrl } from "../services/ytdlpService.js"

export const analyzeRouter = Router()

analyzeRouter.post("/analyze", async (req, res) => {
    const { url, format } = req.body ?? {}
    if (!url || typeof url !== "string") {
        return res.status(400).json({ error: "A valid 'url' string is required." })
    }

    if (format !== "mp3" && format !== "mp4") {
        return res.status(400).json({ error: "'format' must be 'mp3' or 'mp4'." })
    }

    try {
        const result = await analyzeUrl(url, format)
        res.json(result)
    } catch (err) {
        console.error("yt-dlp analyze error:", err)
        res.status(422).json({
            error: "Could not extract metadata for this URL. It may be unsupported or invalid."
        })
    }
})