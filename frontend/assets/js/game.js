// Variables globales
let currentGameId = null;
let isMyTurn = false;
let currentOrientation = 'horizontal';
let selectedShipType = null;
let placedShips = [];
let gameStatus = 'setup'; // 'setup', 'playing', 'finished'

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

// Initialiser le jeu
async function initializeGame() {
  console.log('Initialisation du jeu - currentGameId:', currentGameId);
  console.log('Initialisation du jeu...');
  
  // Attendre que toutes les fonctions soient disponibles
  if (!checkRequiredFunctions()) {
    console.log('En attente des dépendances...');
    // Réessayer après un court délai
    setTimeout(initializeGame, 100);
    return;
  }

  console.log('Toutes les dépendances sont chargées, démarrage...');

  // Réinitialisation des variables
  currentGameId = null;
  isMyTurn = false;
  placedShips = [];
  gameStatus = 'setup';

  // Création des éléments UI
  createGameBoards();
  setupEventListeners();

  try {
    await checkForExistingGame();
    
    // Si aucune partie n'existe, en créer une nouvelle
    if (!currentGameId) {
      console.log("Création d'une nouvelle partie...");
      const response = await window.createGame();
      
      if (response?.gameId) {
        currentGameId = response.gameId;
        const gameIdElement = document.getElementById('game-id');
        if (gameIdElement) {
          gameIdElement.textContent = currentGameId;
        }
        console.log("Nouvelle partie créée avec ID:", currentGameId);
      }
    }
  } catch (error) {
    console.error("Erreur d'initialisation:", error);
  }
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

    // Vérification approfondie de la structure
    if (!response?.games || !Array.isArray(response.games)) {
      console.error("Format de réponse invalide - games n'est pas un tableau");
      return;
    }

    if (response.games.length === 0) {
      console.log("Aucune partie existante");
      currentGameId = null;
      return;
    }

    // Debug: Inspecter la première partie
    const firstGame = response.games[0];
    console.log("Structure première partie:", JSON.stringify(firstGame));

    // Extraction de l'ID selon le format
    let gameId;
    if (Array.isArray(firstGame)) {
      // Format tableau [id, player1_id, player2_id, ...]
      gameId = firstGame[0];
      console.log("ID extrait (format tableau):", gameId);
    } else if (firstGame && typeof firstGame === 'object') {
      // Format objet {id: ..., player1_id: ...}
      gameId = firstGame.id;
      console.log("ID extrait (format objet):", gameId);
    } else {
      console.error("Format de partie inconnu:", typeof firstGame, firstGame);
      return;
    }

    // Validation stricte
    if (!gameId || gameId === 'undefined' || gameId === 'null') {
      console.error("ID invalide:", gameId);
      return;
    }

    currentGameId = gameId.toString();
    console.log("Partie trouvée, ID valide:", currentGameId);

    // Mise à jour UI
    const gameIdElement = document.getElementById('game-id');
    if (gameIdElement) gameIdElement.textContent = currentGameId;

    // Chargement des détails
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
  console.log('Bouton prêt - currentGameId:', currentGameId);
  
  if (placedShips.length !== 5) {
    alert("Vous devez placer vos 5 navires avant de continuer");
    return;
  }

  try {
    // Si aucun ID de partie n'est défini, créer une nouvelle partie
    if (!currentGameId) {
      console.log("Tentative de création de partie...");
      
      // Vérifier que la fonction existe
      if (typeof window.createGame !== 'function') {
        throw new Error("La fonction createGame n'est pas disponible");
      }
      
      const response = await window.createGame();
      console.log("Réponse création de partie:", response);
      
      if (response?.error) {
        throw new Error(response.error || "Échec de la création de partie");
      }
      
      // S'assurer que l'ID est bien présent dans la réponse
      if (!response?.gameId) {
        throw new Error("ID de partie manquant dans la réponse");
      }
      
      currentGameId = response.gameId;
      console.log("Partie créée avec ID:", currentGameId);
      
      // Mettre à jour l'UI
      const gameIdElement = document.getElementById('game-id');
      if (gameIdElement) {
        gameIdElement.textContent = currentGameId;
      }
      
      // Attendre un court instant avant de continuer
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Vérifier à nouveau que currentGameId est défini
    if (!currentGameId) {
      throw new Error("ID de partie toujours non défini après création");
    }

    // Vérifier que la fonction placeShip existe
    if (typeof window.placeShip !== 'function') {
      throw new Error("La fonction placeShip n'est pas disponible");
    }

    // Placement des navires
    for (const ship of placedShips) {
      console.log(`Placement du navire ${ship.type} en (${ship.x},${ship.y})`);
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

    // Mise à jour UI
    const readyBtn = document.getElementById('ready-btn');
    if (readyBtn) {
      readyBtn.disabled = true;
    }
    
    const statusMessage = document.getElementById('status-message');
    if (statusMessage) {
      statusMessage.textContent = "Prêt - En attente d'adversaire...";
    }
    
    // Vérifier à nouveau l'état de la partie
    setTimeout(checkGameStatus, 1000);
    
  } catch (error) {
    console.error("Erreur:", error);
    alert(`Erreur: ${error.message}\nVeuillez réessayer.`);
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
    
    // Mise à jour du statut
    gameStatus = game.status;
    
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
  isMyTurn = isPlayer1;
  
  const turnIndicator = document.getElementById('turn-indicator');
  if (turnIndicator) {
    turnIndicator.textContent = isMyTurn ? "C'est votre tour" : "Tour de l'adversaire";
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
  if (typeof sendShot === 'function') {
    sendShot(x, y);
  } else {
    console.error("La fonction sendShot n'est pas disponible");
    // Fallback si sendShot n'est pas disponible
    if (typeof window.makeShot === 'function') {
      await window.makeShot(currentGameId, x, y);
    }
  }
  
  // Désactiver temporairement le tour du joueur jusqu'à réception de la réponse
  isMyTurn = false;
  const turnIndicator = document.getElementById('turn-indicator');
  if (turnIndicator) {
    turnIndicator.textContent = "Tour de l'adversaire";
  }
}

// Ajouter un message au chat
function addChatMessage(message) {
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) return;
  
  const messageElement = document.createElement('div');
  messageElement.className = 'message';
  messageElement.textContent = message;
  chatMessages.appendChild(messageElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Obtenir l'ID de l'utilisateur connecté
function getUserId() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return user.id || null;
}

// Fonction pour envoyer un message de chat (stub)
function sendChatMessage(message) {
  console.log("Envoi du message:", message);
  // Cette fonction doit être définie dans le module WebSocket
  if (typeof window.sendChatViaWebSocket === 'function') {
    window.sendChatViaWebSocket(message);
  } else {
    console.warn("La fonction sendChatViaWebSocket n'est pas disponible");
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM entièrement chargé");
  
  const messageInput = document.getElementById('message-input');
  const sendButton = document.getElementById('send-message');
  
  if (sendButton) {
    sendButton.addEventListener('click', () => {
      const message = messageInput?.value?.trim();
      if (message) {
        sendChatMessage(message);
        addChatMessage(`Vous: ${message}`);
        if (messageInput) messageInput.value = '';
      }
    });
  }
  
  if (messageInput) {
    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const message = messageInput.value.trim();
        if (message) {
          sendChatMessage(message);
          addChatMessage(`Vous: ${message}`);
          messageInput.value = '';
        }
      }
    });
  }
});