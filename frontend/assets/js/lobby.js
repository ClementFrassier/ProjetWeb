// frontend/assets/js/lobby.js

let myUserId = null;

// Initialisation du lobby
document.addEventListener('DOMContentLoaded', async () => {
  // Vérifier l'authentification
  const isAuthenticated = await checkAuthentication();
  if (!isAuthenticated) {
    alert("Vous devez être connecté pour accéder à cette page.");
    window.location.href = "login.html";
    return;
  }

  // Récupérer l'ID de l'utilisateur
  const user = JSON.parse(localStorage.getItem('user'));
  myUserId = user?.id;

  // Charger les parties
  await loadGames();

  // Configurer les événements
  setupEventListeners();
});

// Charger toutes les parties
async function loadGames() {
  await loadAvailableGames();
  await loadMyGames();
}

// Charger les parties disponibles à rejoindre
async function loadAvailableGames() {
  try {
    const response = await fetch(`${window.API_URL}/games/available`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (data.games && Array.isArray(data.games)) {
      displayAvailableGames(data.games);
    }
  } catch (error) {
    console.error('Erreur lors du chargement des parties disponibles:', error);
  }
}

// Charger mes parties actives
async function loadMyGames() {
  try {
    const response = await window.getActiveGames();
    
    if (response?.games && Array.isArray(response.games)) {
      displayMyGames(response.games);
    }
  } catch (error) {
    console.error('Erreur lors du chargement de mes parties:', error);
  }
}

// Afficher les parties disponibles
// Afficher les parties disponibles - version corrigée
function displayAvailableGames(games) {
    const container = document.getElementById('available-games');
    container.innerHTML = '';
  
    if (games.length === 0) {
      container.innerHTML = '<p>Aucune partie disponible</p>';
      return;
    }
  
    games.forEach(game => {
      // Convertir le format tableau en objet si nécessaire
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
// Afficher mes parties
function displayMyGames(games) {
  const container = document.getElementById('my-games');
  container.innerHTML = '';

  if (games.length === 0) {
    container.innerHTML = '<p>Aucune partie en cours</p>';
    return;
  }

  games.forEach(game => {
    // Convertir le format tableau en objet si nécessaire
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

    // Déterminer le statut et l'action possible
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

// Créer une nouvelle partie
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
    console.error('Erreur lors de la création de la partie:', error);
    showMessage('Erreur lors de la création de la partie', 'error');
  }
}

// Rejoindre une partie
// Rejoindre une partie
// Fonction corrigée pour rejoindre une partie
// frontend/assets/js/lobby.js - Fonction joinGame corrigée
async function joinGame(gameId) {
    try {
      console.log("Tentative de rejoindre la partie:", gameId);
      
      // S'assurer que gameId est un nombre
      const gameIdNum = parseInt(gameId);
      if (isNaN(gameIdNum)) {
        showMessage('ID de partie invalide', 'error');
        return;
      }
      
      const response = await fetch(`${window.API_URL}/games/join`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ gameId: gameIdNum })
      });
      
      const data = await response.json();
      console.log("Réponse du serveur:", data);
      
      if (!response.ok || data.error) {
        showMessage(`Erreur: ${data.error || data.message}`, 'error');
      } else {
        showMessage('Partie rejointe avec succès!', 'success');
        // Redirection après un court délai pour voir le message
        setTimeout(() => {
          window.location.href = `game.html?gameId=${gameIdNum}`;
        }, 1000);
      }
    } catch (error) {
      console.error('Erreur lors de la tentative de rejoindre la partie:', error);
      showMessage('Erreur lors de la tentative de rejoindre la partie', 'error');
    }
  }
  
  // Assurez-vous d'avoir cette fonction pour éviter les doublons
  function handleJoinClick(gameId) {
    // Désactiver le bouton temporairement pour éviter les doubles clics
    const btn = event.target;
    btn.disabled = true;
    
    joinGame(gameId).finally(() => {
      // Réactiver le bouton après la tentative
      btn.disabled = false;
    });
  }

// Aller à la page de jeu
function goToGame(gameId) {
    if (!gameId || gameId === 'undefined' || gameId === 'null') {
      console.error("ID de partie invalide:", gameId);
      showMessage('ID de partie invalide', 'error');
      return;
    }
    window.location.href = `game.html?gameId=${gameId}`;
  }
  
// Afficher un message
function showMessage(message, type = 'info') {
  const messageDiv = document.getElementById('status-message');
  messageDiv.textContent = message;
  messageDiv.className = `message ${type}`;
  
  setTimeout(() => {
    messageDiv.textContent = '';
    messageDiv.className = '';
  }, 3000);
}

// Configurer les écouteurs d'événements
function setupEventListeners() {
  // Bouton créer une partie
  document.getElementById('create-game-btn').addEventListener('click', createNewGame);
  
  // Bouton rafraîchir
  document.getElementById('refresh-games-btn').addEventListener('click', loadGames);
  
  // Déconnexion
  document.getElementById('logout-link').addEventListener('click', async (e) => {
    e.preventDefault();
    await logout();
  });
  
  // Rafraîchir automatiquement toutes les 10 secondes
  setInterval(loadGames, 10000);
}

// Exposer les fonctions globales
window.joinGame = joinGame;
window.goToGame = goToGame;
window.handleJoinClick = handleJoinClick;  