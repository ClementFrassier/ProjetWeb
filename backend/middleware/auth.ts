// middleware/authMiddleware.ts
import { Context } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { verifyJWT } from "../utils/jwt.ts";

export const authMiddleware = async (ctx: Context, next: () => Promise<void>) => {
  try {
    console.log("Token dans le cookie:", ctx.cookies.get("auth_token"));

    // Récupérer le token depuis le cookie
    const token = ctx.cookies.get("auth_token");
    if (!token) {
      ctx.response.status = 401;
      ctx.response.body = { message: "Authentification requise" };
      return;
    }

    // Vérifier le token
    const payload = await verifyJWT(token);
    ctx.state.user = payload;
    
    await next();
  } catch (error) {
    ctx.response.status = 401;
    ctx.response.body = { message: "Token invalide" };
  }
};

