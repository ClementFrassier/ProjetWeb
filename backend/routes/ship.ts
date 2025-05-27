import { Router } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { placeShip, getPlayerShips,validateShipPlacement } from "../controllers/ship.ts";
import { authMiddleware } from "../middleware/auth.ts";

export const router = new Router();

router
  .post("/api/games/placeShip", authMiddleware, placeShip)
  .get("/api/games/playerShips", authMiddleware, getPlayerShips)
  .post("/api/games/validateShipPlacement", authMiddleware, validateShipPlacement)


