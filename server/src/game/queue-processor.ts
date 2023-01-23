import { pickEither } from "../util/random";
import { GameManager } from "./game-manager";

export async function startQueueProcessor(gameManager: GameManager) {
  async function processQueue() {
    const userOne = gameManager.queue.pop();
    if (userOne) {
      const shouldBot =
        gameManager.queue.length > 0 ? pickEither(true, false) : true;
      if (shouldBot) {
        gameManager.makeBotGame(userOne);
        return;
      }
      const userTwo = gameManager.queue.pop();
      if (userTwo) {
        console.log(userOne.id, userTwo.id);
        gameManager.makeRealGame(userOne, userTwo);
      }
    }
  }
  setInterval(processQueue, 2000);
}
