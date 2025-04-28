// frontend/assets/js/websocket.js
let socket = null;

// Fonction pour initialiser la connexion WebSocket
function initWebSocket(gameId) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.hostname}:3000/ws?gameId=${gameId}`;
  
  // Fermer la connexion existante si elle existe
  if (socket) {
    socket.close();
  }
  
  socket = new WebSocket(wsUrl);
  
  socket.onopen = () => {
    console.log('Connexion WebSocket établie');
    // Envoyer un message pour rejoindre la salle de jeu spécifique
    sendWSMessage('join', { gameId: gameId });
  };
  
  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleWSMessage(data);
    } catch (error) {
      console.error('Erreur lors du traitement du message WebSocket:', error);
    }
  };
  
  socket.onclose = () => {
    console.log('Connexion WebSocket fermée');
    // Tentative de reconnexion après un délai
    setTimeout(() => {
      if (gameId) {
        initWebSocket(gameId);
      }
    }, 3000);
  };
  
  socket.onerror = (error) => {
    console.error('Erreur WebSocket:', error);
  };
}

// Fonction pour envoyer un message via WebSocket
function sendWSMessage(type, data) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    const message = {
      type: type,
      data: data
    };
    socket.send(JSON.stringify(message));
  }
}

// Fonction pour traiter les messages WebSocket reçus
function handleWSMessage(message) {
  switch (message.type) {
    case 'gameUpdate':
      // Mettre à jour l'état du jeu
      updateGameDisplay(message.data);
      break;
      
    case 'chat':
      // Afficher le message de chat
      if (message.data.username && message.data.message) {
        addGameMessage(`${message.data.username}: ${message.data.message}`);
      }
      break;
      
    case 'shot':
      // Afficher le résultat d'un tir
      handleShotResult(message.data);
      break;
      
    case 'playerJoined':
      // Un joueur a rejoint la partie
      document.getElementById('status-message').textContent = "Un adversaire a rejoint! Placez vos navires.";
      document.getElementById('game-setup').classList.remove('hidden');
      break;
      
    case 'gameStart':
      // La partie commence
      document.getElementById('status-message').textContent = "La partie commence!";
      document.getElementById('opponent-board').classList.remove('hidden');
      break;
  }
}

// Mettre à jour l'affichage du jeu
function updateGameDisplay(gameData) {
  if (gameData.status) {
    // Mettre à jour le statut du jeu
    document.getElementById('status-message').textContent = getStatusMessage(gameData.status);
    
    // Si c'est au tour du joueur
    if (gameData.currentPlayerId === JSON.parse(localStorage.getItem('user')).id) {
      document.getElementById('turn-indicator').textContent = "C'est votre tour";
      document.getElementById('turn-indicator').classList.remove('hidden');
    } else {
      document.getElementById('turn-indicator').textContent = "Tour de l'adversaire";
      document.getElementById('turn-indicator').classList.remove('hidden');
    }
    
    // Si la partie est terminée
    if (gameData.status === 'finished') {
      const isWinner = gameData.winnerId === JSON.parse(localStorage.getItem('user')).id;
      document.getElementById('status-message').textContent = isWinner ? "Vous avez gagné!" : "Vous avez perdu.";
      document.getElementById('turn-indicator').classList.add('hidden');
    }
  }
}

// Obtenir un message basé sur le statut du jeu
function getStatusMessage(status) {
  switch (status) {
    case 'waiting': return "En attente d'un adversaire...";
    case 'setup': return "Placez vos navires";
    case 'in_progress': return "Partie en cours";
    case 'finished': return "Partie terminée";
    default: return "Statut inconnu";
  }
}

// Gérer le résultat d'un tir
function handleShotResult(shotData) {
  if (shotData.playerId === JSON.parse(localStorage.getItem('user')).id) {
    // Votre tir
    const cellId = `opponent-board-${shotData.x}-${shotData.y}`;
    const cell = document.getElementById(cellId);
    
    if (cell) {
      if (shotData.hit) {
        cell.classList.add('hit');
        addGameMessage("Touché!");
      } else {
        cell.classList.add('miss');
        addGameMessage("Raté!");
      }
    }
  } else {
    // Tir de l'adversaire
    const cellId = `player-board-${shotData.x}-${shotData.y}`;
    const cell = document.getElementById(cellId);
    
    if (cell) {
      if (shotData.hit) {
        cell.classList.add('hit');
        addGameMessage("L'adversaire a touché un de vos navires!");
      } else {
        cell.classList.add('miss');
        addGameMessage("L'adversaire a tiré dans l'eau.");
      }
    }
  }
}

// Fonction pour ajouter un message au chat (définie pour être utilisée ici)
function addGameMessage(message) {
  const chatMessages = document.getElementById('chat-messages');
  const messageElement = document.createElement('div');
  messageElement.textContent = message;
  chatMessages.appendChild(messageElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}