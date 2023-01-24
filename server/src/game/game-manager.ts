import type { OpenAIApi } from "openai";
import type { Server, Socket } from "socket.io";
import { z } from "zod";
import { Game, GameState, generateResponse, Player, Vote } from "./game";
import { generateInRange, pickEither } from "../util/random";
import { User } from "./user";
import { startQueueProcessor } from "./queue-processor";
import { openai } from "../response/response-generator";

const sendMessageSchema = z.object({
  message: z.string().max(100),
  game: z.string().uuid(),
});

const castVoteSchema = z.object({
  human: z.boolean(),
  game: z.string().uuid(),
});

export class GameManager {
  public games: Game[] = [];

  public users: Map<string, User> = new Map();
  public queue: User[] = [];

  constructor(public openAI: OpenAIApi, public server: Server) {
    this.games = [];

    // Initiates the queue processor
    startQueueProcessor(this).then(() => {
      console.log("Queue processor started");
    });

    server.on("connection", (socket: Socket) => {
      this.users.set(socket.id, {
        id: socket.id,
        game: null,
        socket: socket,
      });

      // When the socket disconnects
      socket.on("disconnect", () => {
        this.queue = this.queue.filter((user) => user.id !== socket.id);
        const user = this.users.get(socket.id);
        if (!user) {
          console.warn("Socket disconnected but user was not found");
          return;
        }
        if (user.game) {
          if (user.game.player.id === user.id) {
            // Bot-Human because only the bot will see it. If this is our OpenAI bot, it doesn't matter.
            user.game.forcedWinner = "bot-human";
          } else {
            user.game.forcedWinner = "human";
          }
          this.endGame(user.game);
        }
        this.users.delete(socket.id);
      });

      // On queue
      socket.on("queue", () => {
        this.queue.push(this.getUser(socket.id)!);
      });

      // On un-queue
      socket.on("unqueue", () => {
        this.queue = this.queue.filter((user) => user.id !== socket.id);
      });

      // On game message
      socket.on(
        "game-message",
        async (data: z.infer<typeof sendMessageSchema>) => {
          const { success } = sendMessageSchema.safeParse(data);
          if (!success) {
            socket.emit("error", "Invalid data");
            return;
          }
          const user = this.getUser(socket.id)!;
          if (!user.game) {
            socket.emit("error", "You are not in a game");
            return;
          }
          const game = user.game;
          if (game.currentPlayer.id !== user.id) {
            socket.emit("error", "It is not your turn");
            return;
          }

          game.currentPlayer.messages.push(data.message);
          this.sendMessage(
            game,
            game.currentPlayer.id !== game.suspiciousPlayer.id,
            data.message
          );

          if (game.suspiciousPlayer.bot) {
            const response = await generateResponse(openai, game);
            game.suspiciousPlayer.messages.push(response);
            setTimeout(() => {
              this.sendMessage(game, false, response);
            }, generateInRange(1000, 6000));
          }
        }
      );

      socket.on("game-vote", async (data: z.infer<typeof castVoteSchema>) => {
        const { success } = castVoteSchema.safeParse(data);
        if (!success) {
          socket.emit("error", "Invalid data");
          return;
        }
        const user = this.getUser(socket.id)!;
        if (!user.game) {
          socket.emit("error", "You are not in a game");
          return;
        }

        const game = user.game;
        if (game.player.id !== user.id) {
          socket.emit(
            "error",
            "You can not cast a vote as you are not the human."
          );
          return;
        }

        const winner = game.setVote(data.human ? Vote.PLAYER : Vote.BOT);
        this.endGame(game);
      });
    });
  }

  public makeRealGame(userOne: User, userTwo: User) {
    const botUser = pickEither(userOne, userTwo);
    const playerUser = botUser === userOne ? userTwo : userOne;

    const bot = new Player(false, botUser.id);

    const player = new Player(false, playerUser.id);
    const game = new Game(player, bot);

    this.prepareGame(game);
    return game;
  }

  public makeBotGame(userOne: User) {
    const bot = new Player(true);
    const game = new Game(new Player(false, userOne.id), bot);

    this.prepareGame(game);
    return game;
  }

  public getUser(id: string): User | undefined {
    return this.users.get(id);
  }

  private prepareGame(game: Game) {
    game.state = GameState.PLAYING;
    game.currentPlayer = game.player;

    const playerUser = this.getUser(game.player.id);
    if (!playerUser) {
      console.log(game.player);
      throw new Error("Player user not found");
    }
    this.getUser(game.player.id)!.game = game;
    this.games.push(game);
    if (!game.suspiciousPlayer.bot) {
      this.getUser(game.suspiciousPlayer.id)!.game = game;
    }

    this.sendToHuman(game, "game-start", (user) => {
      return {
        id: game.id,
        role: "human",
        state: game.state,
      };
    });

    this.sendToRobot(game, "game-start", (user) => {
      return {
        id: game.id,
        role: "bot",
        state: game.state,
      };
    });
  }

  private sendMessage(game: Game, human: boolean, message: string) {
    const channel = "game-message";
    if (human) {
      this.sendToHuman(game, channel, (user) => {
        return {
          message: message,
          opponent: false,
        };
      });
      this.sendToRobot(game, channel, (user) => {
        return {
          message: message,
          opponent: true,
        };
      });
      game.currentPlayer = game.suspiciousPlayer;
      return;
    }
    this.sendToHuman(game, channel, (user) => {
      return {
        message: message,
        opponent: true,
      };
    });
    this.sendToRobot(game, channel, (user) => {
      return {
        message: message,
        opponent: false,
      };
    });
    game.currentPlayer = game.player;
  }

  public endGame(game: Game) {
    game.state = GameState.END;
    this.broadcastToGame(game, "game-end", {
      winner: game.computeWinner(),
    });
    console.log(game.computeWinner());

    const playerUser = this.getUser(game.player.id);
    if (playerUser) {
      playerUser.game = null;
    }

    if (!game.suspiciousPlayer.bot) {
      const botUser = this.getUser(game.suspiciousPlayer.id);
      if (botUser) {
        botUser.game = null;
      }
    }
    this.games = this.games.filter((g) => g.id !== game.id);
  }

  private broadcastToGame<T>(game: Game, event: string, data: T) {
    this.server.to(game.player.id).emit(event, data);
    if (!game.suspiciousPlayer.bot) {
      this.server.to(game.suspiciousPlayer.id).emit(event, data);
    }
  }

  private sendToHuman<T>(
    game: Game,
    event: string,
    dataProvider: (user: User) => T
  ) {
    this.server
      .to(game.player.id)
      .emit(event, dataProvider(this.getUser(game.player.id)!));
  }

  private sendToRobot<T>(
    game: Game,
    event: string,
    dataProvider: (user: User) => T
  ) {
    if (game.suspiciousPlayer.bot) {
      return;
    }
    this.server
      .to(game.suspiciousPlayer.id)
      .emit(event, dataProvider(this.getUser(game.player.id)!));
  }

  public getGame(id: string): Game | null {
    return this.games.find((game) => game.id === id) ?? null;
  }
}

// Singleton instance
export let gameManager: GameManager;
export function setGameManager(manager: GameManager) {
  gameManager = manager;
}
