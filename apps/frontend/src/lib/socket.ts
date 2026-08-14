"use client";

import { io, type Socket } from "socket.io-client";
import { API_URL } from "./config";

let socket: Socket | null = null;

export function getSocket(): Socket {
    if (!socket) {
        socket = io(API_URL);
    }
    return socket;
}