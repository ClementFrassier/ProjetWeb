const API_URL = 'http://localhost:3000/api';

// Fonction pour créer une nouvelle partie


// Fonction pour rejoindre une partie existante
async function joinGame(gameId) {
  try {
    const response = await fetch(`${API_URL}/games/join`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ gameId })
    });
    
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la tentative de rejoindre la partie:', error);
    return { error: "Impossible de rejoindre la partie" };
  }
}
// frontend/assets/js/game.js

// Variables globales
let currentGameId = null;
let isMyTurn = false;
let currentOrientation = 'horizontal';
let selectedShipType = null;
let placedShips = [];
let gameStatus = 'setup'; // 'setup', 'playing', 'finished'

// Initialiser le jeu
function initializeGame() {
  createGameBoards();
  setupEventListeners();
  checkForExistingGame();
}

// Vérifier s'il y a une partie en cours
async function checkForExistingGame() {
  try {
    // Récupérer les parties actives de l'utilisateur
    const activeGames = await getActiveGames();
    
    if (activeGames && activeGames.games && activeGames.games.length > 0) {
      // S'il y a une partie active, rejoindre cette partie
      currentGameId = activeGames.games[0].id;
      document.getElementById('game-id').textContent = currentGameId;
      
      // Charger l'état de la partie
      const gameDetails = await getGameDetails(currentGameId);
      if (gameDetails && gameDetails.game) {
        // Restaurer les navires placés
        if (gameDetails.ships && gameDetails.ships.length > 0) {
          restoreShips(gameDetails.ships);
        }
        
        // Initialiser WebSocket
        initWebSocket(currentGameId);
        
        // Vérifier l'état de la partie
        checkGameStatus();
      }
    }
  } catch (error) {
    console.error("Erreur lors de la vérification des parties existantes:", error);
  }
}

// Restaurer les navires placés
function restoreShips(ships) {
  ships.forEach(ship => {
    const shipElement = document.querySelector(`.ship-item[data-ship="${ship.type}"]`);
    if (shipElement) {
      shipElement.classList.add('placed');
      shipElement.classList.remove('selected');
      shipElement.draggable = false;
      
      // Placer visuellement le navire
      placeShipVisually(ship.x, ship.y, ship.size, ship.orientation);
      
      // Ajouter aux navires placés
      placedShips.push({
        type: ship.type,
        x: ship.x,
        y: ship.y,
        size: getShipSize(ship.type),
        orientation: ship.orientation
      });
    }
  });
  
  // Activer le bouton "Prêt" si tous les navires sont placés
  if (placedShips.length === 5) {
    document.getElementById('ready-btn').disabled = false;
  }
}

// Créer les grilles de jeu
function createGameBoards() {
  const playerBoard = document.getElementById('player-board');
  const opponentBoard = document.getElementById('opponent-board');
  
  // Vider les grilles si elles existent déjà
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

// Configurer les écouteurs d'événements
function setupEventListeners() {
  // Événements pour les navires à placer
  const shipItems = document.querySelectorAll('.ship-item');
  shipItems.forEach(ship => {
    ship.addEventListener('click', () => {
      selectedShipType = ship.dataset.ship;
      // Désélectionner les autres navires
      shipItems.forEach(s => s.classList.remove('selected'));
      // Sélectionner ce navire
      ship.classList.add('selected');
    });
  });
  
  // Rotation des navires
  const rotateBtn = document.getElementById('rotate-btn');
  rotateBtn.addEventListener('click', () => {
    currentOrientation = currentOrientation === 'horizontal' ? 'vertical' : 'horizontal';
    rotateBtn.textContent = `Rotation (${currentOrientation})`;
  });
  
  // Placement des navires sur la grille du joueur
  const playerCells = document.querySelectorAll('#player-board .cell');
  playerCells.forEach(cell => {
    cell.addEventListener('click', handleCellClick);
  });
  
  // Tirs sur la grille adversaire
  const opponentCells = document.querySelectorAll('#opponent-board .cell');
  opponentCells.forEach(cell => {
    cell.addEventListener('click', handleShotClick);
  });
  
  // Bouton "Prêt"
  const readyBtn = document.getElementById('ready-btn');
  readyBtn.addEventListener('click', playerReady);
}

// Gestion du clic sur une cellule de la grille du joueur (placement des navires)
function handleCellClick(event) {
  if (gameStatus !== 'setup' || !selectedShipType) return;
  
  const x = parseInt(event.target.dataset.x);
  const y = parseInt(event.target.dataset.y);
  const shipSize = getShipSize(selectedShipType);
  
  // Vérifier si le placement est valide
  if (isValidPlacement(x, y, shipSize, currentOrientation)) {
    // Placer visuellement le navire
    placeShipVisually(x, y, shipSize, currentOrientation);
    
    // Enregistrer le navire placé
    placedShips.push({
      type: selectedShipType,
      x: x,
      y: y,
      size: shipSize,
      orientation: currentOrientation
    });
    
    // Marquer ce navire comme placé
    const shipElement = document.querySelector(`.ship-item[data-ship="${selectedShipType}"]`);
    shipElement.classList.add('placed');
    shipElement.classList.remove('selected');
    shipElement.draggable = false;
    
    // Désélectionner le navire actuel
    selectedShipType = null;
    
    // Activer le bouton "Prêt" si tous les navires sont placés
    if (placedShips.length === 5) {
      document.getElementById('ready-btn').disabled = false;
    }
  } else {
    alert('Placement invalide! Vérifiez que le navire ne dépasse pas de la grille ou ne chevauche pas un autre navire.');
  }
}

// Vérifier si le placement du navire est valide
function isValidPlacement(x, y, size, orientation) {
  // Vérifier les limites de la grille
  if (orientation === 'horizontal') {
    if (x + size > 10) return false;
  } else {
    if (y + size > 10) return false;
  }
  
  // Vérifier si les cases sont déjà occupées
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
    
    if (cell.classList.contains('ship')) {
      return false;
    }
  }
  
  return true;
}

