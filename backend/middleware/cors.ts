// middleware/cors.ts
import { Context } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";

export const corsMiddleware = oakCors({
  origin: "http://localhost:8080", // Pas de "/" à la fin
  credentials: true, // IMPORTANT : activer l'envoi des cookies
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["Set-Cookie"],
  optionsSuccessStatus: 204,
});