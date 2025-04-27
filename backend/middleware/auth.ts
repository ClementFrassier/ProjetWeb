import { Context } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { verifyJWT } from "../utils/jwt.ts";

export const authMiddleware = async (ctx: Context, next: () => Promise<void>) => {
  try {
    const token = await ctx.cookies.get("auth_token"); // <-- AWAITS ICI !!!
    console.log("Token dans le cookie:", token);
    
    if (!token) {
      console.log("Aucun token trouvé dans les cookies");
      ctx.response.status = 401;
      ctx.response.body = { message: "Authentification requise" };
      return;
    }

    try {
      const payload = await verifyJWT(token);
      console.log("Payload du token:", payload);
      ctx.state.user = payload;
      await next();
    } catch (error) {
      console.error("Erreur de vérification JWT:", error);
      ctx.response.status = 401;
      ctx.response.body = { message: "Token invalide" };
    }
  } catch (error) {
    console.error("Erreur générale dans authMiddleware:", error);
    ctx.response.status = 401;
    ctx.response.body = { message: "Token invalide" };
  }
};
