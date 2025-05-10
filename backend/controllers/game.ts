import { Context } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { db } from "../config/db.ts";

// Fonction utilitaire pour convertir les lignes de la DB en objet
function convertRowToGame(row: any[]) {
  return {
    id: row[0],
    player1_id: row[1],
    player2_id: row[2],
    status: row[3],
    winner_id: row[4],
    created_at: row[5],
    updated_at: row[6]
  };
}

// backend/controllers/game.ts - Fonction startGame corrigée
export const startGame = async (ctx: Context) => {
  try {
    const userId = ctx.state.user.id;
    console.log("Création d'une partie pour l'utilisateur:", userId);

    // Version simplifiée sans transaction explicite
    try {
      // Insérer la nouvelle partie
      await db.query(
        "INSERT INTO games (player1_id, status) VALUES (?, 'waiting')",
        [userId]
      );

      // Récupérer le dernier ID inséré
      const result = await db.query(
        "SELECT last_insert_rowid() as id"
      );

      console.log("Résultat de last_insert_rowid:", result);

      // Vérifier le format du résultat
      let gameId;
      if (result && result.length > 0) {
        // Si c'est un tableau de tableaux
        if (Array.isArray(result[0])) {
          gameId = result[0][0];
        } else {
          // Si c'est un tableau d'objets
          gameId = result[0].id || result[0][0];
        }
      }

      console.log("ID de partie créé:", gameId);

      if (!gameId) {
        throw new Error("Impossible de récupérer l'ID de la partie créée");
      }

      ctx.response.status = 201;
      ctx.response.body = { 
        success: true,
        gameId: gameId,
        message: "Partie créée avec succès"
      };

    } catch (error) {
      console.error("Erreur lors de la création de partie:", error);
      throw error;
    }

  } catch (error) {
    console.error("Erreur création partie:", error);
    ctx.response.status = 500;
    ctx.response.body = { 
      success: false,
      error: error.message,
      details: "Échec de la création de partie"
    };
  }
};

// Alternative plus robuste si la première version ne fonctionne pas
export const startGameAlternative = async (ctx: Context) => {
  try {
    const userId = ctx.state.user.id;
    console.log("Création d'une partie pour l'utilisateur:", userId);

    // Générer un ID unique basé sur le timestamp
    const gameId = Date.now();

    // Insérer la partie avec un ID spécifique
    await db.query(
      "INSERT INTO games (id, player1_id, status) VALUES (?, ?, 'waiting')",
      [gameId, userId]
    );

    ctx.response.status = 201;
    ctx.response.body = { 
      success: true,
      gameId: gameId,
      message: "Partie créée avec succès"
    };

  } catch (error) {
    console.error("Erreur création partie:", error);
    ctx.response.status = 500;
    ctx.response.body = { 
      success: false,
      error: error.message,
      details: "Échec de la création de partie"
    };
  }
};

// backend/controllers/game.ts - Fonction joinGame corrigée
export const joinGame = async (ctx: Context) => {
  try {
    const body = await ctx.request.body.json();
    const gameId = parseInt(body.gameId);
    const userId = ctx.state.user.id;
    
    console.log("Tentative de rejoindre la partie:", { gameId, userId });

    // Vérifier que gameId est valide
    if (!gameId || isNaN(gameId)) {
      ctx.response.status = 400;
      ctx.response.body = { error: "ID de partie invalide" };
      return;
    }

    // Vérifier si la partie existe
    const game = await db.query("SELECT * FROM games WHERE id = ?", [gameId]);
    
    if (!game || game.length === 0) {
      console.log("Partie non trouvée:", gameId);
      ctx.response.status = 404;
      ctx.response.body = { error: "Partie introuvable" };
      return;
    }

    const gameData = game[0];
    
    // Vérifier l'état de la partie
    if (gameData[3] !== 'waiting') {
      console.log("Partie non disponible, statut:", gameData[3]);
      ctx.response.status = 400;
      ctx.response.body = { error: "La partie n'est pas disponible" };
      return;
    }

    // Vérifier si le joueur n'est pas déjà dans la partie
    if (gameData[1] === userId) {
      console.log("Le joueur est déjà dans la partie");
      ctx.response.status = 400;
      ctx.response.body = { error: "Vous êtes déjà dans cette partie" };
      return;
    }

    // Rejoindre la partie
    await db.query(
      "UPDATE games SET player2_id = ?, status = 'setup', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [userId, gameId]
    );

    console.log("Partie rejointe avec succès:", { gameId, userId });

    ctx.response.status = 200;
    ctx.response.body = { 
      success: true,
      gameId: gameId,
      message: "Partie rejointe avec succès"
    };
  } catch (error) {
    console.error("Erreur lors de la tentative de rejoindre:", error);
    ctx.response.status = 500;
    ctx.response.body = { 
      error: "Erreur lors de la tentative de rejoindre la partie",
      details: error.message
    };
  }
};

