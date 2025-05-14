import { Router } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { authMiddleware } from "../middleware/auth.ts";
import { adminMiddleware } from "../middleware/admin.ts";
import { getUsers, deleteGame, getGames } from "../controllers/admin.ts";

export const router = new Router();

router
  .get("/api/admin/users", authMiddleware, adminMiddleware, getUsers)
  .get("/api/admin/games", authMiddleware, adminMiddleware, getGames)
  .delete("/api/admin/games/:id", authMiddleware, adminMiddleware, deleteGame);