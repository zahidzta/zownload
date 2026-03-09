import { spawn } from 'child_process'
import readline from 'readline'

export type VideoInfo = {
    id: string
    title: string
    url?: string
    duration?: number
    uploader?: string
}

const MAX_RESULTS = 500

export const getInfo = (url : string) : Promise<VideoInfo[]> => {
    return new Promise((resolve, reject) => {
        if (!url || !url.startsWith("http")) {
            return reject(new Error("Invalid URL"))
        }

        const yt = spawn("yt-dlp", [
            "--dump-json",
            "--flat-playlist",
            "--skip-download",
            "--no-warnings",
            "--ignore-errors",
            url
        ])

        const rl = readline.createInterface({
            input: yt.stdout
        })

        const videos : VideoInfo[] = []
        let stderr = ""

        rl.on('line', (line) => {
            if (videos.length > MAX_RESULTS) {
                yt.kill()
                return
            }

            try {
                const json : VideoInfo = JSON.parse(line)
                const video : VideoInfo = {
                    id: json.id,
                    title: json.title,
                    url: json.url,
                    duration: json.duration,
                    uploader: json.uploader
                }

                videos.push(video)
            } catch {

            }
        })

        yt.stderr.on('data', (data) => {
            stderr += data.toString()
        })

        yt.on('error', (err) => {
            reject(err)
        })

        yt.on('close', (code) => {
            if (code == 0 || videos.length > 0) {
                resolve(videos)
            } else {
                reject(new Error(`yt-dlp error: ${stderr}`))
            }
        })

    })
}