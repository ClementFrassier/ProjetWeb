import { create, verify } from "https://deno.land/x/djwt@v2.8/mod.ts";

function generateSecureRandomKey(length = 32): string {
  const randomBytes = new Uint8Array(length);
  crypto.getRandomValues(randomBytes);
  
  return btoa(String.fromCharCode(...randomBytes));
}



const SECRET_KEY = Deno.env.get("JWT_SECRET_KEY") || generateSecureRandomKey();



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