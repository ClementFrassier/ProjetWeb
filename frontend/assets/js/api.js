function mapStatusIdToString(statusId) {
  const statusMap = {
    0: 'waiting',
    1: 'setup', 
    2: 'in_progress',
    3: 'finished'
  };
  
  return typeof statusId === 'string' ? statusId : statusMap[statusId] || 'unknown';
}

// Creer une partie
async function createGame() {
  try {
    const response = await fetch(`${window.API_URL}/games/start`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return { error: data.error || data.message || `Error (${response.status})` };
    }
    
    return { gameId: data.gameId || data.game?.id };
  } catch (error) {
    return { error: "Connection error" };
  }
}

async function joinGame(gameId) {
  try {
    const response = await fetch(`${window.API_URL}/games/join`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId })
    });
    
    return await response.json();
  } catch (error) {
    return { error: "Unable to join game" };
  }
}

async function getGameDetails(gameId) {
  if (!gameId) return { error: "Game ID required" };

  try {
    const response = await fetch(`${window.API_URL}/games/detail?id=${gameId}`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return { error: errorData?.error || `Error ${response.status}` };
    }

    const data = await response.json();
    
    if (data.game) {
      return {
        game: {
          id: data.game.id,
          player1_id: data.game.player1_id,
          player2_id: data.game.player2_id,
          status: mapStatusIdToString(data.game.status),
          winner_id: data.game.winner_id,
          created_at: data.game.created_at,
          updated_at: data.game.updated_at
        }
      };
    }
    
    return { error: "Unexpected response format" };
  } catch (error) {
    return { error: "Connection error" };
  }
}

async function getActiveGames() {
  try {
    const response = await fetch(`${window.API_URL}/games/active`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { error: errorData.message || `HTTP Error ${response.status}` };
    }

    const data = await response.json();

    if (data.games && Array.isArray(data.games)) {
      const transformedGames = data.games.map(game => {
        if (typeof game === 'object' && !Array.isArray(game)) return game;
        
        return {
          id: game[0],
          player1_id: game[1],
          player2_id: game[2],
          status: mapStatusIdToString(game[3]),
          winner_id: game[4],
          created_at: game[5],
          updated_at: game[6]
        };
      });

      return { games: transformedGames };
    }

    return data;
  } catch (error) {
    return { error: "Connection error" };
  }
}

async function makeShot(gameId, x, y) {
  try {
    const response = await fetch(`${window.API_URL}/games/shot`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, x_position: x, y_position: y })
    });
    
    return await response.json();
  } catch (error) {
    return { error: "Unable to make shot" };
  }
}

async function abandonGame(gameId) {
  try {
    const response = await fetch(`${window.API_URL}/games/dabandon`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId })
    });
    
    return await response.json();
  } catch (error) {
    return { error: "Unable to abandon game" };
  }
}

// User functions
async function getUserProfile() {
  try {
    const response = await fetch(`${window.API_URL}/users/profile`, {
      method: 'GET',
      credentials: 'include'
    });
    
    return await response.json();
  } catch (error) {
    return { error: "Unable to retrieve profile" };
  }
}

async function getUserStats() {
  try {
    const response = await fetch(`${window.API_URL}/users/stats`, {
      method: 'GET',
      credentials: 'include'
    });
    
    return await response.json();
  } catch (error) {
    return { error: "Unable to retrieve statistics" };
  }
}

async function getLeaderboard() {
  try {
    const response = await fetch(`${window.API_URL}/users/leaderboard`, {
      method: 'GET'
    });
    
    return await response.json();
  } catch (error) {
    return { error: "Unable to retrieve leaderboard" };
  }
}

async function setPlayerReady(gameId) {
  try {
    const response = await fetch(`${window.API_URL}/games/ready`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId })
    });
    
    return await response.json();
  } catch (error) {
    return { error: "Unable to set player ready" };
  }
}

async function checkPlayersReady(gameId) {
  try {
    const response = await fetch(`${window.API_URL}/games/checkReady?gameId=${gameId}`, {
      method: 'GET',
      credentials: 'include'
    });
    
    return await response.json();
  } catch (error) {
    return { error: "Unable to check ready status" };
  }
}


window.createGame = createGame;
window.joinGame = joinGame;
window.getGameDetails = getGameDetails;
window.getActiveGames = getActiveGames;
window.makeShot = makeShot;
window.abandonGame = abandonGame;
window.getUserProfile = getUserProfile;
window.getUserStats = getUserStats;
window.getLeaderboard = getLeaderboard;
window.setPlayerReady = setPlayerReady;
window.checkPlayersReady = checkPlayersReady;