import express, { Application, Request, Response } from "express"
import cors from "cors"
import { createServer } from "http"
import { Server, Socket } from "socket.io"

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

const PORT = process.env.PORT || 4000

httpServer.listen(PORT, () => {
    console.log(`server running in http://localhost:${PORT}`)
})