export const getGameDetails = async (ctx: Context) => {
  try {
    const userId = ctx.state.user.id;
    const gameId = ctx.request.url.searchParams.get("id");

    // Debug
    console.log("getGameDetails - userId:", userId);
    console.log("getGameDetails - gameId:", gameId);

    // Vérification stricte de l'ID
    if (!gameId || gameId === 'undefined' || gameId === 'null') {
      ctx.response.status = 400;
      ctx.response.body = { 
        error: "ID de partie invalide",
        details: `ID reçu: ${gameId}`
      };
      return;
    }
    
    const games = await db.query(
      "SELECT * FROM games WHERE id = ?",
      [gameId]
    );

    console.log("getGameDetails - résultat requête:", games);

    if (games.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = { 
        error: "Partie non trouvée",
        gameId: gameId
      };
      return;
    }
    
    const game = games[0];
    console.log("getGameDetails - game row:", game);
    
    // Vérification des permissions (comparaison avec game[1] et game[2])
    if (game[1] !== userId && game[2] !== userId) {
      console.log("getGameDetails - accès refusé:", {
        player1: game[1],
        player2: game[2],
        userId: userId
      });
      ctx.response.status = 403;
      ctx.response.body = { error: "Accès refusé" };
      return;
    }

    // Retourner un objet structuré
    ctx.response.status = 200;
    ctx.response.body = {
      game: convertRowToGame(game)
    };
  } catch (error) {
    console.error("Erreur getGameDetails:", error);
    ctx.response.status = 500;
    ctx.response.body = { 
      error: "Erreur serveur",
      details: error.message 
    };
  }
};

export const makeShot = async (ctx: Context) => {
  try {
    const userId = ctx.state.user.id;
    const body = await ctx.request.body().value;
    const { gameId, x_position, y_position } = body;
    
    if (!gameId) {
      ctx.response.status = 400;
      ctx.response.body = { message: "ID de partie requis" };
      return;
    }

    if (x_position === undefined || y_position === undefined) {
      ctx.response.status = 400;
      ctx.response.body = { message: "Position de tir requise" };
      return;
    }

    const games = await db.query(
      "SELECT * FROM games WHERE id = ?",
      [gameId]
    );

    if (games.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = { message: "Partie non trouvée" };
      return;
    }

    const game = games[0];
    
    // Vérifier que la partie est en cours
    if (game[3] !== "in_progress") {
      ctx.response.status = 400;
      ctx.response.body = { message: "La partie n'est pas en cours" };
      return;
    }
    
    // Vérifier que l'utilisateur est bien un joueur de cette partie
    if (game[1] !== userId && game[2] !== userId) {
      ctx.response.status = 403;
      ctx.response.body = { message: "Vous n'êtes pas un joueur de cette partie" };
      return;
    }

    // Déterminer l'adversaire
    let opponentId = null;
    if (game[1] === userId) {
      opponentId = game[2];
    } else {
      opponentId = game[1];
    }

    if (opponentId === null) {
      ctx.response.status = 404;
      ctx.response.body = { message: "Adversaire introuvable" };
      return;
    }

    // Vérifier si un navire est touché à cette position
    const ships = await db.query(
      "SELECT * FROM ships WHERE game_id = ? AND user_id = ? AND x_position <= ? AND x_position + (CASE WHEN orientation = 'horizontal' THEN size - 1 ELSE 0 END) >= ? AND y_position <= ? AND y_position + (CASE WHEN orientation = 'vertical' THEN size - 1 ELSE 0 END) >= ?",
      [gameId, opponentId, x_position, x_position, y_position, y_position]
    );

    let isHit = false;
    let shipId = null;

    if (ships.length > 0) {
      isHit = true;
      shipId = ships[0][0];
      
      // Vérifier si le navire est coulé après ce tir
      const hits = await db.query(
        "SELECT COUNT(*) as hit_count FROM shots WHERE game_id = ? AND ship_id = ? AND is_hit = TRUE",
        [gameId, shipId]
      );
      
      // +1 pour inclure le tir actuel
      const hitCount = hits[0][0] + 1;
      
      if (hitCount >= ships[0][7]) {
        // Marquer le navire comme coulé
        await db.query(
          "UPDATE ships SET is_sunk = TRUE WHERE id = ?",
          [shipId]
        );
        
        // Mettre à jour les statistiques
        await db.query(
          "UPDATE stats SET ships_sunk = ships_sunk + 1 WHERE user_id = ?",
          [userId]
        );
      }
    }

    // Enregistrer le tir
    await db.query(
      "INSERT INTO shots (game_id, user_id, x_position, y_position, is_hit, ship_id) VALUES (?, ?, ?, ?, ?, ?)",
      [gameId, userId, x_position, y_position, isHit, shipId]
    );
    
    // Mettre à jour les statistiques
    await db.query(
      "UPDATE stats SET total_shots = total_shots + 1, hits = hits + ? WHERE user_id = ?",
      [isHit ? 1 : 0, userId]
    );
    
    // Vérifier si tous les navires sont coulés
    const remainingShips = await db.query(
      "SELECT COUNT(*) as count FROM ships WHERE game_id = ? AND user_id = ? AND is_sunk = FALSE",
      [gameId, opponentId]
    );
    
    if (remainingShips[0][0] === 0) {
      // Fin de partie
      await db.query(
        "UPDATE games SET status = 'finished', winner_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [userId, gameId]
      );
      
      // Mettre à jour les statistiques
      await db.query(
        "UPDATE stats SET games_won = games_won + 1 WHERE user_id = ?",
        [userId]
      );
      
      await db.query(
        "UPDATE stats SET games_played = games_played + 1 WHERE user_id IN (?, ?)",
        [userId, opponentId]
      );
    }

    ctx.response.status = 201;
    ctx.response.body = { 
      message: "Tir effectué avec succès", 
      hit: isHit,
      shipId: shipId
    };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur serveur", error: error.message };
  }
};

