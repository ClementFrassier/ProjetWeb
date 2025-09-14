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
    console.error("Erreur getUsers:", error);
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur serveur" };
  }
};

// Supprimer un utilisateur
export const deleteUser = async (ctx: Context) => {
  try {
    const userId = ctx.params.id;
    console.log("Tentative de suppression de l'utilisateur:", userId);
    
    // Vérifier que l'utilisateur existe
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
    
    console.log("Utilisateur trouvé, début de la suppression en cascade...");
    
    // 1. Supprimer les statistiques
    try {
      await db.query("DELETE FROM stats WHERE user_id = ?", [userId]);
      console.log("Stats supprimées");
    } catch (error) {
      console.log("Pas de stats à supprimer ou erreur:", error.message);
    }
    
    // 2. Supprimer les tirs de l'utilisateur
    try {
      await db.query("DELETE FROM shots WHERE user_id = ?", [userId]);
      console.log("Tirs supprimés");
    } catch (error) {
      console.log("Pas de tirs à supprimer ou erreur:", error.message);
    }
    
    // 3. Supprimer les navires de l'utilisateur
    try {
      await db.query("DELETE FROM ships WHERE user_id = ?", [userId]);
      console.log("Navires supprimés");
    } catch (error) {
      console.log("Pas de navires à supprimer ou erreur:", error.message);
    }
    
    // 4. Récupérer et supprimer les parties où l'utilisateur participe
    try {
      const userGames = await db.query(
        "SELECT id FROM games WHERE player1_id = ? OR player2_id = ?", 
        [userId, userId]
      );
      
      console.log(`${userGames.length} parties à nettoyer`);
      
      for (const game of userGames) {
        const gameId = game[0];
        console.log(`Nettoyage de la partie ${gameId}`);
        
        // Supprimer tous les tirs de cette partie
        try {
          await db.query("DELETE FROM shots WHERE game_id = ?", [gameId]);
        } catch (error) {
          console.log(`Erreur suppression tirs partie ${gameId}:`, error.message);
        }
        
        // Supprimer tous les navires de cette partie
        try {
          await db.query("DELETE FROM ships WHERE game_id = ?", [gameId]);
        } catch (error) {
          console.log(`Erreur suppression navires partie ${gameId}:`, error.message);
        }
        
        // Supprimer la partie
        try {
          await db.query("DELETE FROM games WHERE id = ?", [gameId]);
        } catch (error) {
          console.log(`Erreur suppression partie ${gameId}:`, error.message);
        }
      }
    } catch (error) {
      console.log("Erreur lors du nettoyage des parties:", error.message);
    }
    
    // 5. Enfin, supprimer l'utilisateur
    try {
      await db.query("DELETE FROM users WHERE id = ?", [userId]);
      console.log("Utilisateur supprimé");
    } catch (error) {
      console.error("Erreur critique lors de la suppression de l'utilisateur:", error);
      throw error;
    }
    
    ctx.response.status = 200;
    ctx.response.body = { message: "Utilisateur supprimé avec succès" };
    
  } catch (error) {
    console.error("Erreur lors de la suppression:", error);
    ctx.response.status = 500;
    ctx.response.body = { 
      message: "Erreur serveur lors de la suppression", 
      details: error.message 
    };
  }
};

// Supprimer une partie
export const deleteGame = async (ctx: Context) => {
  try {
    const gameId = ctx.params.id;
    console.log("Tentative de suppression de la partie:", gameId);
    
    // Vérifier que la partie existe
    const game = await db.query("SELECT id FROM games WHERE id = ?", [gameId]);
    
    if (game.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = { message: "Partie non trouvée" };
      return;
    }
    
    // Supprimer en cascade
    try {
      await db.query("DELETE FROM shots WHERE game_id = ?", [gameId]);
      console.log("Tirs de la partie supprimés");
    } catch (error) {
      console.log("Erreur suppression tirs:", error.message);
    }
    
    try {
      await db.query("DELETE FROM ships WHERE game_id = ?", [gameId]);
      console.log("Navires de la partie supprimés");
    } catch (error) {
      console.log("Erreur suppression navires:", error.message);
    }
    
    try {
      await db.query("DELETE FROM games WHERE id = ?", [gameId]);
      console.log("Partie supprimée");
    } catch (error) {
      console.error("Erreur suppression partie:", error);
      throw error;
    }
    
    ctx.response.status = 200;
    ctx.response.body = { message: "Partie supprimée avec succès" };
    
  } catch (error) {
    console.error("Erreur lors de la suppression de la partie:", error);
    ctx.response.status = 500;
    ctx.response.body = { 
      message: "Erreur serveur lors de la suppression de la partie",
      details: error.message 
    };
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
    console.error("Erreur getGames:", error);
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur serveur" };
  }
};