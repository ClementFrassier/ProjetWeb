// Vérifier si l'utilisateur est connecté
async function checkAuthentication() {
  try {
    const response = await fetch(`${window.API_URL}/auth/check`, {
      method: 'GET',
      credentials: 'include',
      headers: {'Content-Type': 'application/json'}
    });

    const data = await response.json();

    if (response.ok) {
      // L'utilisateur est connecté
      document.getElementById('login-link')?.style.setProperty('display', 'none');
      document.getElementById('register-link')?.style.setProperty('display', 'none');
      document.getElementById('profile-link')?.style.setProperty('display', 'block');
      document.getElementById('game-link')?.style.setProperty('display', 'block');
      document.getElementById('logout-link')?.style.setProperty('display', 'block');
      document.getElementById('lobby-link')?.style.setProperty('display', 'block');

      const adminLink = document.getElementById('admin-link');
      if (adminLink && data.user) {
        console.log("User data:", data.user); 
        // Vérifiez toutes les formes possibles de is_admin (booléen, nombre 1, string "true")
        if (data.user.is_admin === true || data.user.is_admin === 1 || data.user.is_admin === "1" || data.user.is_admin === "true") {
            adminLink.style.setProperty('display', 'block');
        } else {
            adminLink.style.setProperty('display', 'none');
        }
      } else if (adminLink) {
        adminLink.style.setProperty('display', 'none');
      }



      localStorage.setItem('user', JSON.stringify(data.user));
      
      const startBtn = document.getElementById('start-btn');
      if (startBtn) {
        startBtn.textContent = 'Jouer maintenant';
        startBtn.href = 'pages/game.html';
      }
      
      return true;
    } else {  
      // L'utilisateur n'est pas connecté
      document.getElementById('login-link')?.style.setProperty('display', 'block');
      document.getElementById('register-link')?.style.setProperty('display', 'block');
      document.getElementById('profile-link')?.style.setProperty('display', 'none');
      document.getElementById('game-link')?.style.setProperty('display', 'none');
      document.getElementById('logout-link')?.style.setProperty('display', 'none');
      
      localStorage.removeItem('user');
      
      return false;
    } 
  } catch (error) {
    document.getElementById('login-link')?.style.setProperty('display', 'block');
    document.getElementById('register-link')?.style.setProperty('display', 'block');
    document.getElementById('profile-link')?.style.setProperty('display', 'none');
    document.getElementById('game-link')?.style.setProperty('display', 'none');
    document.getElementById('logout-link')?.style.setProperty('display', 'none');
    
    localStorage.removeItem('user');
    return false;
  }
}

async function login(username, password) {
  try {
    const response = await fetch(`${window.API_URL}/auth/login`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    
    if (response.ok) {
      await checkAuthentication();
      return { success: true, message: data.message };
    } else {
      return { success: false, message: data.message };
    }
  } catch (error) {
    return { success: false, message: 'Erreur de connexion au serveur' };
  }
}

async function register(username, email, password) {
  try {
    const response = await fetch(`${window.API_URL}/auth/register`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ username, email, password }),
    });

    const data = await response.json();
    
    if (response.ok) {
      return { success: true, message: data.message };
    } else {
      return { success: false, message: data.message };
    }
  } catch (error) {
    return { success: false, message: 'Erreur de connexion au serveur' };
  }
}

async function logout() {
  try {
    const response = await fetch(`${window.API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });

    if (response.ok) {
      localStorage.removeItem('user');
      await checkAuthentication();
      window.location.href = '/index.html';
      return true;
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
}