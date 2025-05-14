import { create, verify } from "https://deno.land/x/djwt@v2.8/mod.ts";

const SECRET_KEY = "12345";

// Convertir la chaîne en clé utilisable par l'API 
const encoder = new TextEncoder();
const keyData = encoder.encode(SECRET_KEY);
const secretKey = await crypto.subtle.importKey(
  "raw",
  keyData,
  { name: "HMAC", hash: "SHA-512" },
  false,
  ["sign", "verify"]
);

export const createJWT = async (payload: Record<string, unknown>) => {
  return await create({ alg: "HS512", typ: "JWT" }, payload, secretKey);
};

export const verifyJWT = async (token: string) => {
  return await verify(token, secretKey);
};