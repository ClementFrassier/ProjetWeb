import { Application } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { router as authRouter } from "./routes/auth.ts";
import { router as gameRouter } from "./routes/game.ts";
import { router as userRouter } from "./routes/user.ts";
import { router as shipRouter } from "./routes/ship.ts";
import { errorMiddleware } from "./middleware/error.ts";
import { corsMiddleware  } from "./middleware/cors.ts";
import { initDb,createDefaultAdmins } from "./config/db.ts";
import { handleWebSocket } from "./utils/websocket.ts";
import { router as adminRouter } from "./routes/admin.ts";

const app = new Application();
const PORT = 3000;

app.use(corsMiddleware);

app.use(errorMiddleware);

app.use(async (ctx, next) => {
  if (ctx.request.url.pathname.startsWith("/ws/game/")) {
    const upgrade = ctx.request.headers.get("upgrade");
    if (upgrade && upgrade.toLowerCase() === "websocket") {
      const gameId = ctx.request.url.pathname.split("/")[3];
      console.log("Connexion WebSocket pour la partie:", gameId);
      
      const socket = ctx.upgrade();
            handleWebSocket(socket, gameId);
      return;
    }
  }
  
  await next();
});
app.use(authRouter.routes());
app.use(authRouter.allowedMethods());
app.use(gameRouter.routes());
app.use(gameRouter.allowedMethods());
app.use(userRouter.routes());
app.use(userRouter.allowedMethods());
app.use(shipRouter.routes());
app.use(shipRouter.allowedMethods());
app.use(adminRouter.routes());
app.use(adminRouter.allowedMethods());
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
    };
    socket.onclose = () => {
      console.log("WebSocket connection closed");
    };
  } else {
    await next();
  }
});

app.use((ctx) => {
  ctx.response.status = 404;
  ctx.response.body = { message: "Route not found" };
});

await initDb();
await createDefaultAdmins();



const cert = await Deno.readTextFile("../certs/cert.pem");
const key = await Deno.readTextFile("../certs/key.pem");

await app.listen({
  port: PORT,
  secure: true,
  cert: cert,
  key: key
});

console.log(`Secure server running on https://localhost:${PORT}`);
