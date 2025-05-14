async function checkAuthentication() {
  try {
    console.log("window.API_URL:", window.API_URL);
    console.log("Type of window.API_URL:", typeof window.API_URL);
    console.log("API_URL utilisé:", window.API_URL);
    
    const response = await fetch(`${window.API_URL}/auth/check`, {
      method: 'GET',
      credentials: 'include',
      headers: {'Content-Type': 'application/json'}
    });

    const data = await response.json();
    console.log("Data reçue:", data);

    if (response.ok) {
      // L'utilisateur est connecté
      document.getElementById('login-link')?.style.setProperty('display', 'none');
      document.getElementById('register-link')?.style.setProperty('display', 'none');
      document.getElementById('profile-link')?.style.setProperty('display', 'block');
      document.getElementById('game-link')?.style.setProperty('display', 'block');
      document.getElementById('logout-link')?.style.setProperty('display', 'block');
      document.getElementById('lobby-link')?.style.setProperty('display', 'block');

      // Vérification du statut admin améliorée
      const adminLink = document.getElementById('admin-link');
      if (adminLink) {
        console.log('Admin link found, is_admin:', data.user?.is_admin);
        // Force l'affichage si l'utilisateur est admin
        if (data.user?.is_admin === true) {
          adminLink.style.setProperty('display', 'block');
          console.log('Admin link display set to block');
        } else {
          adminLink.style.setProperty('display', 'none');
          console.log('Admin link display set to none');
        }
      } else {
        console.log('Admin link not found in DOM');
      }

      localStorage.setItem('user', JSON.stringify(data.user));
      
      const startBtn = document.getElementById('start-btn');
      if (startBtn) {
        startBtn.textContent = 'Jouer maintenant';
        startBtn.href = 'pages/game.html';
      }
      
      console.log("L'utilisateur est authentifié !");
      return true;
    } else {  
      // L'utilisateur n'est pas connecté
      document.getElementById('login-link')?.style.setProperty('display', 'block');
      document.getElementById('register-link')?.style.setProperty('display', 'block');
      document.getElementById('profile-link')?.style.setProperty('display', 'none');
      document.getElementById('game-link')?.style.setProperty('display', 'none');
      document.getElementById('logout-link')?.style.setProperty('display', 'none');
      document.getElementById('admin-link')?.style.setProperty('display', 'none');
      document.getElementById('lobby-link')?.style.setProperty('display', 'none');
      
      localStorage.removeItem('user');
      
      return false;
    } 
  } catch (error) {
    console.error("Erreur lors de la vérification d'authentification:", error);
    document.getElementById('login-link')?.style.setProperty('display', 'block');
    document.getElementById('register-link')?.style.setProperty('display', 'block');
    document.getElementById('profile-link')?.style.setProperty('display', 'none');
    document.getElementById('game-link')?.style.setProperty('display', 'none');
    document.getElementById('logout-link')?.style.setProperty('display', 'none');
    document.getElementById('admin-link')?.style.setProperty('display', 'none');
    document.getElementById('lobby-link')?.style.setProperty('display', 'none');
    
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