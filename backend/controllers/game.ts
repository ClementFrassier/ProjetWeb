import { Context } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { db } from "../config/db.ts";

export const startGame = async (ctx: Context) => {
  try {
    const userId = ctx.state.user.id;

    // 1. Démarrer une transaction
    await db.query("BEGIN");

    // 2. Insérer la nouvelle partie
    await db.query(
      "INSERT INTO games (player1_id, status) VALUES (?, 'waiting')",
      [userId]
    );

    // 3. Récupérer le dernier ID inséré (spécifique à SQLite)
    const [result] = await db.query(
      "SELECT last_insert_rowid() as id"
    );

    const gameId = result.id;

    if (!gameId) {
      await db.query("ROLLBACK");
      throw new Error("Échec de la création de partie");
    }

    // 4. Valider la transaction
    await db.query("COMMIT");

    ctx.response.status = 201;
    ctx.response.body = { 
      success: true,
      gameId: gameId,
      message: "Partie créée avec succès"
    };

  } catch (error) {
    await db.query("ROLLBACK");
    console.error("Erreur création partie:", error);
    ctx.response.status = 500;
    ctx.response.body = { 
      success: false,
      error: error.message,
      details: "Échec de la création de partie"
    };
  }
};
export const joinGame  = async (ctx: Context) => {
  try{
    const userId = ctx.state.user.id;

    const body = await ctx.request.body().value;
    const { gameId } = body

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

    if (game.status !== "waiting") {
      ctx.response.status = 400;
      ctx.response.body = { message: "Cette partie n'est pas disponible" };
      return;
    }

    if (game.player1_id === userId) {
      ctx.response.status = 400;
      ctx.response.body = { message: "Vous ne pouvez pas rejoindre votre propre partie" };
      return;
    }

    await db.query(
      "UPDATE games SET player2_id = ?, status = 'setup', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [userId, gameId]
    );

    ctx.response.status = 200;
    ctx.response.body = { 
      message: "Partie rejointe avec succès", 
      gameId: gameId 
    };
  }catch (error) {
      ctx.response.status = 500;
      ctx.response.body = { message: "Erreur serveur", error: error.message };
    }
};

export const getGameDetails = async (ctx: Context) => {
  try {
    const userId = ctx.state.user.id;
    const gameId = ctx.request.url.searchParams.get("id");

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
      "SELECT id, player1_id, player2_id, status, winner_id, created_at, updated_at FROM games WHERE id = ?",
      [gameId]
    );

    if (games.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = { 
        error: "Partie non trouvée",
        gameId: gameId
      };
      return;
    }
    
    const game = games[0];
    
    if (game.player1_id !== userId && game.player2_id !== userId) {
      ctx.response.status = 403;
      ctx.response.body = { error: "Accès refusé" };
      return;
    }

    // Retourner un objet structuré
    ctx.response.status = 200;
    ctx.response.body = {
      game: {
        id: game.id,
        player1_id: game.player1_id,
        player2_id: game.player2_id,
        status: game.status, // Le statut est déjà une string
        winner_id: game.winner_id,
        created_at: game.created_at,
        updated_at: game.updated_at
      }
    };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { 
      error: "Erreur serveur",
      details: error.message 
    };
  }
};



export const makeShot = async (ctx: Context) => {
  try{
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
    if (game.status !== "in_progress") {
      ctx.response.status = 400;
      ctx.response.body = { message: "La partie n'est pas en cours" };
      return;
    }
    
    // Vérifier que l'utilisateur est bien un joueur de cette partie
    if (game.player1_id !== userId && game.player2_id !== userId) {
      ctx.response.status = 403;
      ctx.response.body = { message: "Vous n'êtes pas un joueur de cette partie" };
      return;
    }

    // Déterminer l'adversaire
    let opponentId = null;
    if (game.player1_id === userId) {
      opponentId = game.player2_id;
    } else {
      opponentId = game.player1_id;
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
      shipId = ships[0].id;
      
      // Vérifier si le navire est coulé après ce tir
      const hits = await db.query(
        "SELECT COUNT(*) as hit_count FROM shots WHERE game_id = ? AND ship_id = ? AND is_hit = TRUE",
        [gameId, shipId]
      );
      
      // +1 pour inclure le tir actuel
      const hitCount = hits[0].hit_count + 1;
      
      if (hitCount >= ships[0].size) {
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
    
    if (remainingShips[0].count === 0) {
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
  try{
    const userId = ctx.state.user.id;
    
    // CHANGEMENT ICI : on récupère uniquement les parties où l'utilisateur est impliqué
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
  try{
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
  try{
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

    if (game.player1_id !== userId && game.player2_id !== userId) {
      ctx.response.status = 403;
      ctx.response.body = { message: "Vous n'êtes pas un joueur de cette partie" };
      return;
    }

    var winnerId=null;
    var loserId=null;
    if(game.player1_id==userId){
      winnerId=game.player2_id
      loserId=game.player1_id;
    }
    else{
      winnerId=game.player1_id
      loserId=game.player2_id;
    }

    await db.query(
      "UPDATE games SET status = 'finished', updated_at = CURRENT_TIMESTAMP,winner_id=? WHERE id = ?",
      [winnerId,gameId]
    );

    await db.query(
      "UPDATE stats SET games_played = games_played+1, games_won=games_won+1 WHERE user_id = ?",
      [winnerId]
    );

    await db.query(
      "UPDATE stats SET games_played = games_played+1 WHERE user_id = ?",
      [loserId]
    );

    ctx.response.status = 201;
    ctx.response.body = { message: "Partie finit" };


  }catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur serveur", error: error.message };
  }
};