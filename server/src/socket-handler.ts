import { Server } from "socket.io";
import type http from "http";
import { GameManager, setGameManager } from "./game/game-manager";
import { openai } from "./response/response-generator";

export default function injectSocketIO(server: http.Server) {
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });
  return io;
}
