export type TargetFormat = "mp3" | "mp4"

export type AnalyzeRequest = {
    url: string
    format: TargetFormat
}

export type FormatOption = {
    formatId: string
    formatSelector: string
    label: string
    ext: string
    resolution?: string
    filesizeApprox?: number | null
    vcodec?: string
    acodec?: string
}

export type SingleMediaResult = {
    type: "single"
    id: string
    title: string
    artist?: string
    thumbnail?: string
    duration?: number
    platform: string
    requiresExtraction: boolean
    formats: FormatOption[]
}

export type PlaylistItem = {
    id: string
    title: string
    duration?: number
    thumbnail?: string
    url: string
}

export type PlaylistMediaResult = {
    type: "playlist"
    id: string
    title: string
    artist?: string
    thumbnail?: string
    itemCount: number
    items: PlaylistItem[]
    qualityOptions: { label: "Max" | "Min"; formatSelector: string }[]
}

export type AnalyzeResult = SingleMediaResult | PlaylistMediaResult