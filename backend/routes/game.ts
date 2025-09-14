// routes/game.ts
import { Router } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { 
  startGame, joinGame, startGameManual, getGameDetails, makeShot,
  getActiveGames, abandonGame, getAvailableGames, setPlayerReady, checkPlayersReady 
} from "../controllers/game.ts";
import { authMiddleware } from "../middleware/auth.ts";

export const router = new Router();

router
  .post("/api/games/start", authMiddleware, startGame)
  .post("/api/games/join", authMiddleware, joinGame)
  .post("/api/games/shot", authMiddleware, makeShot)
  .get("/api/games/detail", authMiddleware, getGameDetails)
  .get("/api/games/active", authMiddleware, getActiveGames)
  .post("/api/games/dabandon", authMiddleware, abandonGame)
  .get("/api/games/available", authMiddleware, getAvailableGames)
  .post("/api/games/ready", authMiddleware, setPlayerReady)
  .get("/api/games/checkReady", authMiddleware, checkPlayersReady)
  .get("/api/games/checkAllShipsPlaced", authMiddleware, checkPlayersReady)
  .post("/api/games/startGame", authMiddleware, startGameManual);