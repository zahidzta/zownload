import express from "express"
import cors from "cors"
import { createServer } from "node:http"
import { analyzeRouter } from "./routes/analyze.js"
import { downloadRouter } from "./routes/download.js"
import { initSocket } from "./socket.js"

const app = express()
app.use(
    cors({
        origin: "*",
        exposedHeaders: ["Content-Disposition"],
    })
)
app.use(express.json())

app.get("/health", (_req, res) => {
    res.json({ status: "ok" })
})

app.use("/api", analyzeRouter)
app.use("/api", downloadRouter)

const httpServer = createServer(app)
const io = initSocket(httpServer)


io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`)
    socket.on("disconnect", () => console.log(`Client disconnected: ${socket.id}`))
})


const PORT = process.env.PORT ?? 4000
httpServer.listen(PORT, () => {
    console.log(`running on port ${PORT}`)
})