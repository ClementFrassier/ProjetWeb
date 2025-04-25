// utils/jwt.ts
import { create, verify } from "https://deno.land/x/djwt@v2.8/mod.ts";

const encoder = new TextEncoder();
const JWT_SECRET = encoder.encode("key"); // À changer en production

export const createJWT = async (payload: Record<string, unknown>) => {
  return await create({ alg: "HS256", typ: "JWT" }, payload, JWT_SECRET);
};

export const verifyJWT = async (token: string) => {
  return await verify(token, JWT_SECRET);
};