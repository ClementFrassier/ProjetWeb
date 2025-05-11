// backend/utils/websocket.ts
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

  // Enregistrer l'association utilisateur-partie
  userGames.set(userId.toString(), gameId);

  // Récupérer ou créer la connexion pour cette partie
  let gameConnection = gameConnections.get(gameId);
  if (!gameConnection) {
    gameConnection = {};
    gameConnections.set(gameId, gameConnection);
  }

  // Déterminer si c'est player1 ou player2
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

  // Mettre à jour les connexions
  gameConnections.set(gameId, gameConnection);

  // Afficher l'état actuel
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
async function handleShot(socket: WebSocket, message: any, gameId: string) {
  const { userId, x, y } = message;
  
  if (!userId || x === undefined || y === undefined) {
    console.error("Données de tir invalides");
    return;
  }

  // Ici, dans une implémentation complète, vous vérifieriez l'état du jeu
  // et détermineriez si le tir a touché ou non
  const hit = Math.random() > 0.5; // Pour l'exemple
  const sunk = hit && Math.random() > 0.7; // Pour l'exemple

  // Déterminer l'autre joueur
  const gameConnection = gameConnections.get(gameId);
  if (!gameConnection) return;

  const isPlayer1 = gameConnection.player1 === socket;
  const otherPlayerSocket = isPlayer1 ? gameConnection.player2 : gameConnection.player1;

  // Informer l'autre joueur du tir
  if (otherPlayerSocket) {
    try {
      otherPlayerSocket.send(JSON.stringify({
        type: "shot",
        x: x,
        y: y,
        hit: hit,
        sunk: sunk
      }));
    } catch (error) {
      console.error("Erreur lors de l'envoi du résultat de tir:", error);
    }
  }

  // Informer le tireur du résultat
  try {
    socket.send(JSON.stringify({
      type: "shot_result",
      x: x,
      y: y,
      hit: hit,
      sunk: sunk
    }));

    // C'est au tour de l'autre joueur maintenant
    if (otherPlayerSocket) {
      otherPlayerSocket.send(JSON.stringify({
        type: "your_turn"
      }));
    }
  } catch (error) {
    console.error("Erreur lors de l'envoi du résultat au tireur:", error);
  }
}

// Fonction utilitaire pour diffuser un message à tous les joueurs d'une partie
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
      gameConnection.player1 = undefined; // Nettoyer la connexion défaillante
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
      
      // Trouver l'userId correspondant
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
      
      // Trouver l'userId correspondant
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