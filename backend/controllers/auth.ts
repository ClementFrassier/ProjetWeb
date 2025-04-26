// controllers/auth.ts
import { Context } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { hashPassword, verifyPassword } from "../utils/hash.ts";
import { createJWT } from "../utils/jwt.ts";
import { db } from "../config/db.ts";

export const registerUser = async (ctx: Context) => {
  try {
    if (!ctx.request.hasBody) {
      ctx.response.status = 400;
      ctx.response.body = { message: "Le corps de la requête est vide" };
      return;
    }

    const bodyReader = ctx.request.body({ type: "json" }); // Get the body reader
    const body = await bodyReader.value; // Await the value to get the parsed body
    const { username, email, password } = body;



    if (!username || !email || !password) {
      ctx.response.status = 400;
      ctx.response.body = { message: "Tous les champs sont requis" };
      return;
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUsers = await db.query(
      "SELECT * FROM users WHERE username = ? OR email = ?",
      [username, email]
    );

    if (existingUsers.length > 0) {
      ctx.response.status = 409;
      ctx.response.body = { message: "Nom d'utilisateur ou email déjà utilisé" };
      return;
    }

    // Hasher le mot de passe
    const hashedPassword = await hashPassword(password);

    // Insérer l'utilisateur
    await db.execute(
      "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
      [username, email, hashedPassword]
    );

    // Récupérer l'ID du nouvel utilisateur
    const newUser = await db.query(
      "SELECT id FROM users WHERE username = ?",
      [username]
    );

    if (newUser.length > 0) {
      await db.execute(
        "INSERT INTO stats (user_id) VALUES (?)",
        [newUser[0].id]
      );
    }

    ctx.response.status = 201;
    ctx.response.body = { message: "Utilisateur créé avec succès" };
  } catch (error) {
    console.error("Erreur lors de l'enregistrement:", error);
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur serveur", error: error.message };
  }
};

export const loginUser = async (ctx: Context) => {
  try {
    if (!ctx.request.hasBody) {
      ctx.response.status = 400;
      ctx.response.body = { message: "Le corps de la requête est vide" };
      return;
    }

    const body = await ctx.request.body().value; // <= Correction ici aussi
    const { username, password } = body;

    if (!username || !password) {
      ctx.response.status = 400;
      ctx.response.body = { message: "Tous les champs sont requis" };
      return;
    }

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

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      ctx.response.status = 401;
      ctx.response.body = { message: "Identifiants incorrects" };
      return;
    }

    const token = await createJWT({
      id: user.id,
      username: user.username,
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // expire dans 1 heure
    });

    await db.execute(
      "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?",
      [user.id]
    );

    ctx.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 60 * 60 * 1000,
    });

    ctx.response.status = 200;
    ctx.response.body = { 
      message: "Connexion réussie",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      }
    };
  } catch (error) {
    console.error("Erreur lors de la connexion:", error);
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur serveur", error: error.message };
  }
};

export const logoutUser = async (ctx: Context) => {
  try {
    ctx.cookies.delete("auth_token");
    
    ctx.response.status = 200;
    ctx.response.body = { message: "Déconnexion réussie" };
  } catch (error) {
    console.error("Erreur lors de la déconnexion:", error);
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur serveur", error: error.message };
  }
};

export const checkAuth = async (ctx: Context) => {
  try {
    const userId = ctx.state.user.id;

    const users = await db.query(
      "SELECT id, username, email FROM users WHERE id = ?",
      [userId]
    );

    if (users.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = { message: "Utilisateur non trouvé" };
      return;
    }

    ctx.response.status = 200;
    ctx.response.body = { 
      authenticated: true,
      user: users[0],
    };
  } catch (error) {
    console.error("Erreur lors de la vérification d'authentification:", error);
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur serveur", error: error.message };
  }
};
