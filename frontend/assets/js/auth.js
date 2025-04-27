// frontend/assets/js/auth.js
const API_URL = 'http://localhost:3000/api';

// Vérifier si l'utilisateur est connecté
async function checkAuthentication() {
  try {
    const response = await fetch(`${API_URL}/auth/check`, {
      method: 'GET',
      credentials: 'include', // Important pour envoyer les cookies
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log("Réponse checkAuthentication:", response); // <-- AJOUTE CA
    const data = await response.json();
    console.log("Data reçue:", data); // <-- AJOUTE

    console.log("Réponse du serveur : ", response);
    if (response.ok) {
      console.log("L'utilisateur est authentifié !");
    } else {
      console.log("Erreur d'authentification");
    }


    if (response.ok) {
      // L'utilisateur est connecté
      document.getElementById('login-link').style.display = 'none';
      document.getElementById('register-link').style.display = 'none';
      document.getElementById('profile-link').style.display = 'block';
      document.getElementById('game-link').style.display = 'block';
      document.getElementById('logout-link').style.display = 'block';
      
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
      document.getElementById('login-link').style.display = 'block';
      document.getElementById('register-link').style.display = 'block';
      document.getElementById('profile-link').style.display = 'none';
      document.getElementById('game-link').style.display = 'none';
      document.getElementById('logout-link').style.display = 'none';
      
      // Supprimer les infos de l'utilisateur du localStorage
      localStorage.removeItem('user');
      
      return false;
    } 
  } catch (error) {
    console.error('Erreur lors de la vérification de l\'authentification:', error);
    return false;
  }
}

// Fonction de connexion
async function login(username, password) {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
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
    const response = await fetch(`${API_URL}/auth/register`, {
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
    const response = await fetch(`${API_URL}/auth/logout`, {
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