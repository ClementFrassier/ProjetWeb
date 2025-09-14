// routes/user.ts
import { Router } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { getProfile, getUserStats, getLeaderboard } from "../controllers/user.ts";
import { authMiddleware } from "../middleware/auth.ts";

export const router = new Router();

// Toutes ces routes nécessitent une authentification
router
  .get("/api/users/profile", authMiddleware, getProfile)
  .get("/api/users/stats", authMiddleware, getUserStats)
  .get("/api/users/leaderboard", getLeaderboard); 