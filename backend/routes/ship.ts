import { Router } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { placeShip, getPlayerShips,validateShipPlacement,checkShipStatus } from "../controllers/ship.ts";
import { authMiddleware } from "../middleware/auth.ts";

export const router = new Router();

router
  .post("/api/games/placeShipe", authMiddleware, placeShip)
  .get("/api/games/playerShips", authMiddleware, getPlayerShips)
  .post("/api/games/validateShipPlacement", authMiddleware, validateShipPlacement)
  .get("/api/games/shipStatus", authMiddleware, checkShipStatus);


