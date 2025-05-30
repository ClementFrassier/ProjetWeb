import { Context } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { hashPassword, verifyPassword } from "../utils/hash.ts";
import { createJWT } from "../utils/jwt.ts";
import { db } from "../config/db.ts";

// Fonction asynchrone pour l'enregistrement d'un nouvel utilisateur
export const registerUser = async (ctx: Context) => {
  try {
    if (!ctx.request.hasBody) {
      ctx.response.status = 400;
      ctx.response.body = { message: "Le corps de la requête est vide" };
      return;
    }

    const body = await ctx.request.body.json();
    const { username, email, password } = body;

    if (!username || !email || !password) {
      ctx.response.status = 400;
      ctx.response.body = { message: "Tous les champs sont requis" };
      return;
    }

    const existingUsers = await db.query(
      "SELECT * FROM users WHERE username = ? OR email = ?",
      [username, email]
    );

    if (existingUsers.length > 0) {
      ctx.response.status = 409;
      ctx.response.body = { message: "Nom d'utilisateur ou email déjà utilisé" };
      return;
    }
    // Hachage du mot de passe pour sécuriser le stockage
    const hashedPassword = await hashPassword(password);

    await db.query(
      "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
      [username, email, hashedPassword]
    );


    const newUser = await db.query(
      "SELECT id FROM users WHERE username = ?",
      [username]
    );

    if (newUser.length > 0) {
      await db.query(
        "INSERT INTO stats (user_id) VALUES (?)",
        [newUser[0][0]]
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


//Fonction asynchrone pour authentifier un utilisateur
export const loginUser = async (ctx: Context) => {
  try {
    if (!ctx.request.hasBody) {
      ctx.response.status = 400;
      ctx.response.body = { message: "Le corps de la requête est vide" };
      return;
    }
    const body = await ctx.request.body.json();
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
      ctx.response.body = { message: "Username incorrects" };
      return;
    }

    const user = users[0];
    if (!user) {
      ctx.response.status = 401;
      ctx.response.body = { message: "Utilisateur non trouvé" };
      return;
    }
    
    const hash = user[3];

    const isValid = await verifyPassword(password, hash);

    if (!isValid) {
      ctx.response.status = 401;
      ctx.response.body = { message: "MDP incorrects" };
      return;
    }
    
    if (!user || !user[0] || !user[1]) {
      ctx.response.status = 401;
      ctx.response.body = { message: "Utilisateur invalide" };
      return;
    }

    console.log("Utilisateur ID:", user[0]);
    console.log("Utilisateur username:", user[1]);

    //Création du JWT pour l'authentification
    const token = await createJWT({
      id: user[0],
      username: user[1],
      is_admin: user[4] === 1 || user[4] === true,
      exp: Math.floor(Date.now() / 1000) + 60 * 60, //expir en 1 heure
    });

    await db.execute(
      "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?",
      [user[0]]
    );

    // Configuration du cookie
    ctx.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 1000, 
    });

    ctx.response.status = 200;
    ctx.response.body = { 
      message: "Connexion réussie",
      user: {
        id: user[0],
        username: user[1],
        email: user[2],
        is_admin: user[4] === 1 || user[4] === true
      }
    };
  } catch (error) {
    console.error("Erreur lors de la connexion:", error);
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur serveur", error: error.message };
  }
};

// Fonction pour déconnecter un utilisateur
export const logoutUser = async (ctx: Context) => {
  try {
    // Suppression du cookie d'authentification
    ctx.cookies.set("auth_token", "", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      expires: new Date(0), 
    });
    
    ctx.response.status = 200;
    ctx.response.body = { message: "Déconnexion réussie" };
  } catch (error) {
    console.error("Erreur lors de la déconnexion:", error);
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur serveur", error: error.message };
  }
};

// Fonction pour vérifier l'authentification d'un utilisateur
export const checkAuth = async (ctx: Context) => {
  try {
    const userId = ctx.state.user.id;
    const users = await db.query("SELECT id, username, email, is_admin FROM users WHERE id = ?", [userId]);

    if (users.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = { message: "Utilisateur non trouvé" };
      return;
    }


    const user = {
      id: users[0][0],
      username: users[0][1],
      email: users[0][2],
      is_admin: users[0][3] === 1 || users[0][3] === true

    };

    ctx.response.status = 200;
    ctx.response.body = { 
      authenticated: true,
      user: user,
    };
  } catch (error) {
    console.error("Erreur lors de la vérification d'authentification:", error);
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur serveur", error: error.message };
  }
};