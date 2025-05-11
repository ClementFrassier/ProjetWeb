// frontend/assets/js/websocket.js - VERSION CORRIGÉE

// Variable globale pour stocker la connexion WebSocket
let socket = null;
let gameId = null;
let userId = null;

// Vérifier l'état de la connexion
function isWebSocketConnected() {
  return socket && socket.readyState === WebSocket.OPEN;
}

// Fonction pour appeler addChatMessage de manière sûre
function safeAddChatMessage(message) {
  if (typeof window.addChatMessage === 'function') {
    window.addChatMessage(message);
  } else if (typeof addChatMessage === 'function') {
    addChatMessage(message);
  } else {
    console.warn("addChatMessage non disponible, message non affiché:", message);
    // Fallback: essayer d'ajouter directement au DOM
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
      const messageElement = document.createElement('div');
      messageElement.className = 'message';
      const timestamp = new Date().toLocaleTimeString();
      messageElement.textContent = `[${timestamp}] ${message}`;
      chatMessages.appendChild(messageElement);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }
}

// Fonction pour gérer les messages reçus via WebSocket
function handleWebSocketMessage(data) {
  console.log("Message WebSocket reçu:", data);

  switch (data.type) {
    case 'game_joined':
      // Un joueur a rejoint la partie
      safeAddChatMessage(`${data.username || 'Un joueur'} a rejoint la partie.`);
      break;
      
    case 'chat':
      // Message de chat
      console.log("Message chat reçu:", data);
      // Afficher le message seulement si ce n'est pas notre propre message
      if (data.userId && data.userId.toString() !== userId.toString()) {
        safeAddChatMessage(`${data.username || 'Adversaire'}: ${data.message}`);
      }
      break;
      
    case 'shot':
      // L'adversaire a tiré
      handleOpponentShot(data.x, data.y, data.hit, data.sunk);
      break;
      
    case 'shot_result':
      // Résultat de notre tir
      handleShotResult(data.x, data.y, data.hit, data.sunk);
      break;
      
    case 'your_turn':
      // C'est au tour du joueur
      if (typeof window.isMyTurn !== 'undefined') {
        window.isMyTurn = true;
      }
      const turnIndicator = document.getElementById('turn-indicator');
      if (turnIndicator) {
        turnIndicator.textContent = "C'est votre tour";
      }
      break;
      
    case 'game_over':
      // Fin de partie
      const statusMessage = document.getElementById('status-message');
      if (statusMessage) {
        statusMessage.textContent = `Partie terminée! ${data.winner === userId ? 'Vous avez gagné!' : 'Vous avez perdu!'}`;
      }
      if (typeof window.gameStatus !== 'undefined') {
        window.gameStatus = 'finished';
      }
      break;
  }
}

// Fonction pour initialiser la connexion WebSocket
function initWebSocket(currentGameId) {
  // Vérifier si déjà connecté
  if (socket && socket.readyState === WebSocket.OPEN) {
    console.log("WebSocket déjà connecté");
    return;
  }
  
  // Stocker l'ID de la partie
  gameId = currentGameId;
  
  // Récupérer l'ID de l'utilisateur depuis le localStorage
  const user = JSON.parse(localStorage.getItem('user'));
  userId = user ? user.id : null;
  
  if (!userId) {
    console.error("Utilisateur non connecté");
    return;
  }
  
  // URL de connexion WebSocket
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsHost = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;
  const wsUrl = `${wsProtocol}//${wsHost}:3000/ws/game/${gameId}`;
  
  console.log(`Tentative de connexion WebSocket à ${wsUrl}`);
  console.log("GameID:", gameId, "UserID:", userId);
  
  // Créer une nouvelle connexion WebSocket
  socket = new WebSocket(wsUrl);
  
  // Événement: connexion établie
  socket.onopen = () => {
    console.log('Connexion WebSocket établie');
    
    // Envoyer immédiatement le message join
    const joinMessage = { 
      type: 'join',
      gameId: gameId, 
      userId: userId 
    };
    
    console.log("Envoi du message join:", joinMessage);
    socket.send(JSON.stringify(joinMessage));
  };
  
  // Événement: réception d'un message
  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('Message WebSocket reçu:', data);
      handleWebSocketMessage(data);
    } catch (error) {
      console.error('Erreur lors du traitement du message WebSocket:', error);
    }
  };
  
  // Événement: connexion fermée
  socket.onclose = (event) => {
    console.log(`Connexion WebSocket fermée. Code: ${event.code}, Raison: ${event.reason}`);
    
    // Tentative de reconnexion après 5 secondes
    setTimeout(() => {
      if (gameId) {
        console.log('Tentative de reconnexion...');
        initWebSocket(gameId);
      }
    }, 5000);
  };
  
  // Événement: erreur
  socket.onerror = (error) => {
    console.error('Erreur WebSocket:', error);
  };
}

