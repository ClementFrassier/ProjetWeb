// Vérifie les droits admin et initialise la page d'administration
document.addEventListener('DOMContentLoaded', async function() {
  const isAuthenticated = await checkAuthentication();
  if (!isAuthenticated) {
    alert("Vous devez être connecté pour accéder à cette page.");
    window.location.href = "login.html";
    return;
  }
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!user.is_admin) {
    alert("Vous n'avez pas les droits d'administrateur pour accéder à cette page.");
    window.location.href = "../index.html";
    return;
  }
  
  loadUsers();
  loadGames();
  
  document.getElementById('logout-link').addEventListener('click', function(e) {
    e.preventDefault();
    logout();
  });
});

// Charge et affiche la liste des utilisateurs
async function loadUsers() {
  try {
    const response = await fetch(`${window.API_URL}/admin/users`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Erreur lors du chargement des utilisateurs');
    }
    
    const data = await response.json();
    const tableBody = document.querySelector('#users-table tbody');
    
    tableBody.innerHTML = '';
    
    data.users.forEach(user => {
      const row = document.createElement('tr');
      
      const isAdmin = user[3] === 1 || user[3] === true;
      const adminText = isAdmin ? 'Oui' : 'Non';
      
      row.innerHTML = `
        <td>${user[0]}</td>
        <td>${user[1] || 'N/A'}</td>
        <td>${user[2] || 'N/A'}</td>
        <td>${adminText}</td>
        <td>
          ${!isAdmin ? `<button class="delete-btn" onclick="deleteUser(${user[0]})">Supprimer</button>` : '<span>Protégé</span>'}
        </td>
      `;
      
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Erreur:', error);
    alert('Impossible de charger les utilisateurs: ' + error.message);
  }
}

// Charge et affiche la liste des parties
async function loadGames() {
  try {
    const response = await fetch(`${window.API_URL}/admin/games`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Erreur lors du chargement des parties');
    }
    
    const data = await response.json();
    const tableBody = document.querySelector('#games-table tbody');
    
    tableBody.innerHTML = '';
    
    data.games.forEach(game => {
      const row = document.createElement('tr');
      
      const createdDate = game[4] ? new Date(game[4]).toLocaleString() : 'N/A';
      
      row.innerHTML = `
        <td>${game[0]}</td>
        <td>${game[1] || 'N/A'}</td>
        <td>${game[2] || 'N/A'}</td>
        <td>${game[3] || 'N/A'}</td>
        <td>${createdDate}</td>
        <td>
          <button class="delete-btn" onclick="deleteGame(${game[0]})">Supprimer</button>
        </td>
      `;
      
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Erreur:', error);
    alert('Impossible de charger les parties: ' + error.message);
  }
}

// Supprime un utilisateur après confirmation
async function deleteUser(userId) {
  if (!confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur ${userId} ? Cette action supprimera également toutes ses parties et statistiques.`)) {
    return;
  }
  
  try {
    const response = await fetch(`${window.API_URL}/admin/users/${userId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Erreur lors de la suppression');
    }
    
    alert(`L'utilisateur ${userId} a été supprimé avec succès.`);
    loadUsers();
    loadGames();
  } catch (error) {
    console.error('Erreur:', error);
    alert('Erreur lors de la suppression: ' + error.message);
  }
}

// Supprime une partie après confirmation
async function deleteGame(gameId) {
  if (!confirm(`Êtes-vous sûr de vouloir supprimer la partie ${gameId} ?`)) {
    return;
  }
  
  try {
    const response = await fetch(`${window.API_URL}/admin/games/${gameId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Erreur lors de la suppression');
    }
    
    alert(`La partie ${gameId} a été supprimée avec succès.`);
    loadGames();
  } catch (error) {
    console.error('Erreur:', error);
    alert('Erreur lors de la suppression: ' + error.message);
  }
} 