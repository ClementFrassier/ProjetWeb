import { Context } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { verifyJWT } from "../utils/jwt.ts";

export const authMiddleware = async (ctx: Context, next: () => Promise<void>) => {
  try {
    // Récupérer le token depuis les cookies
    const token = await ctx.cookies.get("auth_token");
    
    // Debug
    console.log("Auth middleware - cookie token:", token);
    
    if (!token) {
      // Vérifier si le token est dans l'en-tête Authorization à la place
      const authHeader = ctx.request.headers.get("Authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const bearerToken = authHeader.substring(7);
        try {
          const payload = await verifyJWT(bearerToken);
          if (payload && payload.id) {
            ctx.state.user = payload;
            await next();
            return;
          }
        } catch (e) {
          console.error("Erreur de vérification du token Bearer:", e);
        }
      }
      
      ctx.response.status = 401;
      ctx.response.body = { message: "Authentification requise" };
      return;
    }

    const payload = await verifyJWT(token);
    
    if (!payload || !payload.id) {
      ctx.response.status = 401;
      ctx.response.body = { message: "Token invalide" };
      return;
    }

    ctx.state.user = payload;
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