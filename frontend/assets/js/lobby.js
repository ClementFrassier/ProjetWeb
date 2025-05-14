let myUserId = null;

document.addEventListener('DOMContentLoaded', async () => {
  const isAuthenticated = await checkAuthentication();
  if (!isAuthenticated) {
    alert("Vous devez être connecté pour accéder à cette page.");
    window.location.href = "login.html";
    return;
  }

  const user = JSON.parse(localStorage.getItem('user'));
  myUserId = user?.id;

  await loadGames();
  setupEventListeners();
});

async function loadGames() {
  await loadAvailableGames();
  await loadMyGames();
}

async function loadAvailableGames() {
  try {
    const response = await fetch(`${window.API_URL}/games/available`, {
      method: 'GET',
      credentials: 'include',
      headers: {'Content-Type': 'application/json'}
    });

    const data = await response.json();
    
    if (data.games && Array.isArray(data.games)) {
      displayAvailableGames(data.games);
    }
  } catch (error) {
    // Gérer silencieusement
  }
}

async function loadMyGames() {
  try {
    const response = await window.getActiveGames();
    
    if (response?.games && Array.isArray(response.games)) {
      displayMyGames(response.games);
    }
  } catch (error) {
    // Gérer silencieusement
  }
}

function displayAvailableGames(games) {
  const container = document.getElementById('available-games');
  container.innerHTML = '';
  
  if (games.length === 0) {
    container.innerHTML = '<p>Aucune partie disponible</p>';
    return;
  }
  
  games.forEach(game => {
    let gameData;
    if (Array.isArray(game)) {
      gameData = {
        id: game[0],
        player1_id: game[1],
        player2_id: game[2],
        status: game[3],
        created_at: game[5]
      };
    } else {
      gameData = game;
    }
  
    const gameItem = document.createElement('div');
    gameItem.className = 'game-item';
    gameItem.innerHTML = `
      <div>
        <strong>Partie #${gameData.id}</strong>
        <br>
        Créée le: ${new Date(gameData.created_at).toLocaleString()}
      </div>
      <button onclick="handleJoinClick(${gameData.id})">Rejoindre</button>
    `;
    container.appendChild(gameItem);
  });
}

function displayMyGames(games) {
  const container = document.getElementById('my-games');
  container.innerHTML = '';

  if (games.length === 0) {
    container.innerHTML = '<p>Aucune partie en cours</p>';
    return;
  }

  games.forEach(game => {
    let gameData;
    if (Array.isArray(game)) {
      gameData = {
        id: game[0],
        player1_id: game[1],
        player2_id: game[2],
        status: game[3],
        created_at: game[5]
      };
    } else {
      gameData = game;
    }

    let statusText = '';
    let actionButton = '';

    switch (gameData.status) {
      case 'waiting':
        statusText = 'En attente d\'un adversaire';
        actionButton = `<button onclick="goToGame(${gameData.id})">Voir</button>`;
        break;
      case 'setup':
        statusText = 'Placement des navires';
        actionButton = `<button onclick="goToGame(${gameData.id})">Continuer</button>`;
        break;
      case 'in_progress':
        statusText = 'Partie en cours';
        actionButton = `<button onclick="goToGame(${gameData.id})">Jouer</button>`;
        break;
      default:
        statusText = gameData.status;
    }

    const gameItem = document.createElement('div');
    gameItem.className = 'game-item';
    gameItem.innerHTML = `
      <div>
        <strong>Partie #${gameData.id}</strong>
        <br>
        Statut: ${statusText}
      </div>
      ${actionButton}
    `;
    container.appendChild(gameItem);
  });
}

async function createNewGame() {
  try {
    const response = await window.createGame();
    
    if (response?.gameId) {
      showMessage('Partie créée avec succès!', 'success');
      goToGame(response.gameId);
    } else if (response?.error) {
      showMessage(`Erreur: ${response.error}`, 'error');
    }
  } catch (error) {
    showMessage('Erreur lors de la création de la partie', 'error');
  }
}

async function joinGame(gameId) {
  try {
    const gameIdNum = parseInt(gameId);
    if (isNaN(gameIdNum)) {
      showMessage('ID de partie invalide', 'error');
      return;
    }
    
    const response = await fetch(`${window.API_URL}/games/join`, {
      method: 'POST',
      credentials: 'include',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ gameId: gameIdNum })
    });
    
    const data = await response.json();
    
    if (!response.ok || data.error) {
      showMessage(`Erreur: ${data.error || data.message}`, 'error');
    } else {
      showMessage('Partie rejointe avec succès!', 'success');
      setTimeout(() => {
        window.location.href = `game.html?gameId=${gameIdNum}`;
      }, 1000);
    }
  } catch (error) {
    showMessage('Erreur lors de la tentative de rejoindre la partie', 'error');
  }
}

function handleJoinClick(gameId) {
  const btn = event.target;
  btn.disabled = true;
  
  joinGame(gameId).finally(() => {
    btn.disabled = false;
  });
}

function goToGame(gameId) {
  if (!gameId) {
    showMessage('ID de partie invalide', 'error');
    return;
  }
  window.location.href = `game.html?gameId=${gameId}`;
}

function showMessage(message, type = 'info') {
  const messageDiv = document.getElementById('status-message');
  messageDiv.textContent = message;
  messageDiv.className = `message ${type}`;
  
  setTimeout(() => {
    messageDiv.textContent = '';
    messageDiv.className = '';
  }, 3000);
}

function setupEventListeners() {
  document.getElementById('create-game-btn').addEventListener('click', createNewGame);
  document.getElementById('refresh-games-btn').addEventListener('click', loadGames);
  document.getElementById('logout-link').addEventListener('click', async (e) => {
    e.preventDefault();
    await logout();
  });
  
  setInterval(loadGames, 10000);
}

window.joinGame = joinGame;
window.goToGame = goToGame;
window.handleJoinClick = handleJoinClick;