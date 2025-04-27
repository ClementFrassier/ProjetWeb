import { create, verify } from "https://deno.land/x/djwt@v2.8/mod.ts";

// Génération de la clé secrète HMAC une seule fois
const secretKey = await crypto.subtle.generateKey(
    { name: "HMAC", hash: "SHA-512" },
    true,
    ["sign", "verify"]
);

export const createJWT = async (payload: Record<string, unknown>) => {
  return await create({ alg: "HS512", typ: "JWT" }, payload, secretKey);
};

export const verifyJWT = async (token: string) => {
  return await verify(token, secretKey);
};
