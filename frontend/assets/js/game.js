// frontend/assets/js/game.js
let currentGame = null;
let currentShipType = null;
let currentOrientation = 'horizontal';
let placedShips = {
  carrier: false,
  battleship: false,
  cruiser: false,
  submarine: false,
  destroyer: false
};

// Initialisation du jeu
function initializeGame() {
  createBoards();
  setupEventListeners();
  
  // Vérifier s'il y a un jeu en cours ou en démarrer un nouveau
  checkForActiveGame();
}

// Création des grilles de jeu
function createBoards() {
  const playerBoard = document.getElementById('player-board');
  const opponentBoard = document.getElementById('opponent-board');
  
  // Vider les grilles
  playerBoard.innerHTML = '';
  opponentBoard.innerHTML = '';
  
  // Créer les cellules pour les deux grilles
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      // Grille du joueur
      const playerCell = document.createElement('div');
      playerCell.className = 'cell';
      playerCell.id = `player-board-${x}-${y}`;
      playerCell.dataset.x = x;
      playerCell.dataset.y = y;
      playerBoard.appendChild(playerCell);
      
      // Grille de l'adversaire
      const opponentCell = document.createElement('div');
      opponentCell.className = 'cell';
      opponentCell.id = `opponent-board-${x}-${y}`;
      opponentCell.dataset.x = x;
      opponentCell.dataset.y = y;
      opponentBoard.appendChild(opponentCell);
    }
  }
}

// Configuration des écouteurs d'événements
function setupEventListeners() {
  // Bouton de rotation
  const rotateBtn = document.getElementById('rotate-btn');
  rotateBtn.addEventListener('click', () => {
    currentOrientation = currentOrientation === 'horizontal' ? 'vertical' : 'horizontal';
    // Mettre à jour l'affichage visuel si nécessaire
  });
  
  // Bouton prêt
  const readyBtn = document.getElementById('ready-btn');
  readyBtn.addEventListener('click', finalizeShipPlacement);
  
  // Écouteurs pour les navires à placer
  const shipItems = document.querySelectorAll('.ship-item');
  shipItems.forEach(ship => {
    ship.addEventListener('click', () => {
      if (!ship.classList.contains('placed')) {
        currentShipType = ship.dataset.ship;
        // Mettre à jour l'interface pour montrer le navire sélectionné
        
        shipItems.forEach(s => s.classList.remove('selected'));
        ship.classList.add('selected');
      }
    });
  });
  
  // Écouteurs pour la grille du joueur (placement des navires)
  const playerCells = document.querySelectorAll('#player-board.cell');
  playerCells.forEach(cell => {
    cell.addEventListener('click', () => {
      if (currentShipType && !placedShips[currentShipType]) {
        const x = parseInt(cell.dataset.x);
        const y = parseInt(cell.dataset.y);
        const size = getShipSize(currentShipType);
        
        // Vérifier si le placement est valide avant de dessiner
        if (isValidPlacement(x, y, size, currentOrientation)) {
          drawShip('player-board', x, y, size, currentOrientation);
          
          // Marquer le navire comme placé
          const shipElement = document.querySelector(`.ship-item[data-ship="${currentShipType}"]`);
          shipElement.classList.add('placed');
          placedShips[currentShipType] = {
            type: currentShipType,
            x: x,
            y: y,
            orientation: currentOrientation
          };
          
          // Envoyer au serveur
          if (currentGame) {
            placeShip(currentGame.gameId, currentShipType, x, y, currentOrientation);
          }
          
          currentShipType = null;
          shipElement.classList.remove('selected');
          
          // Activer le bouton "Prêt" si tous les navires sont placés
          checkAllShipsPlaced();
        } else {
          alert("Placement invalide! Le navire sort de la grille ou chevauche un autre navire.");
        }
      }
    });
  });
  
  // Écouteurs pour la grille adversaire (tirs)
  const opponentCells = document.querySelectorAll('#opponent-board .cell');
  opponentCells.forEach(cell => {
    cell.addEventListener('click', async () => {
      if (currentGame && currentGame.status === 'in_progress') {
        const x = parseInt(cell.dataset.x);
        const y = parseInt(cell.dataset.y);
        
        // Éviter de tirer deux fois au même endroit
        if (!cell.classList.contains('hit') && !cell.classList.contains('miss')) {
          const result = await makeShot(currentGame.gameId, x, y);
          
          if (result.hit) {
            cell.classList.add('hit');
            // Afficher un message
            addGameMessage("Touché!");
          } else {
            cell.classList.add('miss');
            addGameMessage("Raté!");
          }
          
          // Mettre à jour l'état du jeu
          updateGameState();
        }
      }
    });
  });
  
  // Bouton d'envoi de message
  const sendMessageBtn = document.getElementById('send-message');
  sendMessageBtn.addEventListener('click', () => {
    const messageInput = document.getElementById('message-input');
    if (messageInput.value.trim()) {
      sendChatMessage(messageInput.value);
      messageInput.value = '';
    }
  });
}

