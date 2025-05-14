let currentUserId = null;

document.addEventListener('DOMContentLoaded', async () => {
  const isAuthenticated = await checkAuthentication();
  if (!isAuthenticated) {
    alert("Vous devez être connecté pour accéder à cette page.");
    window.location.href = "login.html";
    return;
  }
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  currentUserId = user.id;
  
  loadProfile();
  loadStats();
  loadLeaderboard();

  document.getElementById('logout-link').addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });
});

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
    // Gérer l'erreur silencieusement
  }
}

async function loadStats() {
  try {
    const response = await fetch(`${window.API_URL}/users/stats`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) return;
    
    const data = await response.json();
    
    function updateStat(id, value, suffix = '') {
      document.getElementById(id).textContent = value !== undefined ? `${value}${suffix}` : '-';
    }
    
    if (data.user_id !== undefined) {
      updateStat('games-played', data.games_played || 0);
      updateStat('games-won', data.games_won || 0);
      updateStat('total-shots', data.total_shots || 0);
      updateStat('hits', data.hits || 0);
      updateStat('ships-sunk', data.ships_sunk || 0);
    } else if (Array.isArray(data) && data.length > 0) {
      if (typeof data[0] === 'object' && !Array.isArray(data[0])) {
        updateStat('games-played', data[0].games_played || 0);
        updateStat('games-won', data[0].games_won || 0);
        updateStat('total-shots', data[0].total_shots || 0); 
        updateStat('hits', data[0].hits || 0);
        updateStat('ships-sunk', data[0].ships_sunk || 0);
      } else if (Array.isArray(data[0])) {
        updateStat('games-played', data[0][1] || 0);
        updateStat('games-won', data[0][2] || 0);
        updateStat('total-shots', data[0][3] || 0);
        updateStat('hits', data[0][4] || 0);
        updateStat('ships-sunk', data[0][5] || 0);
      } else {
        updateStat('games-played', data[1] || 0);
        updateStat('games-won', data[2] || 0);
        updateStat('total-shots', data[3] || 0);
        updateStat('hits', data[4] || 0);
        updateStat('ships-sunk', data[5] || 0);
      }
    }
    
    const gamesPlayed = parseInt(document.getElementById('games-played').textContent);
    const gamesWon = parseInt(document.getElementById('games-won').textContent);
    const totalShots = parseInt(document.getElementById('total-shots').textContent);
    const hits = parseInt(document.getElementById('hits').textContent);
    
    const winRate = gamesPlayed > 0 ? ((gamesWon / gamesPlayed) * 100).toFixed(1) : "0";
    const accuracy = totalShots > 0 ? ((hits / totalShots) * 100).toFixed(1) : "0";
    
    updateStat('win-rate', winRate, '%');
    updateStat('accuracy', accuracy, '%');
    
  } catch (error) {
    // Gérer l'erreur silencieusement
  }
}

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
    document.getElementById('leaderboard-body').innerHTML = '<tr><td colspan="6">Erreur de chargement</td></tr>';
  }
}