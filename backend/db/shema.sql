-- Table des utilisateurs
-- Peut etre supprimé 
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Table des parties
CREATE TABLE games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player1_id INTEGER REFERENCES users(id),
    player2_id INTEGER REFERENCES users(id),
    status TEXT NOT NULL, -- "waiting", "in_progress", "finished"
    winner_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des navires
CREATE TABLE ships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER REFERENCES games(id),
    user_id INTEGER REFERENCES users(id),
    type TEXT NOT NULL, -- "carrier", "battleship", "cruiser", "submarine", "destroyer"
    x_position INTEGER NOT NULL,
    y_position INTEGER NOT NULL,
    orientation TEXT NOT NULL, -- "horizontal", "vertical"
    size INTEGER NOT NULL,
    is_sunk BOOLEAN DEFAULT FALSE
);

-- Table des tirs
CREATE TABLE shots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER REFERENCES games(id),
    user_id INTEGER REFERENCES users(id),
    x_position INTEGER NOT NULL,
    y_position INTEGER NOT NULL,
    is_hit BOOLEAN NOT NULL,
    ship_id INTEGER REFERENCES ships(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des statistiques des joueurs
CREATE TABLE stats (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    total_shots INTEGER DEFAULT 0,
    hits INTEGER DEFAULT 0,
    ships_sunk INTEGER DEFAULT 0
);