import { Context } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { db } from "../config/db.ts";

// Liste simplifiée des utilisateurs
export const getUsers = async (ctx: Context) => {
  try {
    const users = await db.query(
      "SELECT id, username, email, is_admin FROM users"
    );
    
    ctx.response.status = 200;
    ctx.response.body = { users };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur serveur" };
  }
};

// Supprimer un utilisateur
export const deleteUser = async (ctx: Context) => {
  try {
    const userId = ctx.params.id;
    
    const user = await db.query("SELECT id, is_admin FROM users WHERE id = ?", [userId]);
    
    if (user.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = { message: "Utilisateur non trouvé" };
      return;
    }
    
    // Empêcher la suppression d'un administrateur
    if (user[0][1] === 1 || user[0][1] === true) {
      ctx.response.status = 400;
      ctx.response.body = { message: "Impossible de supprimer un administrateur" };
      return;
    }
    
    await db.query("DELETE FROM stats WHERE user_id = ?", [userId]);
    await db.query("DELETE FROM shots WHERE user_id = ?", [userId]);
    await db.query("DELETE FROM ships WHERE user_id = ?", [userId]);
    
    const userGames = await db.query(
      "SELECT id FROM games WHERE player1_id = ? OR player2_id = ?", 
      [userId, userId]
    );
    
    for (const game of userGames) {
      const gameId = game[0];
      await db.query("DELETE FROM shots WHERE game_id = ?", [gameId]);
      await db.query("DELETE FROM ships WHERE game_id = ?", [gameId]);
      await db.query("DELETE FROM games WHERE id = ?", [gameId]);
    }
    
    await db.query("DELETE FROM users WHERE id = ?", [userId]);
    
    ctx.response.status = 200;
    ctx.response.body = { message: "Utilisateur supprimé avec succès" };
  } catch (error) {
    console.error("Erreur lors de la suppression:", error);
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur serveur" };
  }
};

// Supprimer une partie
export const deleteGame = async (ctx: Context) => {
  try {
    const gameId = ctx.params.id;
    
    // Supprimer la partie
    await db.query("DELETE FROM shots WHERE game_id = ?", [gameId]);
    await db.query("DELETE FROM ships WHERE game_id = ?", [gameId]);
    await db.query("DELETE FROM games WHERE id = ?", [gameId]);
    
    ctx.response.status = 200;
    ctx.response.body = { message: "Partie supprimée" };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur serveur" };
  }
};

// Liste des parties
export const getGames = async (ctx: Context) => {
  try {
    const games = await db.query(
      "SELECT id, player1_id, player2_id, status, created_at FROM games"
    );
    
    ctx.response.status = 200;
    ctx.response.body = { games };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur serveur" };
  }
};