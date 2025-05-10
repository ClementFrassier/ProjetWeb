
// Fonction pour placer un navire
async function placeShip(gameId, type, x, y, orientation) {
  try {
    const response = await fetch(`${API_URL}/games/placeShip`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
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
    console.error('Erreur lors du placement du navire:', error);
    return { error: "Impossible de placer le navire" };
  }
}

// Fonction pour valider le placement d'un navire
async function validateShipPlacement(gameId, x, y, orientation, size) {
  try {
    const response = await fetch(`${API_URL}/games/validateShipPlacement`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
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
    console.error('Erreur lors de la validation du placement:', error);
    return { error: "Impossible de valider le placement" };
  }
}

// Fonction pour obtenir les navires du joueur
async function getPlayerShips(gameId) {
  if(!gameId){
    console.log("Pas d'ID de partie, impossible d'avoir les bateaux ");
    return { error: "Game ID manquant", ships: [] };
  }
  try {
    const response = await fetch(`${API_URL}/games/playerShips?gameId=${gameId}`, {
      method: 'GET',
      credentials: 'include'
    });
    
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la récupération des navires:', error);
    return { error: "Impossible de récupérer les navires" };
  }
}

// Fonction pour vérifier l'état des navires
async function checkShipStatus(gameId) {
  try {
    const response = await fetch(`${API_URL}/games/shipStatus`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ gameId })
    });
    
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la vérification de l\'état des navires:', error);
    return { error: "Impossible de vérifier l'état des navires" };
  }
}

// Fonction pour dessiner un navire sur la grille
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
    
    // Vérifier que la position est valide
    if (posX >= 0 && posX < 10 && posY >= 0 && posY < 10) {
      const cellId = `${boardId}-${posX}-${posY}`;
      const cell = document.getElementById(cellId);
      if (cell) {
        cell.classList.add('ship');
      }
    }
  }
}


window.placeShip = placeShip;
window.validateShipPlacement = validateShipPlacement;
window.getPlayerShips = getPlayerShips;
window.checkShipStatus = checkShipStatus;
window.drawShip = drawShip;