// server.ts
import { Application } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { router as authRouter } from "./routes/auth.ts";
import { router as gameRouter } from "./routes/game.ts";
import { router as userRouter } from "./routes/user.ts";
import { router as shipRouter } from "./routes/ship.ts";
import { errorMiddleware } from "./middleware/error.ts";
import { corsMiddleware } from "./middleware/cors.ts";
import { initDb } from "./config/db.ts";

const app = new Application();
const PORT = 3000;

// Middleware CORS AVANT tout autre middleware
app.use(corsMiddleware);

// Middleware pour les erreurs
app.use(errorMiddleware);

// Middleware pour précharger le corps des requêtes
app.use(async (ctx, next) => {
  // Logger pour debugger
  console.log(`${ctx.request.method} ${ctx.request.url}`);
  console.log("Cookies reçus:", ctx.request.headers.get("cookie"));
  
  // Ajouter un header pour les requêtes préflight OPTIONS
  if (ctx.request.method === "OPTIONS") {
    ctx.response.status = 204;
    return;
  }
  
  await next();
});

// Routes
app.use(authRouter.routes());
app.use(authRouter.allowedMethods());
app.use(gameRouter.routes());
app.use(gameRouter.allowedMethods());
app.use(userRouter.routes());
app.use(userRouter.allowedMethods());
app.use(shipRouter.routes());
app.use(shipRouter.allowedMethods());

// WebSocket setup
app.use(async (ctx, next) => {  
  const upgrade = ctx.request.headers.get("upgrade");
  if (upgrade && upgrade.toLowerCase() === "websocket") {
    const socket = ctx.upgrade();
    socket.onopen = () => {
      console.log("WebSocket connection established");
    };
    socket.onmessage = (e) => {
      console.log("Received:", e.data);
      // Traitement des messages WebSocket
    };
    socket.onclose = () => {
      console.log("WebSocket connection closed");
    };
  } else {
    await next();
  }
});

// 404 handler
app.use((ctx) => {
  ctx.response.status = 404;
  ctx.response.body = { message: "Route not found" };
});

await initDb();

console.log(`Server running on http://localhost:${PORT}`);
await app.listen({ port: PORT });