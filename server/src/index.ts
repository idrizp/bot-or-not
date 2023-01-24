import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { GameManager, setGameManager } from "./game/game-manager";
import { openai } from "./response/response-generator";
import injectSocketIO from "./socket-handler";
import cors from "cors";
import helmet from "helmet";
import { RateLimiterMemory } from "rate-limiter-flexible";

const app = express();
app.use(cors());
app.use(helmet());

const server = app.listen(process.env.PORT || 3000);
const rateLimiter = new RateLimiterMemory({
  points: 5, // 5 points
  duration: 1, // per second
});

const io = injectSocketIO(server);
io.on("connection", (socket) => {
  socket.onAny(async (event, ...args) => {
    try {
      await rateLimiter.consume(socket.handshake.address); // consume 1 point per event from IP
    } catch (rejRes) {
      socket.emit("blocked", { "retry-ms": rejRes.msBeforeNext });
    }
  });
});

setGameManager(new GameManager(openai, io));