// Placer visuellement un navire sur la grille
function placeShipVisually(x, y, size, orientation) {
  for (let i = 0; i < size; i++) {
    let posX = x;
    let posY = y;
    
    if (orientation === 'horizontal') {
      posX += i;
    } else {
      posY += i;
    }
    
    const cellId = `player-board-${posX}-${posY}`;
    const cell = document.getElementById(cellId);
    cell.classList.add('ship');
  }
}

// Obtenir la taille d'un navire en fonction de son type
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

// Joueur prêt à commencer
async function playerReady() {
  if (placedShips.length !== 5) {
    alert('Vous devez placer tous vos navires avant de commencer!');
    return;
  }
  
  try {
    // Si aucune partie n'est créée, en créer une nouvelle
    if (!currentGameId) {
      const response = await createGame();
      if (response.error) {
        alert(`Erreur: ${response.error}`);
        return;
      }
      currentGameId = response.gameId;
      document.getElementById('game-id').textContent = currentGameId;
      document.getElementById('status-message').textContent = "En attente d'un adversaire...";
    }

    if (currentGameId) {
      // Initialiser la connexion WebSocket
      initWebSocket(currentGameId);
    }
    
    // Envoyer les placements de navires au serveur
    for (const ship of placedShips) {
      const placeResponse = await placeShip(
        currentGameId,
        ship.type,
        ship.x,
        ship.y,
        ship.orientation
      );
      
      if (placeResponse.error) {
        alert(`Erreur lors du placement des navires: ${placeResponse.error}`);
        return;
      }
    }
    
    // Désactiver la phase de préparation
    document.getElementById('game-setup').classList.remove('active-phase');
    document.getElementById('ready-btn').disabled = true;
    
    // Vérifier l'état de la partie
    checkGameStatus();
  } catch (error) {
    console.error("Erreur dans la fonction playerReady:", error);
    alert("Une erreur s'est produite lors de la préparation de la partie.");
  }
}

// Vérifier l'état de la partie
async function checkGameStatus() {
  if (!currentGameId) return;
  
  try {
    const response = await getGameDetails(currentGameId);
    if (response.error) {
      alert(`Erreur: ${response.error}`);
      return;
    }
    
    const game = response.game;
    
    // Mettre à jour l'affichage de l'ID de la partie
    document.getElementById('game-id').textContent = game.id;
    
    // Mettre à jour le statut de la partie
    switch (game.status) {
      case 'waiting':
        document.getElementById('status-message').textContent = "En attente d'un adversaire...";
        gameStatus = 'setup';
        break;
      case 'setup':
        document.getElementById('status-message').textContent = "Placement des navires...";
        gameStatus = 'setup';
        break;
      case 'in_progress':
        document.getElementById('status-message').textContent = "Partie en cours";
        document.getElementById('opponent-board').classList.remove('hidden');
        gameStatus = 'playing';
        checkTurn(game);
        break;
      case 'finished':
        document.getElementById('status-message').textContent = `Partie terminée! ${game.winner_id === getUserId() ? 'Vous avez gagné!' : 'Vous avez perdu!'}`;
        gameStatus = 'finished';
        break;
    }
    
    // Vérifier régulièrement l'état de la partie
    setTimeout(checkGameStatus, 5000);
  } catch (error) {
    console.error("Erreur lors de la vérification du statut de la partie:", error);
  }
}

