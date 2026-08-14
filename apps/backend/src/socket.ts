import { Server } from "socket.io"
import type { Server as HttpServer } from "node:http"

let io: Server | null = null

export function initSocket(httpServer: HttpServer): Server {
    io = new Server(httpServer, {
        cors: { origin: "*" }
    })
    return io
}

export function getIO(): Server {
    if (!io) throw new Error("Socket.io not initialized yet.")
    return io
}