import { db } from "../config/db.ts";

// Structure pour stocker les connexions websocket actives
interface GameConnection {
  player1?: WebSocket;
  player2?: WebSocket;
}

// Map pour stocker les connexions par ID de partie
const gameConnections: Map<string, GameConnection> = new Map();

// Map pour stocker les associations utilisateur-partie
const userGames: Map<string, string> = new Map();

// Gestionnaire principal de websocket
export async function handleWebSocket(socket: WebSocket, gameId: string) {
  console.log(`Nouvelle connexion WebSocket pour la partie ${gameId}`);

  try {
    // Configurer les gestionnaires d'événements
    socket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        await handleMessage(socket, data, gameId);
      } catch (error) {
        console.error("Erreur parse message:", error);
      }
    };

    socket.onclose = async () => {
      console.log(`WebSocket fermé pour la partie ${gameId}`);
      await handleDisconnect(socket, gameId);
    };

    socket.onerror = (error) => {
      console.error("Erreur WebSocket:", error);
    };

  } catch (error) {
    console.error("Erreur configuration WebSocket:", error);
  }
}

// Gérer les différents types de messages
async function handleMessage(socket: WebSocket, message: any, gameId: string) {
  console.log(`Message reçu pour partie ${gameId}:`, message);
  
  switch (message.type) {
    case "join":
      await handleJoin(socket, message, gameId);
      break;
    case "shot":
      await handleShot(socket, message, gameId);
      break;
    case "chat":
      await handleChat(socket, message, gameId);
      break;
    default:
      console.log(`Message de type inconnu: ${message.type}`);
  }
}

// Gérer l'action de rejoindre une partie
async function handleJoin(socket: WebSocket, message: any, gameId: string) {
  const { userId } = message;
  console.log("Join request:", { gameId, userId });
  
  if (!userId) {
    console.error("userId manquant dans message join");
    return;
  }

  userGames.set(userId.toString(), gameId);

  // Récupérer ou créer la connexion pour cette partie
  let gameConnection = gameConnections.get(gameId);
  if (!gameConnection) {
    gameConnection = {};
    gameConnections.set(gameId, gameConnection);
  }

  const gameInfo = await db.query(
    "SELECT player1_id, player2_id FROM games WHERE id = ?",
    [gameId]
  );

  if (gameInfo.length > 0) {
    const player1Id = gameInfo[0][0];
    const player2Id = gameInfo[0][1];

    console.log("GameInfo from DB:", { player1Id, player2Id, userId });

    if (userId == player1Id) {
      gameConnection.player1 = socket;
      console.log(`Joueur 1 (ID: ${userId}) connecté à la partie ${gameId}`);
    } else if (userId == player2Id) {
      gameConnection.player2 = socket;
      console.log(`Joueur 2 (ID: ${userId}) connecté à la partie ${gameId}`);
    } else {
      console.log(`Joueur ${userId} n'est pas dans la partie ${gameId}`);
      return;
    }
  }

  gameConnections.set(gameId, gameConnection);

  console.log("État actuel des connexions:", {
    gameId: gameId,
    player1: gameConnection.player1 ? "connecté" : "non connecté",
    player2: gameConnection.player2 ? "connecté" : "non connecté"
  });

  // Notifier les autres joueurs (sans inclure l'émetteur)
  broadcastToGame(gameId, {
    type: "game_joined",
    userId: userId,
    username: `Joueur ${userId}`,
    message: `Joueur ${userId} a rejoint la partie`
  }, socket);
}

// Gérer les messages de chat
async function handleChat(socket: WebSocket, message: any, gameId: string) {
  const { userId, message: chatMessage } = message;
  console.log(`Chat reçu de ${userId}: ${chatMessage}`);
  
  if (!userId || !chatMessage) {
    console.error("Données manquantes:", { userId, chatMessage });
    return;
  }

  // Créer un message avec username basé sur le userId
  const broadcastMessage = {
    type: "chat",
    userId: userId,
    username: `Joueur ${userId}`,
    message: chatMessage,
    timestamp: new Date().toISOString()
  };

  // Diffuser le message à tous les joueurs de la partie SAUF l'émetteur
  broadcastToGame(gameId, broadcastMessage, socket);
}

