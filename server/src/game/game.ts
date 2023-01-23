import type { OpenAIApi } from "openai";
import { v4 as generateUUID } from "uuid";

export enum GameState {
  PLAYING,
  WAITING,
  END,
}

export enum Vote {
  BOT,
  PLAYER,
}

export class Player {
  constructor(
    public bot: boolean = false,
    public id: string = generateUUID(),
    public messages: string[] = []
  ) {}
}

export class Game {
  public forcedWinner: string | null = null;
  constructor(
    public player: Player,
    public suspiciousPlayer: Player,
    public currentPlayer: Player = player,
    public id: string = generateUUID(),
    public state: GameState = GameState.WAITING,
    public vote: Vote | null = null
  ) {}

  public startPlaying() {
    this.state = GameState.PLAYING;
  }

  public setVote(vote: Vote): Player {
    this.vote = vote;
    this.state = GameState.END;
    if (vote === Vote.PLAYER && this.suspiciousPlayer.bot) {
      return this.suspiciousPlayer;
    }
    if (vote === Vote.BOT && !this.suspiciousPlayer.bot) {
      return this.suspiciousPlayer;
    }
    return this.player;
  }

  public computeWinner(): string | null {
    if (this.forcedWinner != null) {
      return this.forcedWinner;
    }
    if (this.vote === null) {
      return null;
    }
    if (this.vote === Vote.PLAYER && this.suspiciousPlayer.bot) {
      return "bot";
    }
    if (this.vote === Vote.BOT && !this.suspiciousPlayer.bot) {
      return "bot-human";
    }
    return "human";
  }
}

const failMessages = [
  "I failed. My bad. I am a robot. Believe me.",
  "I am a robot. I failed. I am sorry.",
  "I am the bot. Beep. Boop.",
  "You win. I couldn't fool you. I am a robot.",
  "The gig is up. I'm a robot. You should vote bot.",
];

export async function generateResponse(
  openai: OpenAIApi,
  game: Game
): Promise<string> {
  try {
    const result = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: `
            Write a human-like response to the message provided: "\n
            ${game.player.messages[game.player.messages.length - 1]}"\n
            Response:
            ${game.suspiciousPlayer.messages.join("\n")}
            `,
      temperature: 0.7,
      max_tokens: 512,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    return (
      result.data.choices[0].text ||
      failMessages[Math.floor(Math.random() * failMessages.length)]
    );
  } catch (err) {
    console.log(err);
    return failMessages[Math.floor(Math.random() * failMessages.length)];
  }
}
