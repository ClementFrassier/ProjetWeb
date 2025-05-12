// Variables globales
let currentGameId = null;
//let isMyTurn = false;
let currentOrientation = 'horizontal';
let selectedShipType = null;
let placedShips = [];
let gameStatus = 'setup'; // 'setup', 'playing', 'finished'

console.log("sendChatMessage dans game.js:", typeof sendChatMessage);
console.log("window.sendChatMessage:", typeof window.sendChatMessage);
console.log("Sont identiques ?", sendChatMessage === window.sendChatMessage);

console.log("window.sendChatMessage après chargement:", typeof window.sendChatMessage);
console.log("Source de sendChatMessage:", window.sendChatMessage?.toString?.().substring(0, 50));
/**
 * Vérifie si les fonctions requises sont disponibles
 * @returns {boolean} Vrai si toutes les fonctions sont disponibles
 */
function checkRequiredFunctions() {
  // Liste des fonctions requises
  const requiredFunctions = [
    'createGame', 
    'getActiveGames', 
    'getGameDetails', 
    'placeShip', 
    'getPlayerShips'
  ];
  
  // Vérifier chaque fonction
  const missingFunctions = [];
  for (const func of requiredFunctions) {
    if (typeof window[func] !== 'function') {
      missingFunctions.push(func);
    }
  }
  
  if (missingFunctions.length > 0) {
    console.error('Fonctions manquantes:', missingFunctions);
    return false;
  }
  
  return true;
}


// Modifications à apporter dans game.js

// Dans la fonction initializeGame, remplacer la partie existante :
async function initializeGame() {
  console.log('Initialisation du jeu...');
  
  const urlGameId = getGameIdFromUrl();
  if (urlGameId) {
    currentGameId = urlGameId;
    console.log('ID de partie récupéré depuis l\'URL:', currentGameId);
  }
  
  if (!checkRequiredFunctions()) {
    console.log('En attente des dépendances...');
    setTimeout(initializeGame, 100);
    return;
  }

  console.log('Toutes les dépendances sont chargées, démarrage...');

  if (!currentGameId) {
    currentGameId = null;
  }
  
  window.isMyTurn = false;
  placedShips = [];
  gameStatus = 'setup';

  createGameBoards();
  setupEventListeners();

  try {
    if (currentGameId) {
      const gameIdElement = document.getElementById('game-id');
      if (gameIdElement) {
        gameIdElement.textContent = currentGameId;
      }
      
      const detailsResponse = await window.getGameDetails(currentGameId);
      
      if (detailsResponse?.error === "Accès refusé") {
        console.log("Accès refusé - tentative de rejoindre la partie");
        // Logique pour rejoindre...
      } else if (detailsResponse?.game) {
        gameStatus = detailsResponse.game.status;
        
        // INITIALISER WEBSOCKET ICI AUSSI
        console.log("Initialisation WebSocket pour la partie:", currentGameId);
        if (typeof initWebSocket === 'function') {
          initWebSocket(currentGameId);
        } else {
          console.error("initWebSocket n'est pas définie");
        }
        
        await checkGameStatus();
        await loadExistingShips();
      }
    } else {
      await checkForExistingGame();
    }
  } catch (error) {
    console.error("Erreur d'initialisation:", error);
  }
}
// Fonction pour obtenir l'ID de partie depuis l'URL
function getGameIdFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('gameId');
}

// Vérifier si une partie existe déjà
async function checkForExistingGame() {
  console.log('Vérification des parties existantes...');

  try {
    const response = await window.getActiveGames();
    
    if (response?.error) {
      console.error("Erreur getActiveGames:", response.error);
      return;
    }

    console.log("Réponse brute de getActiveGames:", JSON.stringify(response));

    if (!response?.games || !Array.isArray(response.games) || response.games.length === 0) {
      console.log("Aucune partie existante");
      currentGameId = null;
      return;
    }

    const firstGame = response.games[0];
    console.log("Structure première partie:", JSON.stringify(firstGame));

    let gameId;
    if (Array.isArray(firstGame)) {
      gameId = firstGame[0];
      console.log("ID extrait (format tableau):", gameId);
    } else if (firstGame && typeof firstGame === 'object') {
      gameId = firstGame.id;
      console.log("ID extrait (format objet):", gameId);
    } else {
      console.error("Format de partie inconnu:", typeof firstGame, firstGame);
      return;
    }

    if (!gameId || gameId === 'undefined' || gameId === 'null') {
      console.error("ID invalide:", gameId);
      return;
    }

    currentGameId = gameId.toString();
    console.log("Partie trouvée, ID valide:", currentGameId);

    const gameIdElement = document.getElementById('game-id');
    if (gameIdElement) gameIdElement.textContent = currentGameId;

    // AJOUTER CETTE LIGNE !
    if (typeof window.initWebSocket === 'function') {
      window.initWebSocket(currentGameId);
    }

    await checkGameStatus();
    await loadExistingShips();

  } catch (error) {
    console.error('Erreur checkForExistingGame:', error);
    currentGameId = null;
  }
}


