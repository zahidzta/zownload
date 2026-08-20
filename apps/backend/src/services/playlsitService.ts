import { runDownload, type ProgressUpdate } from "./downloadService.js"

type JobFile = {
    filePath: string
    fileName: string
    cleanup: () => Promise<void>
}

const pendingFiles = new Map<string, JobFile>()

export function registerFile(jobId: string, itemId: string, file: JobFile) {
    pendingFiles.set(`${jobId}:${itemId}`, file)
}

export function takeFile(jobId: string, itemId: string): JobFile | undefined {
    const key = `${jobId}:${itemId}`
    const file = pendingFiles.get(key)
    pendingFiles.delete(key)
    return file
}

export type PlaylistItemInput = {
    id: string
    title: string
    url: string
}

export async function processPlaylist(
    jobId: string,
    items: PlaylistItemInput[],
    formatSelector: string,
    format: "mp3" | "mp4",
    emit: (event: string, payload: unknown) => void,
    signal?: AbortSignal
) {
    const total = items.length

    for (let i = 0; i < total; i++) {
        if (signal?.aborted) {
            console.log(`Playlist processing aborted at item ${i + 1}`)
            break
        }

        const item = items[i]

        emit("playlist:item:start", { index: i + 1, total, title: item.title })

        try {
            const { filePath, fileName, cleanup } = await runDownload(
                item.url,
                formatSelector,
                format,
                (update: ProgressUpdate) => emit("playlist:item:progress", { index: i + 1, total, ...update }),
                signal
            )

            registerFile(jobId, item.id, { filePath, fileName, cleanup })

            emit("playlist:item:ready", {
                index: i + 1,
                total,
                itemId: item.id,
                fileName,
                downloadUrl: `/api/download/file/${jobId}/${item.id}`
            })
        } catch (err) {
            if (signal?.aborted) {
                console.log(`Playlist download aborted during item ${item.id}`)
                break
            }
            
            console.error(`Playlist item ${item.id} failed:`, err)
            emit("playlist:item:error", {
                index: i + 1,
                total,
                title: item.title,
                message: "This item failed to download and was skipped.",
            })
        }
    }

    if (!signal?.aborted) {
        emit("playlist:complete", { total })
    }
}