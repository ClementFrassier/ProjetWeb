let currentGameId = null;
let currentOrientation = 'horizontal';
let selectedShipType = null;
let placedShips = [];
let gameStatus = 'setup'; 

async function initializeGame() {
  currentGameId = getGameIdFromUrl() || null;
  window.isMyTurn = false;
  placedShips = [];
  gameStatus = 'setup';

  createGameBoards();
  setupEventListeners();

  if (currentGameId) {
    document.getElementById('game-id').textContent = currentGameId;
    
    try {
      if (typeof initWebSocket === 'function') {
        initWebSocket(currentGameId);
      }
      
      const gameDetails = await window.getGameDetails(currentGameId);
      if (gameDetails?.game) {
        gameStatus = gameDetails.game.status;
        await checkGameStatus();
        await loadExistingShips();
      }
    } catch (error) {
      // Gérer silencieusement
    }
  } else {
    const response = await window.createGame();
    if (response && !response.error) {
      currentGameId = response.gameId;
      document.getElementById('game-id').textContent = currentGameId;
      
      const url = new URL(window.location.href);
      url.searchParams.set('gameId', currentGameId);
      window.history.pushState({}, '', url);
      
      if (typeof initWebSocket === 'function') {
        initWebSocket(currentGameId);
      }
    }
  }
}

function getGameIdFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('gameId');
}

async function loadExistingShips() {
  if (!currentGameId) {
    return;
  }
  
  try {
    const shipsResponse = await window.getPlayerShips(currentGameId);
    
    if (shipsResponse?.error) {
      return;
    }

    if (shipsResponse?.ships && Array.isArray(shipsResponse.ships)) {
      shipsResponse.ships.forEach(shipArray => {
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
    // Gérer silencieusement
  }
}

function createGameBoards() {
  const playerBoard = document.getElementById('player-board');
  const opponentBoard = document.getElementById('opponent-board');
  
  playerBoard.innerHTML = '';
  opponentBoard.innerHTML = '';
  
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      const playerCell = document.createElement('div');
      playerCell.className = 'cell';
      playerCell.id = `player-board-${x}-${y}`;
      playerCell.dataset.x = x;
      playerCell.dataset.y = y;
      playerBoard.appendChild(playerCell);
      
      const opponentCell = document.createElement('div');
      opponentCell.className = 'cell';
      opponentCell.id = `opponent-board-${x}-${y}`;
      opponentCell.dataset.x = x;
      opponentCell.dataset.y = y;
      opponentBoard.appendChild(opponentCell);
    }
  }
}

// UNE SEULE fonction setupEventListeners - version simplifiée
function setupEventListeners() {
  console.log('🔧 Configuration des événements...');
  
  const shipItems = document.querySelectorAll('.ship-item');
  shipItems.forEach(ship => {
    ship.addEventListener('click', () => {
      if (!ship.classList.contains('placed')) {
        selectedShipType = ship.dataset.ship;
        shipItems.forEach(s => s.classList.remove('selected'));
        ship.classList.add('selected');
      }
    });
  });
  
  const rotateBtn = document.getElementById('rotate-btn');
  if (rotateBtn) {
    rotateBtn.addEventListener('click', () => {
      currentOrientation = currentOrientation === 'horizontal' ? 'vertical' : 'horizontal';
      rotateBtn.textContent = `Rotation (${currentOrientation})`;
    });
  }
  
  const playerCells = document.querySelectorAll('#player-board .cell');
  playerCells.forEach(cell => {
    cell.addEventListener('click', handleCellClick);
  });
  
  const opponentCells = document.querySelectorAll('#opponent-board .cell');
  opponentCells.forEach(cell => {
    cell.addEventListener('click', handleShotClick);
  });
  
  const readyBtn = document.getElementById('ready-btn');
  if (readyBtn) {
    readyBtn.addEventListener('click', playerReady);
  }
  
  // Configuration du chat - SIMPLE ET DIRECT
  setTimeout(() => {
    const sendBtn = document.getElementById('send-message');
    const msgInput = document.getElementById('message-input');

    console.log('💬 Configuration chat:', sendBtn, msgInput);

    if (sendBtn && msgInput) {
      // Supprimer tous les anciens événements
      sendBtn.onclick = null;
      msgInput.onkeypress = null;
      
      // Événement bouton
      sendBtn.onclick = function() {
        console.log('🚀 Clic bouton chat');
        const msg = msgInput.value.trim();
        console.log('📝 Message:', msg);
        
        if (msg) {
          handleChatSend(msg);
          msgInput.value = '';
        }
      };

      // Événement touche Entrée
      msgInput.onkeypress = function(e) {
        if (e.key === 'Enter') {
          console.log('⌨️ Entrée pressée');
          e.preventDefault();
          const msg = msgInput.value.trim();
          if (msg) {
            handleChatSend(msg);
            msgInput.value = '';
          }
        }
      };
      
      console.log('✅ Chat configuré');
    }
  }, 500);
}

function handleCellClick(event) {
  if ((gameStatus !== 'setup' && gameStatus !== 'waiting') || !selectedShipType) {
    return;
  }
  
  const x = parseInt(event.target.dataset.x);
  const y = parseInt(event.target.dataset.y);
  const shipSize = getShipSize(selectedShipType);
  
  if (isValidPlacement(x, y, shipSize, currentOrientation)) {
    placeShipVisually(x, y, shipSize, currentOrientation);
    
    placedShips.push({
      type: selectedShipType,
      x: x,
      y: y,
      size: shipSize,
      orientation: currentOrientation
    });
    
    const shipElement = document.querySelector(`.ship-item[data-ship="${selectedShipType}"]`);
    shipElement.classList.add('placed');
    shipElement.classList.remove('selected');
    shipElement.draggable = false;
    
    selectedShipType = null;
    
    if (placedShips.length === 5) {
      document.getElementById('ready-btn').disabled = false;
    }
  } else {
    alert('Placement invalide! Vérifiez que le navire ne dépasse pas de la grille ou ne chevauche pas un autre navire.');
  }
}

function isValidPlacement(x, y, size, orientation) {
  if (orientation === 'horizontal') {
    if (x + size > 10) return false;
  } else {
    if (y + size > 10) return false;
  }
  
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
    }
  }
}

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

