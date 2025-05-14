// Vérifier si l'utilisateur est administrateur
document.addEventListener('DOMContentLoaded', async function() {
  const isAuthenticated = await checkAuthentication();
  if (!isAuthenticated) {
    alert("Vous devez être connecté pour accéder à cette page.");
    window.location.href = "login.html";
    return;
  }
  
  // Vérifier si l'utilisateur est admin
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!user.is_admin) {
    alert("Vous n'avez pas les droits d'administrateur pour accéder à cette page.");
    window.location.href = "../index.html";
    return;
  }
  
  // Charger les données
  loadGames();
  
  // Configurer la déconnexion
  document.getElementById('logout-link').addEventListener('click', function(e) {
    e.preventDefault();
    logout();
  });
});

// Charger la liste des parties
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
      
      // Formater la date
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

// Supprimer une partie
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
    loadGames(); // Recharger la liste des parties
  } catch (error) {
    console.error('Erreur:', error);
    alert('Erreur lors de la suppression: ' + error.message);
  }
}