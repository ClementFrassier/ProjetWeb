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

// Valide si un placement de navire est autorisé
async function validateShipPlacement(gameId, x, y, orientation, size) {
  try {
    const response = await fetch(`${window.API_URL}/games/validateShipPlacement`, {
      method: 'POST',
      credentials: 'include',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        gameId,
        x_position: x,
        y_position: y,
        orientation,
        size
      })
    });
    
    return await response.json();
  } catch (error) {
    return { error: "Impossible de valider le placement" };
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

// Vérifie l'état des navires (coulés ou non)
async function checkShipStatus(gameId) {
  try {
    const response = await fetch(`${window.API_URL}/games/shipStatus`, {
      method: 'GET',
      credentials: 'include',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ gameId })
    });
    
    return await response.json();
  } catch (error) {
    return { error: "Impossible de vérifier l'état des navires" };
  }
}

// Dessine visuellement un navire sur une grille
function drawShip(boardId, x, y, size, orientation) {
  const board = document.getElementById(boardId);
  
  for (let i = 0; i < size; i++) {
    let posX = x;
    let posY = y;
    
    if (orientation === 'horizontal') {
      posX += i;
    } else {
      posY += i;
    }
    
    if (posX >= 0 && posX < 10 && posY >= 0 && posY < 10) {
      const cellId = `${boardId}-${posX}-${posY}`;
      const cell = document.getElementById(cellId);
      if (cell) {
        cell.classList.add('ship');
      }
    }
  }
}

// Exposition des fonctions dans l'espace global
window.placeShip = placeShip;
window.validateShipPlacement = validateShipPlacement;
window.getPlayerShips = getPlayerShips;
window.checkShipStatus = checkShipStatus;
window.drawShip = drawShip; 