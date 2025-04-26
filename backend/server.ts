// Point d'entrée du serveur 
// server.ts
import { Application } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";
import { router as authRouter } from "./routes/auth.ts";
import { router as gameRouter } from "./routes/game.ts";
import { router as userRouter } from "./routes/user.ts";
import { router as shipRouter } from "./routes/ship.ts";
import { errorMiddleware } from "./middleware/error.ts";
import { initDb } from "./config/db.ts";

const app = new Application();
const PORT = 3000;


// Middleware global
app.use(errorMiddleware);
app.use(oakCors({
  origin: "http://localhost:8080",
  credentials: true,
}));

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


console.log(`Server running on http://localhost:${PORT}`);
await app.listen({ port: PORT });