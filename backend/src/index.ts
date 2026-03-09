import express, { Application, Request, Response } from "express"
import cors from "cors"
import { createServer } from "http"
import { Server, Socket } from "socket.io"

import { getInfo } from "./services/GetInfo"

const app : Application = express()
app.use(cors())

const httpServer = createServer(app)

const io = new Server(httpServer, {
    cors: { origin: "*" }
})

io.on("connection", (socket : Socket) => {
    console.log("connected user: ", socket.id)

    socket.on("disconnect", () => {
        console.log("disconnected")
    })
})

app.get("/", (req : Request, res : Response) => {
    res.send("connected server")
})

app.get("/get_info", async (req : Request, res: Response) => {
    const url = req.query.url as string

    if (!url) {
        return res.status(400).json({
            error: "missing url parameter"
        })
    }

    try {
        const info = await getInfo(url)

        res.json({
            success: true,
            count: info.length,
            data: info
        })
    } catch (err : any) {
        res.status(500).json({
            success: false,
            error: err.message
        })
    }
})

const PORT = process.env.PORT || 4000

httpServer.listen(PORT, () => {
    console.log(`server running in http://localhost:${PORT}`)
})