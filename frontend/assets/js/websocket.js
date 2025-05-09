// frontend/assets/js/websocket.js

// Variable globale pour stocker la connexion WebSocket
let socket = null;
let gameId = null;
let userId = null;

// Fonction pour initialiser la connexion WebSocket
function startGameStatusPolling(gameId) {
  // Vérifier toutes les 3 secondes si la partie est en attente
  const pollInterval = setInterval(async () => {
    if (gameStatus === 'waiting') {
      try {
        const response = await window.getGameDetails(gameId);
        
        if (response?.game) {
          const game = response.game;
          
          // Si un second joueur a rejoint
          if (game.player2_id && game.status === 'setup') {
            clearInterval(pollInterval);
            gameStatus = 'setup';
            
            const statusMessage = document.getElementById('status-message');
            if (statusMessage) {
              statusMessage.textContent = "Un adversaire a rejoint ! Placez vos navires.";
            }
            
            // Activer la phase de placement si pas encore fait
            const gameSetup = document.getElementById('game-setup');
            if (gameSetup) {
              gameSetup.classList.add('active-phase');
            }
          }
        }
      } catch (error) {
        console.error('Erreur lors du polling:', error);
      }
    } else {
      // Arrêter le polling si la partie n'est plus en attente
      clearInterval(pollInterval);
    }
  }, 3000);
}


// Fonction pour initialiser la connexion WebSocket
function initWebSocket(currentGameId) {
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
  const wsUrl = `${wsProtocol}//${window.location.hostname}:3000/ws/game/${gameId}`;
  
  console.log(`Tentative de connexion WebSocket à ${wsUrl}`);
  
  // Créer une nouvelle connexion WebSocket
  socket = new WebSocket(wsUrl);
  
  // Événement: connexion établie
  socket.onopen = () => {
    console.log('Connexion WebSocket établie');
    
    // Envoyer un message pour identifier le joueur
    sendWebSocketMessage('join', { 
      gameId: gameId, 
      userId: userId 
    });
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
  
  // AJOUTER LE POLLING ICI !
  // Démarrer le polling si la partie est en attente
  if (gameStatus === 'waiting') {
    startGameStatusPolling(currentGameId);
  }
}

// Fonction pour gérer les messages reçus via WebSocket
function handleWebSocketMessage(data) {
  switch (data.type) {
    case 'game_joined':
      // Un joueur a rejoint la partie
      addChatMessage(`${data.username || 'Un joueur'} a rejoint la partie.`);
      break;
      
    case 'game_start':
      // La partie commence
      document.getElementById('status-message').textContent = "La partie commence!";
      document.getElementById('opponent-board').classList.remove('hidden');
      gameStatus = 'playing';
      isMyTurn = true; // Le premier joueur commence
      document.getElementById('turn-indicator').textContent = "C'est votre tour";
      document.getElementById('turn-indicator').classList.remove('hidden');
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
      isMyTurn = true;
      document.getElementById('turn-indicator').textContent = "C'est votre tour";
      break;
      
    case 'chat':
      // Message de chat
      addChatMessage(`${data.username || 'Adversaire'}: ${data.message}`);
      break;
      
    case 'game_over':
      // Fin de partie
      document.getElementById('status-message').textContent = `Partie terminée! ${data.winner === userId ? 'Vous avez gagné!' : 'Vous avez perdu!'}`;
      gameStatus = 'finished';
      break;
  }
}

// Fonction pour gérer un tir de l'adversaire
function handleOpponentShot(x, y, hit, sunk) {
  const cellId = `player-board-${x}-${y}`;
  const cell = document.getElementById(cellId);
  
  if (cell) {
    if (hit) {
      cell.classList.add('hit');
      addChatMessage(`L'adversaire a touché un de vos navires en (${x},${y})!`);
      
      if (sunk) {
        addChatMessage(`L'adversaire a coulé un de vos navires!`);
      }
    } else {
      cell.classList.add('miss');
      addChatMessage(`Le tir de l'adversaire en (${x},${y}) a manqué.`);
    }
  }
  
  // Après le tir de l'adversaire, c'est notre tour
  isMyTurn = true;
  document.getElementById('turn-indicator').textContent = "C'est votre tour";
}

// Fonction pour gérer le résultat de notre tir
function handleShotResult(x, y, hit, sunk) {
  const cellId = `opponent-board-${x}-${y}`;
  const cell = document.getElementById(cellId);
  
  if (cell) {
    if (hit) {
      cell.classList.add('hit');
      addChatMessage(`Votre tir en (${x},${y}) a touché un navire ennemi!`);
      
      if (sunk) {
        addChatMessage(`Vous avez coulé un navire ennemi!`);
      }
    } else {
      cell.classList.add('miss');
      addChatMessage(`Votre tir en (${x},${y}) a manqué.`);
    }
  }
  
  // Après notre tir, c'est le tour de l'adversaire
  isMyTurn = false;
  document.getElementById('turn-indicator').textContent = "Tour de l'adversaire";
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
  sendWebSocketMessage('chat', {
    gameId: gameId,
    userId: userId,
    message: message
  });
}

// Fermer la connexion WebSocket
function closeWebSocket() {
  if (socket) {
    socket.close();
    socket = null;
    gameId = null;
  }
}