async function loadExistingShips() {
  if (!currentGameId) {
    console.log("Impossible de charger les navires: ID de partie non défini");
    return;
  }
  
  try {
    const shipsResponse = await window.getPlayerShips(currentGameId);
    
    if (shipsResponse?.error) {
      console.error(`Erreur navires: ${shipsResponse.error}`);
      return;
    }

    // Si les navires sont retournés sous forme de tableaux
    if (shipsResponse?.ships && Array.isArray(shipsResponse.ships)) {
      shipsResponse.ships.forEach(shipArray => {
        // Convertir le tableau en objet
        const ship = {
          id: shipArray[0],
          game_id: shipArray[1],
          user_id: shipArray[2],
          type: shipArray[3],
          x_position: shipArray[4],
          y_position: shipArray[5],
          orientation: shipArray[6],
          is_sunk: shipArray[7]
        };
        
        placeShipVisually(ship.x_position, ship.y_position, getShipSize(ship.type), ship.orientation);
        
        const shipElement = document.querySelector(`.ship-item[data-ship="${ship.type}"]`);
        if (shipElement) {
          shipElement.classList.add('placed');
          shipElement.draggable = false;
        }
      });
    }
  } catch (error) {
    console.error('Erreur loadExistingShips:', error);
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
      // Ne permettre la sélection que si le navire n'est pas déjà placé
      if (!ship.classList.contains('placed')) {
        selectedShipType = ship.dataset.ship;
        // Désélectionner les autres navires
        shipItems.forEach(s => s.classList.remove('selected'));
        // Sélectionner ce navire
        ship.classList.add('selected');
      }
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
  if ((gameStatus !== 'setup' && gameStatus !== 'waiting') || !selectedShipType) {
    console.log("Clic ignoré - gameStatus:", gameStatus, "selectedShipType:", selectedShipType);
    return;
  }
  
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
    if (cell) {
      cell.classList.add('ship');
    } else {
      console.warn(`Cellule ${cellId} introuvable`);
    }
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
    alert("Vous devez placer vos 5 navires avant de continuer");
    return;
  }

  try {
    // Si aucun ID de partie n'est défini, créer une nouvelle partie
    if (!currentGameId) {
      const response = await window.createGame();
      if (response?.error) {
        throw new Error(response.error);
      }
      currentGameId = response.gameId;
      document.getElementById('game-id').textContent = currentGameId;
      
      // INITIALISER WEBSOCKET APRÈS CRÉATION DE PARTIE
      initWebSocket(currentGameId);
    }

    // Placer tous les navires
    for (const ship of placedShips) {
      const result = await window.placeShip(
        currentGameId,
        ship.type,
        ship.x,
        ship.y,
        ship.orientation
      );
      
      if (result?.error) {
        throw new Error(`Erreur placement ${ship.type}: ${result.error}`);
      }
    }

    // Désactiver le bouton prêt
    const readyBtn = document.getElementById('ready-btn');
    if (readyBtn) readyBtn.disabled = true;
    
    // Mettre à jour le message
    const statusMessage = document.getElementById('status-message');
    if (statusMessage) {
      statusMessage.textContent = "Navires placés. Vérification de l'adversaire...";
    }

    // Vérifier périodiquement l'état de la partie
    const checkInterval = setInterval(async () => {
      const response = await window.getGameDetails(currentGameId);
      
      if (!response?.game) return;
      
      const game = response.game;
      
      // Vérifier si les deux joueurs ont placé leurs navires
      const shipsResponse = await fetch(`${window.API_URL}/games/checkAllShipsPlaced?gameId=${currentGameId}`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (shipsResponse.ok) {
        const shipsData = await shipsResponse.json();
        
        if (shipsData.allShipsPlaced) {
          // Si tous les navires sont placés, démarrer la partie
          const startResponse = await fetch(`${window.API_URL}/games/startGame`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ gameId: currentGameId })
          });
          
          if (startResponse.ok) {
            clearInterval(checkInterval);
            gameStatus = 'in_progress';
            
            // Afficher la grille adverse
            const opponentBoard = document.getElementById('opponent-board');
            if (opponentBoard) {
              opponentBoard.classList.remove('hidden');
            }
            
            if (statusMessage) {
              statusMessage.textContent = "La partie commence !";
            }
            
            // Appeler checkGameStatus pour initialiser le tour
            await checkGameStatus();
          }
        }
      }
    }, 2000);
    
  } catch (error) {
    console.error("Erreur:", error);
    alert(`Erreur: ${error.message}`);
  }
}

