// frontend/assets/js/profile.js
let currentUserId = null;

// Vérifier l'authentification
document.addEventListener('DOMContentLoaded', async () => {
  const isAuthenticated = await checkAuthentication();
  if (!isAuthenticated) {
    alert("Vous devez être connecté pour accéder à cette page.");
    window.location.href = "login.html";
    return;
  }
  
  // Récupérer l'ID utilisateur
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  currentUserId = user.id;
  
  // Charger les données
  loadProfile();
  loadStats();
  loadLeaderboard();

  // Configurez l'événement de déconnexion
  document.getElementById('logout-link').addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });
});

// Charger le profil
async function loadProfile() {
  try {
    const response = await fetch(`${window.API_URL}/users/profile`, {
      method: 'GET',
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (data.user) {
      if (Array.isArray(data.user)) {
        document.getElementById('username').textContent = data.user[1] || 'N/A';
        document.getElementById('email').textContent = data.user[2] || 'N/A';
        document.getElementById('created-at').textContent = data.user[3] || 'N/A';
        document.getElementById('last-login').textContent = data.user[4] || 'N/A';
      } else {
        document.getElementById('username').textContent = data.user.username || 'N/A';
        document.getElementById('email').textContent = data.user.email || 'N/A';
        document.getElementById('created-at').textContent = data.user.created_at || 'N/A';
        document.getElementById('last-login').textContent = data.user.last_login || 'N/A';
      }
    }
  } catch (error) {
    console.error('Erreur:', error);
  }
}

// Charger les statistiques
async function loadStats() {
  try {
    console.log("Chargement des statistiques...");
    const response = await fetch(`${window.API_URL}/users/stats`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      console.error("Erreur HTTP:", response.status);
      return;
    }
    
    const data = await response.json();
    console.log("Données de statistiques reçues:", data);
    
    // Fonction pour mettre à jour la statistique dans le DOM
    function updateStat(id, value, suffix = '') {
      document.getElementById(id).textContent = value !== undefined ? `${value}${suffix}` : '-';
    }
    
    // Analyser les données comme elles sont structurées dans la réponse
    if (data.user_id !== undefined) {
      // Format objet direct
      updateStat('games-played', data.games_played || 0);
      updateStat('games-won', data.games_won || 0);
      updateStat('total-shots', data.total_shots || 0);
      updateStat('hits', data.hits || 0);
      updateStat('ships-sunk', data.ships_sunk || 0);
    } else if (Array.isArray(data) && data.length > 0) {
      // Format tableau d'objets retourné par db.query - index 0 est souvent l'objet de données
      if (typeof data[0] === 'object' && !Array.isArray(data[0])) {
        updateStat('games-played', data[0].games_played || 0);
        updateStat('games-won', data[0].games_won || 0);
        updateStat('total-shots', data[0].total_shots || 0); 
        updateStat('hits', data[0].hits || 0);
        updateStat('ships-sunk', data[0].ships_sunk || 0);
      } 
      // Format tableau de tableaux retourné par db.query
      else if (Array.isArray(data[0])) {
        // Essayer de déterminer les indices par inférence
        const userIdIndex = 0; // Généralement, premier index est user_id
        const gamesPlayedIndex = 1;
        const gamesWonIndex = 2;
        const totalShotsIndex = 3;
        const hitsIndex = 4;
        const shipsSunkIndex = 5;
        
        updateStat('games-played', data[0][gamesPlayedIndex] || 0);
        updateStat('games-won', data[0][gamesWonIndex] || 0);
        updateStat('total-shots', data[0][totalShotsIndex] || 0);
        updateStat('hits', data[0][hitsIndex] || 0);
        updateStat('ships-sunk', data[0][shipsSunkIndex] || 0);
      }
      // Format tableau simple
      else {
        updateStat('games-played', data[1] || 0);
        updateStat('games-won', data[2] || 0);
        updateStat('total-shots', data[3] || 0);
        updateStat('hits', data[4] || 0);
        updateStat('ships-sunk', data[5] || 0);
      }
    }
    
    // Calculer le taux de victoire et la précision
    const gamesPlayed = parseInt(document.getElementById('games-played').textContent);
    const gamesWon = parseInt(document.getElementById('games-won').textContent);
    const totalShots = parseInt(document.getElementById('total-shots').textContent);
    const hits = parseInt(document.getElementById('hits').textContent);
    
    const winRate = gamesPlayed > 0 ? ((gamesWon / gamesPlayed) * 100).toFixed(1) : "0";
    const accuracy = totalShots > 0 ? ((hits / totalShots) * 100).toFixed(1) : "0";
    
    updateStat('win-rate', winRate, '%');
    updateStat('accuracy', accuracy, '%');
    
  } catch (error) {
    console.error('Erreur lors du chargement des statistiques:', error);
  }
}

// Charger le classement
async function loadLeaderboard() {
  try {
    const response = await fetch(`${window.API_URL}/users/leaderboard`, {
      method: 'GET'
    });
    
    const data = await response.json();
    
    if (data.leaderboard && Array.isArray(data.leaderboard)) {
      const leaderboardBody = document.getElementById('leaderboard-body');
      leaderboardBody.innerHTML = '';
      
      data.leaderboard.forEach((player, index) => {
        const row = document.createElement('tr');
        
        if (Array.isArray(player)) {
          row.innerHTML = `
            <td>${index + 1}</td>
            <td>${player[1] || 'Inconnu'}</td>
            <td>${player[2] || 0}</td>
            <td>${player[3] || 0}</td>
            <td>${player[7] || 0}%</td>
            <td>${player[6] || 0}%</td>
          `;
        } else {
          row.innerHTML = `
            <td>${index + 1}</td>
            <td>${player.username || 'Inconnu'}</td>
            <td>${player.games_played || 0}</td>
            <td>${player.games_won || 0}</td>
            <td>${player.win_rate || 0}%</td>
            <td>${player.accuracy || 0}%</td>
          `;
        }
        
        leaderboardBody.appendChild(row);
      });
    }
  } catch (error) {
    console.error('Erreur:', error);
    document.getElementById('leaderboard-body').innerHTML = '<tr><td colspan="6">Erreur de chargement</td></tr>';
  }
}