// Vérifier si un placement de navire est valide
function isValidPlacement(x, y, size, orientation) {
  // Vérifier que le navire reste dans la grille
  if (orientation === 'horizontal' && x + size > 10) return false;
  if (orientation === 'vertical' && y + size > 10) return false;
  
  // Vérifier qu'il ne chevauche pas d'autres navires
  for (let i = 0; i < size; i++) {
    let checkX = x;
    let checkY = y;
    
    if (orientation === 'horizontal') {
      checkX += i;
    } else {
      checkY += i;
    }
    
    const cellId = `player-board-${checkX}-${checkY}`;
    const cell = document.getElementById(cellId);
    
    if (cell && cell.classList.contains('ship')) {
      return false;
    }
  }
  
  return true;
}

// Obtenir la taille d'un navire par son type
function getShipSize(type) {
  switch (type) {
    case 'carrier': return 5;
    case 'battleship': return 4;
    case 'cruiser': return 3;
    case 'submarine': return 3;
    case 'destroyer': return 2;
    default: return 0;
  }
}

// Vérifier si tous les navires sont placés
function checkAllShipsPlaced() {
  const allPlaced = Object.values(placedShips).every(ship => ship !== false);
  
  const readyBtn = document.getElementById('ready-btn');
  readyBtn.disabled = !allPlaced;
  
  return allPlaced;
}

// Finaliser le placement des navires
async function finalizeShipPlacement() {
  if (currentGame && checkAllShipsPlaced()) {
    // Mettre à jour l'état du jeu pour indiquer que le joueur est prêt
    document.getElementById('status-message').textContent = "En attente que l'adversaire place ses navires...";
    document.getElementById('game-setup').classList.remove('active-phase');
    document.getElementById('game-setup').classList.add('hidden');
    
    // Afficher la grille de l'adversaire
    document.getElementById('opponent-board').classList.remove('hidden');
    
    // Mettre à jour l'état du jeu
    updateGameState();
  }
}

// Vérifier s'il y a un jeu actif ou en créer un nouveau
async function checkForActiveGame() {
  // Si l'ID du jeu est dans l'URL, rejoindre ce jeu
  const urlParams = new URLSearchParams(window.location.search);
  const gameId = urlParams.get('game');
  
  if (gameId) {
    // Rejoindre la partie existante
    const result = await joinGame(gameId);
    if (!result.error) {
      currentGame = {
        gameId: gameId,
        status: 'setup'
      };
      
      document.getElementById('game-id').textContent = gameId;
      document.getElementById('status-message').textContent = "Placez vos navires";
    } else {
      alert(result.message || "Impossible de rejoindre la partie.");
      // Rediriger vers la page d'accueil des jeux
      window.location.href = "game.html";
    }
  } else {
    // Créer une nouvelle partie
    const result = await createGame();
    if (!result.error) {
      currentGame = {
        gameId: result.gameId,
        status: 'waiting'
      };
      
      document.getElementById('game-id').textContent = result.gameId;
      document.getElementById('status-message').textContent = "En attente d'un adversaire... Partagez ce lien : " + window.location.href + "?game=" + result.gameId;
      
      // Masquer la grille de placement jusqu'à ce qu'un adversaire rejoigne
      document.getElementById('game-setup').classList.add('hidden');
      
      // Vérifier périodiquement si un adversaire a rejoint
      checkForOpponent();
    } else {
      alert(result.message || "Impossible de créer une partie.");
    }
  }
}

// Vérifier si un adversaire a rejoint la partie
async function checkForOpponent() {
  if (currentGame) {
    const gameDetails = await getGameDetails(currentGame.gameId);
    
    if (gameDetails.game && gameDetails.game.status !== 'waiting') {
      // Un adversaire a rejoint, passer à la phase de placement
      currentGame.status = gameDetails.game.status;
      
      document.getElementById('status-message').textContent = "Un adversaire a rejoint! Placez vos navires.";
      document.getElementById('game-setup').classList.remove('hidden');
      document.getElementById('game-setup').classList.add('active-phase');
    } else {
      // Vérifier à nouveau après un délai
      setTimeout(checkForOpponent, 5000);
    }
  }
}

// Mettre à jour l'état du jeu
async function updateGameState() {
  if (currentGame) {
    const gameDetails = await getGameDetails(currentGame.gameId);
    
    if (gameDetails.game) {
      currentGame.status = gameDetails.game.status;
      
      // Mettre à jour l'interface en fonction de l'état du jeu
      if (gameDetails.game.status === 'in_progress') {
        document.getElementById('status-message').textContent = "Partie en cours";
        document.getElementById('opponent-board').classList.remove('hidden');
        document.getElementById('turn-indicator').classList.remove('hidden');
      } else if (gameDetails.game.status === 'finished') {
        const winner = gameDetails.game.winner_id;
        const userId = JSON.parse(localStorage.getItem('user')).id;
        
        if (winner === userId) {
          document.getElementById('status-message').textContent = "Vous avez gagné!";
        } else {
          document.getElementById('status-message').textContent = "Vous avez perdu.";
        }
        
        document.getElementById('turn-indicator').classList.add('hidden');
      }
    }
  }
}

// Ajouter un message au chat
function addGameMessage(message) {
  const chatMessages = document.getElementById('chat-messages');
  const messageElement = document.createElement('div');
  messageElement.textContent = message;
  chatMessages.appendChild(messageElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Envoyer un message de chat
function sendChatMessage(message) {
  const user = JSON.parse(localStorage.getItem('user'));
  if (user && message) {
    addGameMessage(`${user.username}: ${message}`);
    // Cette fonction pourrait être développée pour envoyer le message via WebSocket
  }
}