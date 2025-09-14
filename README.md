Clément Frassier Projet Web 2025
README fait avec IA , CLAUDE.

# 🚢 Bataille Navale - Jeu en ligne multijoueur

Une implémentation moderne du classique jeu de bataille navale avec interface web, temps réel et fonctionnalités multijoueurs.

## 📋 Table des matières

- [Fonctionnalités](#-fonctionnalités)
- [Technologies utilisées](#-technologies-utilisées)
- [Architecture du projet](#-architecture-du-projet)
- [Installation et lancement](#-installation-et-lancement)
- [Utilisation](#-utilisation)
- [Structure des fichiers](#-structure-des-fichiers)
- [API Documentation](#-api-documentation)
- [Administration](#-administration)
- [Développement](#-développement)

## ✨ Fonctionnalités

### 🎮 Jeu
- **Bataille navale classique** : 5 navires à placer et couler
- **Multijoueur en temps réel** : WebSockets pour une expérience fluide
- **Chat intégré** : Communication entre joueurs pendant la partie
- **Système de tours** : Alternance automatique des joueurs

### 👤 Gestion des utilisateurs
- **Authentification sécurisée** : Inscription/connexion avec JWT
- **Profils utilisateurs** : Statistiques personnelles et historique
- **Classement global** : Tableau des meilleurs joueurs
- **Panel administrateur** : Gestion des utilisateurs et parties

### 🔧 Technique
- **HTTPS** : Connexions sécurisées avec certificats SSL
- **Base de données SQLite** : Stockage persistant des données
- **Responsive design** : Compatible mobile et desktop
- **Interface moderne** : CSS personnalisé et UX optimisée

## 🛠 Technologies utilisées

### Backend
- **Deno** 🦕 - Runtime JavaScript/TypeScript moderne
- **Oak** - Framework web pour Deno
- **SQLite** - Base de données légère
- **WebSockets** - Communication temps réel
- **JWT** - Authentification par tokens
- **bcrypt** - Hachage sécurisé des mots de passe

### Frontend
- **HTML5/CSS3/JavaScript** - Technologies web standard
- **WebSocket API** - Communication temps réel côté client
- **Fetch API** - Requêtes HTTP asynchrones
- **CSS Grid/Flexbox** - Mise en page moderne

## 🏗 Architecture du projet

```
bataille-navale/
├── 📁 backend/                 # Serveur API Deno
│   ├── 📁 config/              # Configuration base de données
│   ├── 📁 controllers/         # Logique métier
│   ├── 📁 middleware/          # Middlewares (auth, CORS, etc.)
│   ├── 📁 routes/              # Définition des routes API
│   ├── 📁 utils/               # Utilitaires (JWT, hash, WebSocket)
│   └── 📄 server.ts            # Point d'entrée du serveur
├── 📁 frontend/                # Application web cliente
│   ├── 📁 assets/              # Ressources statiques
│   │   ├── 📁 css/             # Feuilles de style
│   │   └── 📁 js/              # Scripts JavaScript
│   ├── 📁 pages/               # Pages HTML
│   └── 📄 server.ts            # Serveur statique HTTPS
├── 📁 certs/                   # Certificats SSL
│   ├── 📄 cert.pem             # Certificat public
│   └── 📄 key.pem              # Clé privée
├── 📄 battleship.db            # Base de données SQLite
└── 📄 README.md                # Ce fichier
```

## 🚀 Installation et lancement

### Prérequis

1. **Installer Deno** :
   ```bash
   # Windows (PowerShell)
   irm https://deno.land/install.ps1 | iex
   
   # macOS/Linux
   curl -fsSL https://deno.land/install.sh | sh
   ```

2. **Vérifier l'installation** :
   ```bash
   deno --version
   ```

### Lancement rapide

1. **Cloner le projet** :
   ```bash
   git clone <url-du-repo>
   cd bataille-navale
   ```

2. **Lancer le backend** (Terminal 1) :
   ```bash
   cd backend
   deno run --allow-net --allow-read --allow-write --allow-env server.ts
   ```

3. **Lancer le frontend** (Terminal 2) :
   ```bash
   cd frontend
   deno run --allow-net --allow-read server.ts
   ```

4. **Accéder à l'application** :
   - Ouvrir `https://localhost:8080` dans votre navigateur
   - Accepter le certificat SSL (auto-signé pour le développement)


### Comptes par défaut

- **Administrateur** : `admin` / `admin`

## 🎯 Utilisation

### Pour les joueurs

1. **Créer un compte** ou se connecter
2. **Accéder au lobby** pour voir les parties disponibles
3. **Créer une partie** ou **rejoindre** une partie existante
4. **Placer ses navires** sur la grille (5 navires différents)
5. **Jouer** en tirant sur la grille adverse
6. **Utiliser le chat** pour communiquer
7. **Consulter ses statistiques** dans le profil

### Pour les administrateurs

1. Se connecter avec le compte admin
2. Accéder au **panel d'administration**
3. **Gérer les utilisateurs** : voir, supprimer des comptes
4. **Gérer les parties** : voir, supprimer des parties
5. **Consulter les statistiques** globales

## 📁 Structure des fichiers

### Backend (`/backend/`)

#### Configuration
- `config/db.ts` - Configuration SQLite, création des tables
- `db/schema.sql` - Schéma de base de données

#### Contrôleurs
- `controllers/auth.ts` - Authentification (login, register, logout)
- `controllers/game.ts` - Logique de jeu (créer, rejoindre, tirer)
- `controllers/ship.ts` - Gestion des navires (placer, valider)
- `controllers/user.ts` - Profils et statistiques utilisateurs
- `controllers/admin.ts` - Panel d'administration

#### Middleware
- `middleware/auth.ts` - Vérification des tokens JWT
- `middleware/admin.ts` - Vérification des droits admin
- `middleware/cors.ts` - Configuration CORS
- `middleware/error.ts` - Gestion des erreurs

#### Routes
- `routes/auth.ts` - Routes d'authentification
- `routes/game.ts` - Routes de jeu
- `routes/ship.ts` - Routes des navires
- `routes/user.ts` - Routes utilisateur
- `routes/admin.ts` - Routes d'administration

#### Utilitaires
- `utils/jwt.ts` - Création/vérification des tokens
- `utils/hash.ts` - Hachage des mots de passe
- `utils/websocket.ts` - Gestion WebSocket temps réel

### Frontend (`/frontend/`)

#### Scripts JavaScript
- `assets/js/config.js` - Configuration API URL
- `assets/js/auth.js` - Gestion authentification côté client
- `assets/js/api.js` - Appels API REST
- `assets/js/game.js` - Logique de jeu côté client
- `assets/js/ship.js` - Placement et gestion des navires
- `assets/js/websocket.js` - Communication temps réel
- `assets/js/lobby.js` - Interface du lobby
- `assets/js/profile.js` - Page de profil
- `assets/js/admin.js` - Panel d'administration

#### Styles CSS
- `assets/css/style.css` - Styles généraux
- `assets/css/game.css` - Styles spécifiques au jeu

#### Pages HTML
- `index.html` - Page d'accueil
- `pages/login.html` - Connexion
- `pages/register.html` - Inscription
- `pages/game.html` - Interface de jeu
- `pages/lobby.html` - Lobby des parties
- `pages/profile.html` - Profil utilisateur
- `pages/admin.html` - Panel d'administration

## 📡 API Documentation

### Authentification
```
POST /api/auth/register    # Inscription
POST /api/auth/login       # Connexion
POST /api/auth/logout      # Déconnexion
GET  /api/auth/check       # Vérifier l'authentification
```

### Jeu
```
POST /api/games/start      # Créer une partie
POST /api/games/join       # Rejoindre une partie
GET  /api/games/detail     # Détails d'une partie
GET  /api/games/active     # Parties actives
GET  /api/games/available  # Parties disponibles
POST /api/games/shot       # Effectuer un tir
POST /api/games/abandon    # Abandonner
POST /api/games/ready      # Marquer comme prêt
```

### Navires
```
POST /api/games/placeShip            # Placer un navire
GET  /api/games/playerShips          # Obtenir ses navires
POST /api/games/validateShipPlacement # Valider un placement
```

### Utilisateurs
```
GET /api/users/profile      # Profil utilisateur
GET /api/users/stats        # Statistiques personnelles
GET /api/users/leaderboard  # Classement global
```

### Administration (Admin uniquement)
```
GET    /api/admin/users     # Liste des utilisateurs
DELETE /api/admin/users/:id # Supprimer un utilisateur
GET    /api/admin/games     # Liste des parties
DELETE /api/admin/games/:id # Supprimer une partie
```

### WebSocket
```
ws://localhost:3000/ws/game/:gameId
```

Messages WebSocket :
- `join` - Rejoindre une partie
- `chat` - Envoyer un message
- `shot` - Effectuer un tir

## 👑 Administration

### Accès admin
1. Se connecter avec `admin` / `admin`
2. Le lien "Administration" apparaît dans le menu
3. Accéder au panel de gestion

### Fonctionnalités admin
- **Gestion utilisateurs** : Voir tous les comptes, supprimer (sauf admins)
- **Gestion parties** : Voir toutes les parties, supprimer
- **Protection** : Les comptes admin ne peuvent pas être supprimés

## 🔧 Développement

### Structure de la base de données

```sql
users        # Utilisateurs (id, username, email, password_hash, is_admin)
games        # Parties (id, player1_id, player2_id, status, winner_id)
ships        # Navires (id, game_id, user_id, type, position, orientation)
shots        # Tirs (id, game_id, user_id, position, is_hit, ship_id)
stats        # Statistiques (user_id, games_played, games_won, etc.)
```

### Permissions Deno requises

**Backend** :
- `--allow-net` : Serveur HTTP/WebSocket
- `--allow-read` : Lecture fichiers (certificats, DB)
- `--allow-write` : Écriture base de données
- `--allow-env` : Variables d'environnement

**Frontend** :
- `--allow-net` : Serveur HTTPS
- `--allow-read` : Lecture fichiers statiques

### Variables d'environnement

- `JWT_SECRET_KEY` : Clé secrète pour les tokens (générée automatiquement si absente)

### Ports utilisés

- **Backend** : `3000` (HTTPS)
- **Frontend** : `8080` (HTTPS)
- **WebSocket** : `3000/ws` (WSS)

### Certificats SSL

Les certificats dans `/certs/` sont auto-signés pour le développement local. Pour la production, remplacez-les par de vrais certificats.

## 🐛 Dépannage

### Problèmes courants

1. **Port déjà utilisé** : Changer les ports dans les fichiers de config
2. **Certificats SSL** : Vérifier que les fichiers `.pem` existent
3. **Base de données** : Elle se crée automatiquement au premier lancement
4. **Permissions Deno** : Vérifier que toutes les permissions sont accordées

### Logs utiles

- Backend : Messages dans la console du serveur
- Frontend : Console du navigateur (F12)
- WebSocket : Messages de connexion/déconnexion

## 📝 Licence

Ce projet est à des fins éducatives. Libre d'utilisation et de modification.

---

**Bon jeu ! 🚢⚓**