// Vérifier si c'est le tour du joueur
function checkTurn(game) {
  // Logique simple: player1 commence, puis on alterne
  // Dans une implémentation plus avancée, cela serait géré par le serveur
  const userId = getUserId();
  const isPlayer1 = game.player1_id === userId;
  
  // Pour cet exemple basique, le joueur 1 commence toujours
  isMyTurn = isPlayer1;
  
  const turnIndicator = document.getElementById('turn-indicator');
  if (isMyTurn) {
    turnIndicator.textContent = "C'est votre tour";
    turnIndicator.classList.remove('hidden');
  } else {
    turnIndicator.textContent = "Tour de l'adversaire";
    turnIndicator.classList.remove('hidden');
  }
}

// Gérer un tir sur la grille adversaire
async function handleShotClick(event) {
  if (gameStatus !== 'playing' || !isMyTurn) return;
  
  const x = parseInt(event.target.dataset.x);
  const y = parseInt(event.target.dataset.y);
  
  // Vérifier si cette cellule a déjà été ciblée
  if (event.target.classList.contains('hit') || event.target.classList.contains('miss')) {
    return;
  }
  
  // Envoyer le tir via WebSocket au lieu de l'API REST
  sendShot(x, y);
  
  // Désactiver temporairement le tour du joueur jusqu'à réception de la réponse
  isMyTurn = false;
  document.getElementById('turn-indicator').textContent = "Tour de l'adversaire";
}

// Ajouter un message au chat
function addChatMessage(message) {
  const chatMessages = document.getElementById('chat-messages');
  const messageElement = document.createElement('div');
  messageElement.className = 'message';
  messageElement.textContent = message;
  chatMessages.appendChild(messageElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Obtenir l'ID de l'utilisateur connecté
function getUserId() {
  const user = JSON.parse(localStorage.getItem('user'));
  return user ? user.id : null;
}

// Configurer l'envoi de messages dans le chat
document.addEventListener('DOMContentLoaded', () => {
  const messageInput = document.getElementById('message-input');
  const sendButton = document.getElementById('send-message');
  
  if (sendButton) {
    sendButton.addEventListener('click', () => {
      const message = messageInput.value.trim();
      if (message) {
        // Envoyer le message via WebSocket
        sendChatMessage(message);
        
        // Afficher le message localement
        addChatMessage(`Vous: ${message}`);
        messageInput.value = '';
      }
    });
  }
  
  if (messageInput) {
    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const message = messageInput.value.trim();
        if (message) {
          // Envoyer le message via WebSocket
          sendChatMessage(message);
          
          // Afficher le message localement
          addChatMessage(`Vous: ${message}`);
          messageInput.value = '';
        }
      }
    });
  }
});
// Fonction pour obtenir les détails d'une partie
async function getGameDetails(gameId) {
  try {
    const response = await fetch(`${API_URL}/games/detail?id=${gameId}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la récupération des détails de la partie:', error);
    return { error: "Impossible de récupérer les détails de la partie" };
  }
}

// Fonction pour récupérer les parties actives
async function getActiveGames() {
  try {
    const response = await fetch(`${API_URL}/games/active`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la récupération des parties actives:', error);
    return { error: "Impossible de récupérer les parties actives" };
  }
}

// Fonction pour effectuer un tir
async function makeShot(gameId, x, y) {
  try {
    const response = await fetch(`${API_URL}/games/shot`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        gameId: gameId, 
        x_position: x, 
        y_position: y 
      })
    });
    
    return await response.json();
  } catch (error) {
    console.error('Erreur lors du tir:', error);
    return { error: "Impossible d'effectuer le tir" };
  }
}

// Fonction pour abandonner une partie
async function abandonGame(gameId) {
  try {
    const response = await fetch(`${API_URL}/games/dabandon`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ gameId })
    });
    
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de l\'abandon de la partie:', error);
    return { error: "Impossible d'abandonner la partie" };
  }
}

// Récupérer le profil utilisateur
async function getUserProfile() {
  try {
    const response = await fetch(`${API_URL}/users/profile`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    return { error: "Impossible de récupérer le profil" };
  }
}

// Récupérer les statistiques de l'utilisateur
async function getUserStats() {
  try {
    const response = await fetch(`${API_URL}/users/stats`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    return { error: "Impossible de récupérer les statistiques" };
  }
}

// Récupérer le classement
async function getLeaderboard() {
  try {
    const response = await fetch(`${API_URL}/users/leaderboard`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la récupération du classement:', error);
    return { error: "Impossible de récupérer le classement" };
  }
}