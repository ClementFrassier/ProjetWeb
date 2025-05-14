import { Context } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { db } from "../config/db.ts";

export const adminMiddleware = async (ctx: Context, next: () => Promise<void>) => {
  try {
    const userId = ctx.state.user?.id;
    
    if (!userId) {
      ctx.response.status = 401;
      ctx.response.body = { message: "Authentification requise" };
      return;
    }

    const users = await db.query(
      "SELECT is_admin FROM users WHERE id = ?",
      [userId]
    );
    
    const isAdmin = users[0][0] === 1 || users[0][0] === true;
    
    if (!isAdmin) {
      ctx.response.status = 403;
      ctx.response.body = { message: "Accès refusé" };
      return;
    }

    await next();
    
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur serveur" };
  }
};