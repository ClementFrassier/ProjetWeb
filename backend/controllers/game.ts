import { Context } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { db } from "../config/db.ts";

// Convertit les données brutes d'une ligne de base de données en objet structuré
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

// Crée une nouvelle partie avec l'utilisateur actuel comme premier joueur
export const startGame = async (ctx: Context) => {
  try {
    const userId = ctx.state.user.id;
    console.log("Création d'une partie pour l'utilisateur:", userId);

    try {
      await db.query(
        "INSERT INTO games (player1_id, status) VALUES (?, 'waiting')",
        [userId]
      );

      const result = await db.query(
        "SELECT last_insert_rowid() as id"
      );

      console.log("Résultat de last_insert_rowid:", result);

      let gameId;
      if (result && result.length > 0) {
        if (Array.isArray(result[0])) {
          gameId = result[0][0];
        } else {
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


// Permet à un utilisateur de rejoindre une partie existante en attente
export const joinGame = async (ctx: Context) => {
  try {
    const body = await ctx.request.body.json(); 
    const gameId = parseInt(body.gameId);
    const userId = ctx.state.user.id;
    
    console.log("Tentative de rejoindre la partie:", { gameId, userId });

    if (!gameId || isNaN(gameId)) {
      ctx.response.status = 400;
      ctx.response.body = { error: "ID de partie invalide" };
      return;
    }

    const game = await db.query("SELECT * FROM games WHERE id = ?", [gameId]);
    
    if (!game || game.length === 0) {
      console.log("Partie non trouvée:", gameId);
      ctx.response.status = 404;
      ctx.response.body = { error: "Partie introuvable" };
      return;
    }

    const gameData = game[0];
    
    if (gameData[3] !== 'waiting') {
      console.log("Partie non disponible, statut:", gameData[3]);
      ctx.response.status = 400;
      ctx.response.body = { error: "La partie n'est pas disponible" };
      return;
    }

    if (gameData[1] === userId) {
      console.log("Le joueur est déjà dans la partie");
      ctx.response.status = 400;
      ctx.response.body = { error: "Vous êtes déjà dans cette partie" };
      return;
    }

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

// Récupère les détails d'une partie spécifique
export const getGameDetails = async (ctx: Context) => {
  try {
    const userId = ctx.state.user.id;
    const gameId = ctx.request.url.searchParams.get("id");

    console.log("getGameDetails - userId:", userId);
    console.log("getGameDetails - gameId:", gameId);

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

// Effectue un tir à une position donnée et gère les conséquences (toucher, couler, gagner)
export const makeShot = async (ctx: Context) => {
  try {
    const userId = ctx.state.user.id;
    const body = await ctx.request.body.json(); 
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
    
    if (game[3] !== "in_progress") {
      ctx.response.status = 400;
      ctx.response.body = { message: "La partie n'est pas en cours" };
      return;
    }
    
    if (game[1] !== userId && game[2] !== userId) {
      ctx.response.status = 403;
      ctx.response.body = { message: "Vous n'êtes pas un joueur de cette partie" };
      return;
    }

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

    // Requête pour détecter si un navire est touché à cette position
    const ships = await db.query(
      "SELECT * FROM ships WHERE game_id = ? AND user_id = ? AND x_position <= ? AND x_position + (CASE WHEN orientation = 'horizontal' THEN size - 1 ELSE 0 END) >= ? AND y_position <= ? AND y_position + (CASE WHEN orientation = 'vertical' THEN size - 1 ELSE 0 END) >= ?",
      [gameId, opponentId, x_position, x_position, y_position, y_position]
    );

    let isHit = false;
    let shipId = null;

    if (ships.length > 0) {
      isHit = true;
      shipId = ships[0][0];
      
      const hits = await db.query(
        "SELECT COUNT(*) as hit_count FROM shots WHERE game_id = ? AND ship_id = ? AND is_hit = TRUE",
        [gameId, shipId]
      );
      
      // +1 pour inclure le tir actuel
      const hitCount = hits[0][0] + 1;
      
      if (hitCount >= ships[0][7]) {
        await db.query(
          "UPDATE ships SET is_sunk = TRUE WHERE id = ?",
          [shipId]
        );
        
        await db.query(
          "UPDATE stats SET ships_sunk = ships_sunk + 1 WHERE user_id = ?",
          [userId]
        );
      }
    }

    await db.query(
      "INSERT INTO shots (game_id, user_id, x_position, y_position, is_hit, ship_id) VALUES (?, ?, ?, ?, ?, ?)",
      [gameId, userId, x_position, y_position, isHit, shipId]
    );
    
    await db.query(
      "UPDATE stats SET total_shots = total_shots + 1, hits = hits + ? WHERE user_id = ?",
      [isHit ? 1 : 0, userId]
    );
    
    const remainingShips = await db.query(
      "SELECT COUNT(*) as count FROM ships WHERE game_id = ? AND user_id = ? AND is_sunk = FALSE",
      [gameId, opponentId]
    );
    
    if (remainingShips[0][0] === 0) {
      await db.query(
        "UPDATE games SET status = 'finished', winner_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [userId, gameId]
      );
      
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

// Récupère les parties actives (non terminées) de l'utilisateur
export const getActiveGames = async (ctx: Context) => {
  try {
    const userId = ctx.state.user.id;
    
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

// Récupère les parties disponibles à rejoindre pour l'utilisateur
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

// Gère l'abandon d'une partie par un joueur, donnant la victoire à l'adversaire
export const abandonGame = async (ctx: Context) => {
  try {
    const userId = ctx.state.user.id;
    const body = await ctx.request.body.json(); 
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

// Marque un joueur comme prêt et démarre la partie si les deux joueurs sont prêts
export const setPlayerReady = async (ctx: Context) => {
  try {
    const userId = ctx.state.user.id;
    const body = await ctx.request.body.json();
    const { gameId } = body;

    const playerShips = await db.query(
      "SELECT COUNT(*) as count FROM ships WHERE game_id = ? AND user_id = ?",
      [gameId, userId]
    );

    if (playerShips[0][0] !== 5) {
      ctx.response.status = 400;
      ctx.response.body = { 
        error: "Vous devez placer tous vos navires avant d'être prêt"
      };
      return;
    }

    const games = await db.query(
      "SELECT * FROM games WHERE id = ?",
      [gameId]
    );

    if (games.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = { error: "Partie non trouvée" };
      return;
    }

    const game = games[0];
    const player1Id = game[1];
    const player2Id = game[2];

    const player1Ships = await db.query(
      "SELECT COUNT(*) as count FROM ships WHERE game_id = ? AND user_id = ?",
      [gameId, player1Id]
    );

    // Initialisation avec valeur par défaut en cas d'absence de second joueur
    let player2Ships = { 0: { 0: 0 } };
    if (player2Id) {
      player2Ships = await db.query(
        "SELECT COUNT(*) as count FROM ships WHERE game_id = ? AND user_id = ?",
        [gameId, player2Id]
      );
    }

    if (player1Ships[0][0] === 5 && player2Ships[0][0] === 5) {
      await db.query(
        "UPDATE games SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [gameId]
      );
      
      ctx.response.status = 200;
      ctx.response.body = { 
        ready: true,
        gameStarted: true,
        message: "Les deux joueurs sont prêts. La partie commence !"
      };
    } else {
      ctx.response.status = 200;
      ctx.response.body = { 
        ready: true,
        gameStarted: false,
        message: "En attente que l'autre joueur place ses navires...",
        player1Ready: player1Ships[0][0] === 5,
        player2Ready: player2Ships[0][0] === 5
      };
    }
  } catch (error) {
    console.error("Erreur setPlayerReady:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
};

// Vérifie si les deux joueurs sont prêts à commencer la partie
export const checkPlayersReady = async (ctx: Context) => {
  try {
    const gameId = ctx.request.url.searchParams.get("gameId");
    
    if (!gameId) {
      ctx.response.status = 400;
      ctx.response.body = { error: "ID de partie requis" };
      return;
    }

    const games = await db.query(
      "SELECT * FROM games WHERE id = ?",
      [gameId]
    );

    if (games.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = { error: "Partie non trouvée" };
      return;
    }

    const game = games[0];
    const player1Id = game[1];
    const player2Id = game[2];
    const currentStatus = game[3];

    if (currentStatus === 'in_progress') {
      ctx.response.status = 200;
      ctx.response.body = { 
        allReady: true,
        gameStarted: true
      };
      return;
    }

    const shipsCount = await db.query(
      `SELECT user_id, COUNT(*) as count 
       FROM ships 
       WHERE game_id = ? AND user_id IN (?, ?)
       GROUP BY user_id`,
      [gameId, player1Id, player2Id]
    );
    
    const playerShips = {};
    shipsCount.forEach(row => {
      playerShips[row[0]] = row[1];
    });

    const player1Ready = (playerShips[player1Id] || 0) === 5;
    const player2Ready = player2Id ? (playerShips[player2Id] || 0) === 5 : false;
    const allReady = player1Ready && player2Ready && player2Id !== null;

    ctx.response.status = 200;
    ctx.response.body = { 
      player1Ready,
      player2Ready,
      allReady,
      allShipsPlaced: allReady, 
      gameStarted: currentStatus === 'in_progress'
    };
  } catch (error) {
    console.error("Erreur checkPlayersReady:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
};


export const startGameManual = async (ctx: Context) => {
  try {
    const body = await ctx.request.body.json();
    const { gameId } = body;
    
    await db.query(
      "UPDATE games SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [gameId]
    );
    
    ctx.response.status = 200;
    ctx.response.body = { success: true, message: "Partie démarrée" };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
};




