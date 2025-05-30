let socket = null;
let gameId = null;
let userId = null;
let userName = null;


// Ajoute un message de chat de manière sécurisée
function safeAddChatMessage(message) {  
  if (typeof window.addChatMessage === 'function') {
    window.addChatMessage(message);
  } else if (typeof addChatMessage === 'function') {
    addChatMessage(message);
  } else {
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

// Traite les messages reçus du serveur WebSocket
function handleWebSocketMessage(data) {
  switch (data.type) {
    case 'game_joined':
      safeAddChatMessage(`${data.username || 'Un joueur'} a rejoint la partie.`);
      break;
      
    case 'chat':
      if (data.userId && data.message) {
        const isMyMessage = data.userId.toString() === userId.toString();
        const displayName = isMyMessage ? 'Vous' : (data.username || 'Adversaire');
        safeAddChatMessage(`${displayName}: ${data.message}`);
      }
      break;
      
    case 'shot':
      handleOpponentShot(data.x, data.y, data.hit, data.sunk);
      break;
      
    case 'shot_result':
      handleShotResult(data.x, data.y, data.hit, data.sunk);
      break;
      
    case 'your_turn':
      if (typeof window.isMyTurn !== 'undefined') {
        window.isMyTurn = true;
      }
      const turnIndicator = document.getElementById('turn-indicator');
      if (turnIndicator) {
        turnIndicator.textContent = "C'est votre tour";
      }
      if (window.gameStatus !== 'in_progress') {
        window.gameStatus = 'in_progress';
        const statusMessage = document.getElementById('status-message');
        if (statusMessage) {
          statusMessage.textContent = "Partie en cours";
        }
        
        const opponentBoard = document.getElementById('opponent-board');
        if (opponentBoard) {
          opponentBoard.classList.remove('hidden');
        }
      }
      break;
      
    case 'game_over':
      gameStatus = 'finished';
      window.gameStatus = 'finished';
      
      const statusMessage = document.getElementById('status-message');
      const turnIndicator2 = document.getElementById('turn-indicator');
      
      if (statusMessage) {
        const isWinner = data.winner == userId;
        statusMessage.textContent = isWinner 
          ? "VICTOIRE! Tous les navires ennemis sont coulés!" 
          : "DÉFAITE! Tous vos navires ont été coulés!";
        statusMessage.className = isWinner ? 'victory' : 'defeat';
      }
      
      if (turnIndicator2) {
        turnIndicator2.textContent = "Partie terminée";
      }
      
      const opponentCells = document.querySelectorAll('#opponent-board .cell');
      opponentCells.forEach(cell => {
        cell.style.cursor = 'default';
      });
      
      const gameContainer = document.getElementById('game-container');
      if (gameContainer && !document.querySelector('.back-button')) {
        const backButton = document.createElement('button');
        backButton.textContent = "Retour au lobby";
        backButton.className = 'back-button';
        backButton.onclick = function() { window.location.href = 'lobby.html'; };
        gameContainer.appendChild(backButton);
      }
      
      safeAddChatMessage(">>> Partie terminée <<<");
      break;
      
    case 'player_disconnected':
      safeAddChatMessage(`${data.message || 'Un joueur s\'est déconnecté'}`);
      break;
  }
}

// Initialise la connexion WebSocket pour une partie
function initWebSocket(currentGameId) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    return;
  }
  
  gameId = currentGameId;
  
  const user = JSON.parse(localStorage.getItem('user'));
  userId = user ? user.id : null;
  userName = user ? user.username : null;
  
  if (!userId) {
    return;
  }
  
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsHost = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;
  const wsUrl = `${wsProtocol}//${wsHost}:3000/ws/game/${gameId}`;
    
  socket = new WebSocket(wsUrl);
  
  socket.onopen = () => {
    const joinMessage = { 
      type: 'join',
      gameId: gameId, 
      userId: userId,
      username: userName
    };
    
    socket.send(JSON.stringify(joinMessage));
  };
  
  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    } catch (error) {
    }
  };
  
  socket.onclose = (event) => {
    setTimeout(() => {
      if (gameId) {
        initWebSocket(gameId);
      }
    }, 5000);
  };
}

// Envoie un message via WebSocket
function sendWebSocketMessage(type, data) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return;
  }
  
  const message = {
    type: type,
    ...data
  };
  
  socket.send(JSON.stringify(message));
}

// Envoie un tir à l'adversaire
function sendShot(x, y) {
  sendWebSocketMessage('shot', {
    gameId: gameId,
    userId: userId,
    username: userName,
    x: x,
    y: y
  });
}

// Envoie un message de chat
function sendChatMessage(message) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return;
  }
  
  const currentGameId = gameId || window.currentGameId;
  const currentUserId = userId || getUserId();
  const currentUserName = userName || getUserName();
  
  const chatData = {
    type: 'chat',
    gameId: currentGameId,
    userId: currentUserId,
    username: currentUserName,
    message: message
  };
  
  sendWebSocketMessage('chat', chatData);
  safeAddChatMessage(`Vous: ${message}`);
}

// Récupère l'ID de l'utilisateur connecté
function getUserId() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return user.id || null;
}

// Récupère le nom d'utilisateur connecté
function getUserName() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return user.username || null;
}

// Gère un tir reçu de l'adversaire
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
  
  if (typeof window.isMyTurn !== 'undefined') {
    window.isMyTurn = true;
  }
  const turnIndicator = document.getElementById('turn-indicator');
  if (turnIndicator) {
    turnIndicator.textContent = "C'est votre tour";
  }
}

// Gère le résultat d'un tir effectué
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
  
  if (typeof window.isMyTurn !== 'undefined') {
    window.isMyTurn = false;
  }
  const turnIndicator = document.getElementById('turn-indicator');
  if (turnIndicator) {
    turnIndicator.textContent = "Tour de l'adversaire";
  }
}



// Exposition des fonctions dans l'espace global
window.initWebSocket = initWebSocket;
window.sendWebSocketMessage = sendWebSocketMessage;
window.sendShot = sendShot;
window.sendChatMessage = sendChatMessage;
