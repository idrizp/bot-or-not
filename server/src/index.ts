import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { GameManager, setGameManager } from "./game/game-manager";
import { openai } from "./response/response-generator";
import injectSocketIO from "./socket-handler";
import cors from "cors";
import helmet from "helmet";

const app = express();
app.use(cors());
app.use(helmet());

const server = app.listen(process.env.PORT || 3000);

const io = injectSocketIO(server);
setGameManager(new GameManager(openai, io));