// Vérifier l'état de la partie
async function checkGameStatus() {
  // Vérification stricte de l'ID
  if (!currentGameId || currentGameId === 'undefined' || currentGameId === 'null') {
    console.log("Aucun ID de partie valide - annuler la vérification du statut");
    return;
  }

  try {
    console.log("Récupération des détails de la partie avec l'ID:", currentGameId);

    const response = await window.getGameDetails(currentGameId);

    if (response?.error) {
      console.error("Erreur dans checkGameStatus:", response.error);
      return;
    }
    
    // Vérifier que game existe
    if (!response?.game) {
      console.error("Réponse invalide - objet game manquant");
      return;
    }
    
    const game = response.game;
    if (game.status === 'waiting' && game.player1_id === getUserId()) {
      gameStatus = 'setup';
      console.log("Partie en attente, passage en mode setup pour placement des navires");
    } else {
      gameStatus = game.status;
    }
  
      
    // Afficher un message selon le statut
    const statusMessage = document.getElementById('status-message');
    if (statusMessage) {
      switch (gameStatus) {
        case 'waiting':
          statusMessage.textContent = "En attente d'un adversaire...";
          break;
        case 'setup':
          statusMessage.textContent = "Placez vos navires";
          break;
        case 'in_progress':
          statusMessage.textContent = "Partie en cours";
          checkTurn(game);
          // Rendre la grille adversaire visible
          const opponentBoard = document.getElementById('opponent-board');
          if (opponentBoard) {
            opponentBoard.classList.remove('hidden');
          }
          break;
        case 'finished':
          const isWinner = game.winner_id === getUserId();
          statusMessage.textContent = isWinner ? "Victoire !" : "Défaite";
          break;
      }
    }
  } catch (error) {
    console.error("Erreur lors de la vérification du statut:", error);
  }
}

// Vérifier si c'est le tour du joueur
function checkTurn(game) {
  // Logique simple: player1 commence, puis on alterne
  const userId = getUserId();
  const isPlayer1 = game.player1_id === userId;
  
  // Pour cet exemple basique, le joueur 1 commence toujours
  window.isMyTurn = isPlayer1;
  
  const turnIndicator = document.getElementById('turn-indicator');
  if (turnIndicator) {
    turnIndicator.textContent = window.isMyTurn ? "C'est votre tour" : "Tour de l'adversaire";
    turnIndicator.classList.remove('hidden');
  }
}

// Gérer un tir sur la grille adversaire
// Gérer un tir sur la grille adversaire
async function handleShotClick(event) {
  // Remplacer 'playing' par 'in_progress'
  console.log("Clic sur la grille adverse");
  console.log("gameStatus:", gameStatus);
  console.log("isMyTurn:", window.isMyTurn);
  if (gameStatus !== 'in_progress' || !window.isMyTurn) return;
  
  const x = parseInt(event.target.dataset.x);
  const y = parseInt(event.target.dataset.y);
  
  // Vérifier si cette cellule a déjà été ciblée
  if (event.target.classList.contains('hit') || event.target.classList.contains('miss')) {
    return;
  }
  
  // Envoyer le tir via WebSocket
  if (typeof sendShot === 'function') {
    sendShot(x, y);
  } else {
    console.error("La fonction sendShot n'est pas disponible");
    // Fallback si sendShot n'est pas disponible
    if (typeof window.makeShot === 'function') {
      await window.makeShot(currentGameId, x, y);
    }
  }
  
  // Désactiver temporairement le tour du joueur
  window.isMyTurn = false;
  const turnIndicator = document.getElementById('turn-indicator');
  if (turnIndicator) {
    turnIndicator.textContent = "Tour de l'adversaire";
  }
}

// Ajouter un message au chat
function addChatMessage(message) {
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) {
    console.error("Element chat-messages non trouvé");
    return;
  }
  
  const messageElement = document.createElement('div');
  messageElement.className = 'message';
  
  // Ajouter un timestamp au message
  const timestamp = new Date().toLocaleTimeString();
  messageElement.textContent = `[${timestamp}] ${message}`;
  
  chatMessages.appendChild(messageElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  console.log("Message ajouté au chat:", message);
}

// Exposer la fonction immédiatement
window.addChatMessage = addChatMessage;

// Fonction pour envoyer un message de chat
function handleChatSend(message) {
  console.log("Envoi du message:", message);
  
  // Utiliser directement la fonction WebSocket
  if (typeof window.sendChatMessage === 'function') {
    window.sendChatMessage(message);
  } else {
    console.error("WebSocket sendChatMessage non disponible");
    // Si WebSocket non disponible, afficher quand même le message localement
    addChatMessage(`Vous (hors ligne): ${message}`);
  }
}

// Configuration des événements après le chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM entièrement chargé pour le chat");
  
  const messageInput = document.getElementById('message-input');
  const sendButton = document.getElementById('send-message');
  
  if (sendButton) {
    sendButton.addEventListener('click', () => {
      const message = messageInput?.value?.trim();
      if (message) {
        if (messageInput) messageInput.value = '';
      }
    });
  }
  
  if (messageInput) {
    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const message = messageInput.value.trim();
        if (message) {
          messageInput.value = '';
        }
      }
    });
  }
  
  // Réexposer la fonction au cas où
  window.addChatMessage = addChatMessage;
});
