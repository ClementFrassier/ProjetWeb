// Place un navire sur la grille de jeu
async function placeShip(gameId, type, x, y, orientation) {
  try {
    const response = await fetch(`${window.API_URL}/games/placeShip`, {
      method: 'POST',
      credentials: 'include',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        gameId,
        type,
        x_position: x,
        y_position: y,
        orientation
      })
    });
    
    return await response.json();
  } catch (error) {
    return { error: "Impossible de placer le navire" };
  }
}


// Récupère tous les navires placés par le joueur
async function getPlayerShips(gameId) {
  if(!gameId) {
    return { error: "Game ID manquant", ships: [] };
  }
  try {
    const response = await fetch(`${window.API_URL}/games/playerShips?gameId=${gameId}`, {
      method: 'GET',
      credentials: 'include'
    });
    
    return await response.json();
  } catch (error) {
    return { error: "Impossible de récupérer les navires" };
  }
}




// Exposition des fonctions dans l'espace global
window.placeShip = placeShip;
window.getPlayerShips = getPlayerShips;
