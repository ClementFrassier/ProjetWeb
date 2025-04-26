// controllers/user.ts
import { Context } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { db } from "../config/db.ts";

// Récupérer le profil de l'utilisateur connecté
export const getProfile = async (ctx: Context) => {
  try {
    // L'ID de l'utilisateur est stocké dans ctx.state.user par le middleware d'authentification
    const userId = ctx.state.user.id;
    
    // Requête pour obtenir les informations de l'utilisateur sans le mot de passe
    const users = await db.query(
      "SELECT id, username, email, created_at, last_login FROM users WHERE id = ?",
      [userId]
    );
    
    // Vérifier si l'utilisateur existe
    if (users.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = { message: "Utilisateur non trouvé" };
      return;
    }
    
    // Renvoyer les informations de l'utilisateur
    ctx.response.status = 200;
    ctx.response.body = { user: users[0] };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur serveur", error: error.message };
  }
};



// Récupérer les statistiques d'un utilisateur
export const getUserStats = async (ctx: Context) => {
  try {
    const userId = ctx.state.user.id;
    
    // Récupérer les statistiques
    const stats = await db.query(
      "SELECT * FROM stats WHERE user_id = ?",
      [userId]
    );
    
    if (stats.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = { message: "Statistiques non trouvées" };
      return;
    }
    
    // Calculer le ratio de précision (hits / total_shots)
    const accuracy = stats[0].total_shots > 0 
      ? (stats[0].hits / stats[0].total_shots * 100).toFixed(2) 
      : 0;
    
    ctx.response.status = 200;
    ctx.response.body = { 
      ...stats[0],
      accuracy: `${accuracy}%`
    };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur serveur", error: error.message };
  }
};

// Récupérer le classement des joueurs
export const getLeaderboard = async (ctx: Context) => {
  try {
    // Récupérer les meilleurs joueurs basés sur le nombre de victoires
    const leaderboard = await db.query(`
      SELECT 
        u.id, 
        u.username, 
        s.games_played, 
        s.games_won, 
        s.hits, 
        s.total_shots,
        CASE 
          WHEN s.total_shots > 0 THEN ROUND((s.hits * 100.0 / s.total_shots), 2)
          ELSE 0 
        END as accuracy,
        CASE 
          WHEN s.games_played > 0 THEN ROUND((s.games_won * 100.0 / s.games_played), 2)
          ELSE 0 
        END as win_rate
      FROM 
        users u
      JOIN 
        stats s ON u.id = s.user_id
      ORDER BY 
        s.games_won DESC, 
        win_rate DESC,
        accuracy DESC
      LIMIT 10
    `);
    
    ctx.response.status = 200;
    ctx.response.body = { leaderboard };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur serveur", error: error.message };
  }
};