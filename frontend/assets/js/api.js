// frontend/assets/js/api.js
const API_URL = 'http://localhost:3000/api';

// Fonction pour créer une nouvelle partie
async function createGame() {
  try {
    const response = await fetch(`${API_URL}/games/start`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la création de la partie:', error);
    return { error: "Impossible de créer une partie" };
  }
}

// Fonction pour rejoindre une partie existante
async function joinGame(gameId) {
  try {
    const response = await fetch(`${API_URL}/games/join`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ gameId })
    });
    
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la tentative de rejoindre la partie:', error);
    return { error: "Impossible de rejoindre la partie" };
  }
}

// Fonction pour obtenir les détails d'une partie
async function getGameDetails(gameId) {
  try {
    const response = await fetch(`${API_URL}/games/detail?id=${gameId}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la récupération des détails de la partie:', error);
    return { error: "Impossible de récupérer les détails de la partie" };
  }
}

// Fonction pour récupérer les parties actives
async function getActiveGames() {
  try {
    const response = await fetch(`${API_URL}/games/active`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la récupération des parties actives:', error);
    return { error: "Impossible de récupérer les parties actives" };
  }
}

// Fonction pour effectuer un tir
async function makeShot(gameId, x, y) {
  try {
    const response = await fetch(`${API_URL}/games/shot`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        gameId: gameId, 
        x_position: x, 
        y_position: y 
      })
    });
    
    return await response.json();
  } catch (error) {
    console.error('Erreur lors du tir:', error);
    return { error: "Impossible d'effectuer le tir" };
  }
}

// Fonction pour abandonner une partie
async function abandonGame(gameId) {
  try {
    const response = await fetch(`${API_URL}/games/dabandon`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ gameId })
    });
    
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de l\'abandon de la partie:', error);
    return { error: "Impossible d'abandonner la partie" };
  }
}

// Récupérer le profil utilisateur
async function getUserProfile() {
  try {
    const response = await fetch(`${API_URL}/users/profile`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    return { error: "Impossible de récupérer le profil" };
  }
}

// Récupérer les statistiques de l'utilisateur
async function getUserStats() {
  try {
    const response = await fetch(`${API_URL}/users/stats`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    return { error: "Impossible de récupérer les statistiques" };
  }
}

// Récupérer le classement
async function getLeaderboard() {
  try {
    const response = await fetch(`${API_URL}/users/leaderboard`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la récupération du classement:', error);
    return { error: "Impossible de récupérer le classement" };
  }
}