// Gérer un tir
async function handleShot(socket, message, gameId) {
  const { userId, x, y } = message;
  
  if (!userId || x === undefined || y === undefined) {
    console.error("Données de tir invalides");
    return;
  }

  try {
    // Déterminer l'autre joueur
    const gameConnection = gameConnections.get(gameId);
    if (!gameConnection) return;

    const isPlayer1 = gameConnection.player1 === socket;
    const otherPlayerSocket = isPlayer1 ? gameConnection.player2 : gameConnection.player1;
    
    const gameInfo = await db.query(
      "SELECT player1_id, player2_id FROM games WHERE id = ?",
      [gameId]
    );
    
    if (gameInfo.length === 0) {
      console.error("Partie introuvable");
      return;
    }
    
    const player1Id = gameInfo[0][0];
    const player2Id = gameInfo[0][1];
    const opponentId = isPlayer1 ? player2Id : player1Id;
    
    if (!opponentId) {
      console.error("Adversaire introuvable");
      return;
    }
    
    // Vérifier si un navire est touché à cette position
    const ships = await db.query(
      `SELECT * FROM ships WHERE game_id = ? AND user_id = ? AND (
        (orientation = 'horizontal' AND y_position = ? AND x_position <= ? AND x_position + size - 1 >= ?) OR
        (orientation = 'vertical' AND x_position = ? AND y_position <= ? AND y_position + size - 1 >= ?)
      )`,
      [gameId, opponentId, y, x, x, x, y, y]
    );
    
    let hit = false;
    let shipId = null;
    let sunk = false;
    
    if (ships.length > 0) {
      hit = true;
      shipId = ships[0][0];
      
      // Vérifier les tirs précédents sur ce navire
      const hits = await db.query(
        "SELECT COUNT(*) as hit_count FROM shots WHERE game_id = ? AND ship_id = ? AND is_hit = TRUE",
        [gameId, shipId]
      );
      
      // +1 pour inclure le tir actuel
      const hitCount = hits[0][0] + 1;
      
      if (hitCount >= ships[0][7]) {
        sunk = true;
        
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
      [gameId, userId, x, y, hit, shipId]
    );
    
    await db.query(
      "UPDATE stats SET total_shots = total_shots + 1, hits = hits + ? WHERE user_id = ?",
      [hit ? 1 : 0, userId]
    );

    // Informer l'autre joueur du tir
    if (otherPlayerSocket && otherPlayerSocket.readyState === WebSocket.OPEN) {
      otherPlayerSocket.send(JSON.stringify({
        type: "shot",
        x: x,
        y: y,
        hit: hit,
        sunk: sunk
      }));
    }

    // Informer le tireur du résultat
    socket.send(JSON.stringify({
      type: "shot_result",
      x: x,
      y: y,
      hit: hit,
      sunk: sunk
    }));

    // Vérifier si tous les navires sont coulés
    if (hit) {
      const remainingShips = await db.query(
        "SELECT COUNT(*) as count FROM ships WHERE game_id = ? AND user_id = ? AND is_sunk = FALSE",
        [gameId, opponentId]
      );
      
      console.log("Navires restants:", remainingShips[0][0]);
      
      if (remainingShips[0][0] === 0) {
        console.log("PARTIE TERMINÉE - Victoire pour le joueur", userId);
        
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
        
        const gameOverMsg = {
          type: "game_over",
          winner: userId
        };
        
        socket.send(JSON.stringify(gameOverMsg));
        if (otherPlayerSocket && otherPlayerSocket.readyState === WebSocket.OPEN) {
          otherPlayerSocket.send(JSON.stringify(gameOverMsg));
        }
        
        return;
      }
    }

    if (otherPlayerSocket && otherPlayerSocket.readyState === WebSocket.OPEN) {
      otherPlayerSocket.send(JSON.stringify({
        type: "your_turn"
      }));
    }
    
  } catch (error) {
    console.error("Erreur lors du traitement du tir:", error);
  }
}
// Fonction pour diffuser un message à tous les joueurs d'une partie
function broadcastToGame(gameId: string, message: any, excludeSocket?: WebSocket) {
  const gameConnection = gameConnections.get(gameId);
  console.log(`Broadcasting to game ${gameId}:`, message);
  
  if (!gameConnection) {
    console.error(`Aucune connexion trouvée pour la partie ${gameId}`);
    return;
  }

  const jsonMessage = JSON.stringify(message);

  // Envoyer à player1 si ce n'est pas l'émetteur
  if (gameConnection.player1 && gameConnection.player1 !== excludeSocket && gameConnection.player1.readyState === WebSocket.OPEN) {
    try {
      console.log("Envoi au joueur 1");
      gameConnection.player1.send(jsonMessage);
    } catch (error) {
      console.error("Erreur d'envoi au joueur 1:", error);
      gameConnection.player1 = undefined; 
    }
  }

  // Envoyer à player2 si ce n'est pas l'émetteur
  if (gameConnection.player2 && gameConnection.player2 !== excludeSocket && gameConnection.player2.readyState === WebSocket.OPEN) {
    try {
      console.log("Envoi au joueur 2");
      gameConnection.player2.send(jsonMessage);
    } catch (error) {
      console.error("Erreur d'envoi au joueur 2:", error);
      gameConnection.player2 = undefined; // Nettoyer la connexion défaillante
    }
  }
}

// Gérer les déconnexions
async function handleDisconnect(socket: WebSocket, gameId: string) {
  const gameConnection = gameConnections.get(gameId);
  
  if (gameConnection) {
    let disconnectedUserId: string | null = null; 
    
    // Déterminer qui s'est déconnecté
    if (gameConnection.player1 === socket) {
      gameConnection.player1 = undefined;
      console.log("Player1 déconnecté de la partie", gameId);
      
      for (const [userId, gId] of userGames.entries()) {
        if (gId === gameId) {
          const gameInfo = await db.query(
            "SELECT player1_id FROM games WHERE id = ?",
            [gameId]
          );
          if (gameInfo.length > 0 && gameInfo[0][0] == userId) {
            disconnectedUserId = userId;
            break;
          }
        }
      }
    } else if (gameConnection.player2 === socket) {
      gameConnection.player2 = undefined;
      console.log("Player2 déconnecté de la partie", gameId);
      
      for (const [userId, gId] of userGames.entries()) {
        if (gId === gameId) {
          const gameInfo = await db.query(
            "SELECT player2_id FROM games WHERE id = ?",
            [gameId]
          );
          if (gameInfo.length > 0 && gameInfo[0][0] == userId) {
            disconnectedUserId = userId;
            break;
          }
        }
      }
    }

    // Notifier l'autre joueur de la déconnexion
    if (disconnectedUserId) {
      broadcastToGame(gameId, {
        type: "player_disconnected",
        userId: disconnectedUserId,
        message: `Joueur ${disconnectedUserId} s'est déconnecté`
      });
    }

    // Si plus aucun joueur n'est connecté, nettoyer
    if (!gameConnection.player1 && !gameConnection.player2) {
      gameConnections.delete(gameId);
      console.log(`Partie ${gameId} supprimée des connexions actives`);
    }
  }

  // Nettoyer userGames
  for (const [userId, gId] of userGames.entries()) {
    if (gId === gameId) {
      userGames.delete(userId);
    }
  }
}
