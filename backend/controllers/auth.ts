// controllers/authController.ts
import { Context } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { hashPassword, verifyPassword } from "../utils/hash.ts";
import { createJWT } from "../utils/jwt.ts";
import { db } from "../config/db.ts";

export const registerUser = async (ctx: Context) => {
  try {
    const body = await ctx.request.body().value;
    const { username, email, password } = body;

    // Vérifications basiques
    if (!username || !email || !password) {
      ctx.response.status = 400;
      ctx.response.body = { message: "Tous les champs sont requis" };
      return;
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await db.query(
      "SELECT * FROM users WHERE username = ? OR email = ?",
      [username, email]
    );

    if (existingUser.length > 0) {
      ctx.response.status = 409;
      ctx.response.body = { message: "Nom d'utilisateur ou email déjà utilisé" };
      return;
    }

    // Hasher le mot de passe
    const hashedPassword = await hashPassword(password);

    // Insérer l'utilisateur
    const result = await db.query(
      "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
      [username, email, hashedPassword]
    );

    // Initialiser les statistiques
    await db.query(
      "INSERT INTO stats (user_id) VALUES (?)",
      [result.lastInsertId]
    );

    ctx.response.status = 201;
    ctx.response.body = { message: "Utilisateur créé avec succès" };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur serveur", error: error.message };
  }
};

export const loginUser = async (ctx: Context) => {
  try {
    const body = await ctx.request.body().value;
    const { username, password } = body;

    if (!username || !password) {
      ctx.response.status = 400;
      ctx.response.body = { message: "Tous les champs sont requis" };
      return;
    }

    // Rechercher l'utilisateur
    const users = await db.query(
      "SELECT * FROM users WHERE username = ?",
      [username]
    );

    if (users.length === 0) {
      ctx.response.status = 401;
      ctx.response.body = { message: "Identifiants incorrects" };
      return;
    }

    const user = users[0];

    // Vérifier le mot de passe
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      ctx.response.status = 401;
      ctx.response.body = { message: "Identifiants incorrects" };
      return;
    }

    // Créer un token JWT
    const token = await createJWT({
      id: user.id,
      username: user.username,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 // 1 heure
    });

    // Mettre à jour la dernière connexion
    await db.query(
      "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", 
      [user.id]
    );

    // Définir le cookie
    ctx.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: true, // Pour HTTPS
      sameSite: "none", // Pour le CORS
      maxAge: 60 * 60 * 1000, // 1 heure en millisecondes
    });

    ctx.response.status = 200;
    ctx.response.body = { 
      message: "Connexion réussie",
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur serveur", error: error.message };
  }
};

export const logoutUser = async (ctx: Context) => {
  // Supprimer le cookie d'authentification
  ctx.cookies.delete("auth_token");
  
  ctx.response.status = 200;
  ctx.response.body = { message: "Déconnexion réussie" };
};