// frontend/assets/js/auth.js

// Vérifier si l'utilisateur est connecté*
console.log("window.API_URL:", window.API_URL);
console.log("Type of window.API_URL:", typeof window.API_URL);

// Si API_URL n'est pas défini, on utilise une valeur par défaut
const API_URL = window.API_URL || 'http://localhost:3000/api';
console.log("API_URL utilisé:", API_URL);

if (!window.API_URL) {
  console.error("API_URL n'est pas défini! Assurez-vous que config.js est chargé avant auth.js");
  window.API_URL = 'http://localhost:3000/api'; // Fallback
}


async function checkAuthentication() {
  try {
    const response = await fetch(`${window.API_URL}/auth/check`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    console.log("Data reçue:", data);

    if (response.ok) {
      // L'utilisateur est connecté
      console.log("L'utilisateur est authentifié !");
      
      // Mise à jour de l'interface utilisateur
      document.getElementById('login-link')?.style.setProperty('display', 'none');
      document.getElementById('register-link')?.style.setProperty('display', 'none');
      document.getElementById('profile-link')?.style.setProperty('display', 'block');
      document.getElementById('game-link')?.style.setProperty('display', 'block');
      document.getElementById('logout-link')?.style.setProperty('display', 'block');
      document.getElementById('lobby-link')?.style.setProperty('display', 'block');
      // Stocker les infos de l'utilisateur dans le localStorage
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Changer le texte du bouton "Commencer à jouer"
      const startBtn = document.getElementById('start-btn');
      if (startBtn) {
        startBtn.textContent = 'Jouer maintenant';
        startBtn.href = 'pages/game.html';
      }
      
      return true;
    } else {
      // L'utilisateur n'est pas connecté
      console.log("L'utilisateur n'est pas authentifié !");
      
      document.getElementById('login-link')?.style.setProperty('display', 'block');
      document.getElementById('register-link')?.style.setProperty('display', 'block');
      document.getElementById('profile-link')?.style.setProperty('display', 'none');
      document.getElementById('game-link')?.style.setProperty('display', 'none');
      document.getElementById('logout-link')?.style.setProperty('display', 'none');
      
      // Supprimer les infos de l'utilisateur du localStorage
      localStorage.removeItem('user');
      
      return false;
    } 
  } catch (error) {
    console.error('Erreur lors de la vérification de l\'authentification:', error);
    
    // En cas d'erreur, considérer l'utilisateur comme non connecté
    document.getElementById('login-link')?.style.setProperty('display', 'block');
    document.getElementById('register-link')?.style.setProperty('display', 'block');
    document.getElementById('profile-link')?.style.setProperty('display', 'none');
    document.getElementById('game-link')?.style.setProperty('display', 'none');
    document.getElementById('logout-link')?.style.setProperty('display', 'none');
    
    localStorage.removeItem('user');
    return false;
  }
}

// Fonction de connexion
async function login(username, password) {
  try {
    const response = await fetch(`${window.API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    
    if (response.ok) {
      // Mettre à jour l'UI et rediriger
      await checkAuthentication();
      return { success: true, message: data.message };
    } else {
      return { success: false, message: data.message };
    }
  } catch (error) {
    console.error('Erreur de connexion:', error);
    return { success: false, message: 'Erreur de connexion au serveur' };
  }
}

// Fonction d'inscription
async function register(username, email, password) {
  try {
    console.log("Envoi des données:", { username, email, password });
    const response = await fetch(`${window.API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await response.json();
    console.log("Réponse reçue:", data);
    
    if (response.ok) {
      return { success: true, message: data.message };
    } else {
      return { success: false, message: data.message };
    }
  } catch (error) {
    console.error('Erreur d\'inscription:', error);
    return { success: false, message: 'Erreur de connexion au serveur' };
  }
}

// Fonction de déconnexion
async function logout() {
  try {
    const response = await fetch(`${window.API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });

    if (response.ok) {
      // Mettre à jour l'UI et rediriger
      localStorage.removeItem('user');
      await checkAuthentication();
      window.location.href = '/index.html';
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error('Erreur de déconnexion:', error);
    return false;
  }
}