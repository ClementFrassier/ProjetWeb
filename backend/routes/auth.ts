import { Router } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { registerUser, loginUser, logoutUser,checkAuth } from "../controllers/auth.ts";
import { authMiddleware } from "../middleware/auth.ts";

export const router = new Router();

router
  .post("/api/auth/register", registerUser)
  .post("/api/auth/login", loginUser)
  .post("/api/auth/logout", logoutUser)
  .get("/api/auth/check", authMiddleware, checkAuth);