import { Socket } from "socket.io";
import { Game } from "./game";

export interface User {
  socket: Socket;
  id: string;
  game: Game | null;
}