// Fonction pour envoyer un message via WebSocket
function sendWebSocketMessage(type, data) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.error('WebSocket non connecté');
    return;
  }
  
  const message = {
    type: type,
    ...data
  };
  
  socket.send(JSON.stringify(message));
}

// Fonction pour envoyer un tir via WebSocket
function sendShot(x, y) {
  sendWebSocketMessage('shot', {
    gameId: gameId,
    userId: userId,
    x: x,
    y: y
  });
}

// Fonction pour envoyer un message de chat
function sendChatMessage(message) {
  console.log("Envoi du message via WebSocket:", message);
  
  // Vérifier si WebSocket est connecté
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.error("WebSocket non connecté, readyState:", socket?.readyState);
    return;
  }
  
  const currentGameId = gameId || window.currentGameId;
  const currentUserId = userId || getUserId();
  /** 
  if (!currentGameId || !currentUserId) {
    console.error("IDs manquants:", { currentGameId, currentUserId });
    return;
  }*/
  
  const chatData = {
    type : 'chat',
    gameId: currentGameId,
    userId: currentUserId,
    message: message
  };
  
  console.log("Données du chat à envoyer:", chatData);
  sendWebSocketMessage('chat', chatData);
  
  // Afficher notre propre message immédiatement
  safeAddChatMessage(`Vous: ${message}`);
}

// Fonction d'assistance pour obtenir l'ID utilisateur
function getUserId() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return user.id || null;
}

// Gérer le tir de l'adversaire
function handleOpponentShot(x, y, hit, sunk) {
  const cellId = `player-board-${x}-${y}`;
  const cell = document.getElementById(cellId);
  
  if (cell) {
    if (hit) {
      cell.classList.add('hit');
      safeAddChatMessage(`L'adversaire a touché un de vos navires en (${x},${y})!`);
      
      if (sunk) {
        safeAddChatMessage(`L'adversaire a coulé un de vos navires!`);
      }
    } else {
      cell.classList.add('miss');
      safeAddChatMessage(`Le tir de l'adversaire en (${x},${y}) a manqué.`);
    }
  }
  
  // Après le tir de l'adversaire, c'est notre tour
  if (typeof window.isMyTurn !== 'undefined') {
    window.isMyTurn = true;
  }
  const turnIndicator = document.getElementById('turn-indicator');
  if (turnIndicator) {
    turnIndicator.textContent = "C'est votre tour";
  }
}

// Gérer le résultat de notre tir
function handleShotResult(x, y, hit, sunk) {
  const cellId = `opponent-board-${x}-${y}`;
  const cell = document.getElementById(cellId);
  
  if (cell) {
    if (hit) {
      cell.classList.add('hit');
      safeAddChatMessage(`Votre tir en (${x},${y}) a touché un navire ennemi!`);
      
      if (sunk) {
        safeAddChatMessage(`Vous avez coulé un navire ennemi!`);
      }
    } else {
      cell.classList.add('miss');
      safeAddChatMessage(`Votre tir en (${x},${y}) a manqué.`);
    }
  }
  
  // Après notre tir, c'est le tour de l'adversaire
  if (typeof window.isMyTurn !== 'undefined') {
    window.isMyTurn = false;
  }
  const turnIndicator = document.getElementById('turn-indicator');
  if (turnIndicator) {
    turnIndicator.textContent = "Tour de l'adversaire";
  }
}

// Fermer la connexion WebSocket
function closeWebSocket() {
  if (socket) {
    socket.close();
    socket = null;
    gameId = null;
  }
}

// Exposer les fonctions WebSocket globalement
window.initWebSocket = initWebSocket;
window.sendWebSocketMessage = sendWebSocketMessage;
window.sendShot = sendShot;
window.sendChatMessage = sendChatMessage;
window.isWebSocketConnected = isWebSocketConnected;