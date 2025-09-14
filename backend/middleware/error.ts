import { Context } from "https://deno.land/x/oak@v12.6.1/mod.ts";

export const errorMiddleware = async (ctx: Context, next: () => Promise<unknown>) => {
  try {
    await next(); 
  } catch (err) {
    console.error("Erreur attrapée :", err);
    ctx.response.status = err.status || 500;
    ctx.response.body = {
      message: err.message || "Erreur interne du serveur",
    };
  }
};
