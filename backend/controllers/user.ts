import { Context } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { db } from "../config/db.ts";

// Récupère les informations de profil de l'utilisateur connecté
export const getProfile = async (ctx: Context) => {
  try {
    const userId = ctx.state.user.id;
    
    const users = await db.query(
      "SELECT id, username, email, created_at, last_login FROM users WHERE id = ?",
      [userId]
    );
    
    if (users.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = { message: "Utilisateur non trouvé" };
      return;
    }
    
    ctx.response.status = 200;
    ctx.response.body = { user: users[0] };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur serveur", error: error.message };
  }
};

// Récupère et calcule les statistiques de jeu pour l'utilisateur connecté
export const getUserStats = async (ctx: Context) => {
  try {
    const userId = ctx.state.user.id;
    
    const stats = await db.query(
      "SELECT * FROM stats WHERE user_id = ?",
      [userId]
    );
    
    if (stats.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = { message: "Statistiques non trouvées" };
      return;
    }
    
    console.log("Données brutes des statistiques:", stats);
    
    const statsData = {
      user_id: stats[0][0],
      games_played: stats[0][1] || 0,
      games_won: stats[0][2] || 0,
      total_shots: stats[0][3] || 0,
      hits: stats[0][4] || 0,
      ships_sunk: stats[0][5] || 0
    };
    
    // Calcul du pourcentage de précision des tirs
    const accuracy = statsData.total_shots > 0 
      ? (statsData.hits / statsData.total_shots * 100).toFixed(2) 
      : 0;
    
    ctx.response.status = 200;
    ctx.response.body = { 
      ...statsData,
      accuracy: `${accuracy}%`
    };
  } catch (error) {
    console.error("Erreur getUserStats:", error);
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur serveur", error: error.message };
  }
};

// Génère un classement des meilleurs joueurs basé sur les victoires et précision
export const getLeaderboard = async (ctx: Context) => {
  try {
    // calculer et trier les statistiques des joueurs
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