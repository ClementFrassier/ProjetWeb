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