// Fonction modifiée - récupère les parties de l'utilisateur
export const getActiveGames = async (ctx: Context) => {
  try {
    const userId = ctx.state.user.id;
    
    // Récupérer uniquement les parties où l'utilisateur est impliqué
    const games = await db.query(
      "SELECT * FROM games WHERE (player1_id = ? OR player2_id = ?) AND status != 'finished'",
      [userId, userId]
    );

    ctx.response.status = 200;
    ctx.response.body = { games };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur serveur", error: error.message };
  }
};

// NOUVELLE FONCTION - récupère les parties disponibles à rejoindre
export const getAvailableGames = async (ctx: Context) => {
  try {
    const userId = ctx.state.user.id;

    const games = await db.query(
      "SELECT * FROM games WHERE status = 'waiting' AND player1_id != ?",
      [userId]
    );

    ctx.response.status = 200;
    ctx.response.body = { games };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur serveur", error: error.message };
  }
};

export const abandonGame = async (ctx: Context) => {
  try {
    const userId = ctx.state.user.id;
    const body = await ctx.request.body().value;
    const { gameId } = body;

    if (!gameId) {
      ctx.response.status = 400;
      ctx.response.body = { message: "ID de partie requis" };
      return;
    }

    const games = await db.query(
      "SELECT * FROM games WHERE id = ?",
      [gameId]
    );

    if (games.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = { message: "Partie non trouvée" };
      return;
    }

    const game = games[0];

    if (game[1] !== userId && game[2] !== userId) {
      ctx.response.status = 403;
      ctx.response.body = { message: "Vous n'êtes pas un joueur de cette partie" };
      return;
    }

    let winnerId = null;
    let loserId = null;
    if (game[1] === userId) {
      winnerId = game[2];
      loserId = game[1];
    } else {
      winnerId = game[1];
      loserId = game[2];
    }

    await db.query(
      "UPDATE games SET status = 'finished', updated_at = CURRENT_TIMESTAMP, winner_id = ? WHERE id = ?",
      [winnerId, gameId]
    );

    await db.query(
      "UPDATE stats SET games_played = games_played + 1, games_won = games_won + 1 WHERE user_id = ?",
      [winnerId]
    );

    await db.query(
      "UPDATE stats SET games_played = games_played + 1 WHERE user_id = ?",
      [loserId]
    );

    ctx.response.status = 201;
    ctx.response.body = { message: "Partie terminée" };

  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur serveur", error: error.message };
  }
};