async function playerReady() {
  if (placedShips.length !== 5) {
    alert("Vous devez placer vos 5 navires avant de continuer");
    return;
  }

  try {
    if (!currentGameId) {
      const response = await window.createGame();
      if (response?.error) {
        throw new Error(response.error);
      }
      currentGameId = response.gameId;
      document.getElementById('game-id').textContent = currentGameId;
      
      initWebSocket(currentGameId);
    }

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

    const readyResponse = await window.setPlayerReady(currentGameId);
    
    if (readyResponse?.error) {
      throw new Error(`Erreur: ${readyResponse.error}`);
    }

    const readyBtn = document.getElementById('ready-btn');
    if (readyBtn) readyBtn.disabled = true;
    
    const statusMessage = document.getElementById('status-message');
    if (statusMessage) {
      statusMessage.textContent = "Navires placés. Vérification de l'adversaire...";
    }

    await checkBothPlayersReady();
    
    const checkInterval = setInterval(async () => {
      const isReady = await checkBothPlayersReady();
      if (isReady) {
        clearInterval(checkInterval);
      }
    }, 2000);
    
  } catch (error) {
    alert(`Erreur: ${error.message}`);
  }
}

async function checkBothPlayersReady() {
  if (!currentGameId) return false;
  
  try {
    const readyResponse = await window.checkPlayersReady(currentGameId);
    
    if (readyResponse?.allReady && readyResponse?.gameStarted) {
      gameStatus = 'in_progress';
      
      const opponentBoard = document.getElementById('opponent-board');
      if (opponentBoard) {
        opponentBoard.classList.remove('hidden');
      }
      
      const statusMessage = document.getElementById('status-message');
      if (statusMessage) {
        statusMessage.textContent = "La partie commence !";
      }
      
      await checkGameStatus();
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Erreur de vérification de l'état de préparation:", error);
    return false;
  }
}

async function checkGameStatus() {
  if (!currentGameId) {
    return;
  }

  try {
    const response = await window.getGameDetails(currentGameId);

    if (response?.error) {
      return;
    }
    
    if (!response?.game) {
      return;
    }
    
    const game = response.game;
    if (game.status === 'waiting' && game.player1_id === getUserId()) {
      gameStatus = 'setup';
    } else {
      gameStatus = game.status;
    }
      
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
    // Gérer silencieusement
  }
}

function checkTurn(game) {
  const userId = getUserId();
  const isPlayer1 = game.player1_id === userId;
  
  window.isMyTurn = isPlayer1;
  
  const turnIndicator = document.getElementById('turn-indicator');
  if (turnIndicator) {
    turnIndicator.textContent = window.isMyTurn ? "C'est votre tour" : "Tour de l'adversaire";
    turnIndicator.classList.remove('hidden');
  }
}

async function handleShotClick(event) {
  if (gameStatus !== 'in_progress' || !window.isMyTurn) return;
  
  const x = parseInt(event.target.dataset.x);
  const y = parseInt(event.target.dataset.y);
  
  if (event.target.classList.contains('hit') || event.target.classList.contains('miss')) {
    return;
  }
  
  if (typeof sendShot === 'function') {
    sendShot(x, y);
  } else {
    await window.makeShot(currentGameId, x, y);
  }
  
  window.isMyTurn = false;
  const turnIndicator = document.getElementById('turn-indicator');
  if (turnIndicator) {
    turnIndicator.textContent = "Tour de l'adversaire";
  }
}

function addChatMessage(message) {
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) {
    return;
  }
  
  const messageElement = document.createElement('div');
  messageElement.className = 'message';
  
  const timestamp = new Date().toLocaleTimeString();
  messageElement.textContent = `[${timestamp}] ${message}`;
  
  chatMessages.appendChild(messageElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

window.addChatMessage = addChatMessage;

function handleChatSend(message) {
  console.log('📤 handleChatSend:', message);
  
  if (!message || message.trim() === '') {
    return;
  }
  
  // Vérifier si WebSocket est connecté
  if (typeof window.sendChatMessage === 'function' && typeof window.isWebSocketConnected === 'function' && window.isWebSocketConnected()) {
    console.log('🌐 Envoi via WebSocket');
    window.sendChatMessage(message);
  } else {
    console.log('📴 WebSocket non disponible');
    addChatMessage(`Vous (hors ligne): ${message}`);
  }
}

function getUserId() {
  const user = JSON.parse(localStorage.getItem('user'));
  return user ? user.id : null;
}