// backend/utils/websocket.ts
import { WebSocket, isWebSocketCloseEvent } from "https://deno.land/std@0.110.0/ws/mod.ts";
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
    // Ajouter la connexion à la collection
    if (!gameConnections.has(gameId)) {
      gameConnections.set(gameId, {});
    }

    // Attendre les messages du client
    for await (const event of socket) {
      // Gérer la fermeture de la connexion
      if (isWebSocketCloseEvent(event)) {
        console.log(`Connexion WebSocket fermée pour la partie ${gameId}`);
        await handleDisconnect(socket, gameId);
        break;
      }

      // Traiter le message JSON
      if (typeof event === "string") {
        try {
          const message = JSON.parse(event);
          await handleMessage(socket, message);
        } catch (error) {
          console.error("Erreur de traitement du message WebSocket:", error);
        }
      }
    }
  } catch (error) {
    console.error("Erreur WebSocket:", error);
    await handleDisconnect(socket, gameId);
  }
}

// Gérer les différents types de messages
async function handleMessage(socket: WebSocket, message: any) {
  switch (message.type) {
    case "join":
      await handleJoin(socket, message);
      break;
    case "shot":
      await handleShot(socket, message);
      break;
    case "chat":
      await handleChat(socket, message);
      break;
    default:
      console.log(`Message de type inconnu: ${message.type}`);
  }
}

// Gérer les déconnexions
async function handleDisconnect(socket: WebSocket, gameId: string) {
  const game = gameConnections.get(gameId);
  if (game) {
    // Supprimer la connexion spécifique
    if (game.player1 === socket) {
      game.player1 = undefined;
    } else if (game.player2 === socket) {
      game.player2 = undefined;
    }

    // Si les deux joueurs sont déconnectés, nettoyer
    if (!game.player1 && !game.player2) {
      gameConnections.delete(gameId);
    }
  }

  // Nettoyer userGames aussi
  for (const [userId, gameIdValue] of userGames.entries()) {
    if (gameIdValue === gameId) {
      userGames.delete(userId);
    }
  }
}

// Gérer l'action de rejoindre une partie
async function handleJoin(socket: WebSocket, message: any) {
  const { gameId, userId } = message;
  console.log("Join request:", { gameId, userId });
  
  if (!gameId || !userId) return;

  // Enregistrer l'association utilisateur-partie
  userGames.set(userId, gameId);

  let game = gameConnections.get(gameId);
  if (!game) {
    game = {};
    gameConnections.set(gameId, game);
  }

  // Vérifier dans la DB quel est le rôle du joueur
  const gameInfo = await db.query(
    "SELECT player1_id, player2_id FROM games WHERE id = ?",
    [gameId]
  );

  if (gameInfo.length > 0) {
    const player1Id = gameInfo[0][1];
    const player2Id = gameInfo[0][2];

    // Affecter correctement le socket selon l'ID
    if (userId === player1Id) {
      game.player1 = socket;
      console.log(`Joueur 1 (${userId}) a rejoint la partie ${gameId}`);
    } else if (userId === player2Id) {
      game.player2 = socket;
      console.log(`Joueur 2 (${userId}) a rejoint la partie ${gameId}`);
    }
  }

  // Informer du join
  broadcastToGame(gameId, {
    type: "game_joined",
    userId: userId,
    username: `Joueur ${userId}`,
    message: `Un joueur a rejoint la partie ${gameId}`
  });
}
// Gérer un tir
async function handleShot(socket: WebSocket, message: any) {
  const { gameId, userId, x, y } = message;
  if (!gameId || !userId || x === undefined || y === undefined) return;

  // Ici, dans une implémentation complète, vous vérifieriez l'état du jeu
  // et détermineriez si le tir a touché ou non. Pour simplifier, nous
  // allons simuler un résultat aléatoire.

  const hit = Math.random() > 0.5; // 50% de chance de toucher
  const sunk = hit && Math.random() > 0.7; // 30% de chance de couler si touché

  // Déterminer l'autre joueur
  const game = gameConnections.get(gameId);
  if (!game) return;

  const isPlayer1 = game.player1 === socket;
  const otherPlayerSocket = isPlayer1 ? game.player2 : game.player1;

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

    // Dans une implémentation réelle, vous vérifieriez si la partie est terminée
    
    // C'est au tour de l'autre joueur maintenant
    if (otherPlayerSocket) {
      otherPlayerSocket.send(JSON.stringify({
        type: "your_turn"
      }));
    }
  } catch (error) {
    console.error("Erreur lors de l'envoi du résultat de tir au tireur:", error);
  }
}

// Gérer les messages de chat
async function handleChat(socket: WebSocket, message: any) {
  const { gameId, userId, message: chatMessage } = message;
  console.log("Message chat reçu:", { gameId, userId, chatMessage });
  
  if (!gameId || !userId || !chatMessage) {
    console.error("Données manquantes:", { gameId, userId, chatMessage });
    return;
  }

  const game = gameConnections.get(gameId);
  console.log("Connexions pour la partie:", game);
  
  // Diffuser le message à tous les joueurs de la partie
  broadcastToGame(gameId, {
    type: "chat",
    userId: userId,
    username: `Joueur ${userId.substring(0, 5)}...`,
    message: chatMessage
  });
}

// Fonction utilitaire pour diffuser un message à tous les joueurs d'une partie
function broadcastToGame(gameId: string, message: any) {
  const game = gameConnections.get(gameId);
  console.log(`Broadcasting to game ${gameId}:`, message);
  console.log("Current connections:", game);
  
  if (!game) {
    console.error(`Aucune connexion trouvée pour la partie ${gameId}`);
    return;
  }

  const jsonMessage = JSON.stringify(message);

  // Envoyer aux deux joueurs s'ils sont connectés
  if (game.player1) {
    try {
      console.log("Envoi au joueur 1");
      game.player1.send(jsonMessage);
    } catch (error) {
      console.error("Erreur d'envoi au joueur 1:", error);
    }
  }

  if (game.player2) {
    try {
      console.log("Envoi au joueur 2");
      game.player2.send(jsonMessage);
    } catch (error) {
      console.error("Erreur d'envoi au joueur 2:", error);
    }
  }
}
// Fonction pour notifier la fin d'une partie
export function notifyGameOver(gameId: string, winnerId: string) {
  broadcastToGame(gameId, {
    type: "game_over",
    winner: winnerId,
    message: `Joueur ${winnerId.substring(0, 5)}... a gagné la partie!`
  });
}