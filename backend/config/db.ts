// config/db.ts
import { DB } from "https://deno.land/x/sqlite@v3.7.0/mod.ts";

// Initialiser la base de données
export const db = new DB("./battleship.db");

// Fonction d'initialisation
export const initDb = async () => {
  // Créer les tables si elles n'existent pas
  db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player1_id INTEGER REFERENCES users(id),
      player2_id INTEGER REFERENCES users(id),
      status TEXT NOT NULL,
      winner_id INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS ships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER REFERENCES games(id),
      user_id INTEGER REFERENCES users(id),
      type TEXT NOT NULL,
      x_position INTEGER NOT NULL,
      y_position INTEGER NOT NULL,
      orientation TEXT NOT NULL,
      size INTEGER NOT NULL,
      is_sunk BOOLEAN DEFAULT FALSE
    );
    
    CREATE TABLE IF NOT EXISTS shots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER REFERENCES games(id),
      user_id INTEGER REFERENCES users(id),
      x_position INTEGER NOT NULL,
      y_position INTEGER NOT NULL,
      is_hit BOOLEAN NOT NULL,
      ship_id INTEGER REFERENCES ships(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS stats (
      user_id INTEGER PRIMARY KEY REFERENCES users(id),
      games_played INTEGER DEFAULT 0,
      games_won INTEGER DEFAULT 0,
      total_shots INTEGER DEFAULT 0,
      hits INTEGER DEFAULT 0,
      ships_sunk INTEGER DEFAULT 0
    );
  `);
  
  console.log("Base de données initialisée");
};