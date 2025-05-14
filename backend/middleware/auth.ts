import { Context } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { verifyJWT } from "../utils/jwt.ts";

export const authMiddleware = async (ctx: Context, next: () => Promise<void>) => {
  try {
    const token = await ctx.cookies.get("auth_token");
    
    
    if (!token) {
      console.log("Auth middleware - Aucun token trouvé");
      ctx.response.status = 401;
      ctx.response.body = { message: "Authentification requise" };
      return;
    }

    const payload = await verifyJWT(token);
    
    if (!payload || !payload.id) {
      console.log("Auth middleware - Token invalide");
      ctx.response.status = 401;
      ctx.response.body = { message: "Token invalide" };
      return;
    }

    ctx.state.user = payload;
    console.log("Auth middleware - utilisateur authentifié:", payload.id);
    await next();
    
  } catch (error) {
    console.error("Erreur dans authMiddleware:", error);
    ctx.response.status = 401;
    ctx.response.body = { 
      message: "Erreur d'authentification",
      details: error.message 
    };
  }
};