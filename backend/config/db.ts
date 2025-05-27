import { DB } from "https://deno.land/x/sqlite/mod.ts";

export const db = new DB("./battleship.db");

export const initDb = async () => {

  db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE, 
      password_hash TEXT NOT NULL,
      is_admin BOOLEAN DEFAULT FALSE,
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
      is_sunk BOOLEAN DEFAULT FALSE,
      hit_count INTEGER DEFAULT 0
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



export const createDefaultAdmins = async () => {
  try {

    const existingAdmins = await db.query(
      "SELECT COUNT(*) FROM users WHERE is_admin = TRUE"
    );
    
    const adminCount = existingAdmins[0][0];
    
    if (adminCount === 0) {
      const { hashPassword } = await import("../utils/hash.ts");
      

      const adminUsers = [
        {
          username: "admin",
          email: "admin@admin",
          password: "admin" 
        }
      ];
      
      for (const admin of adminUsers) {
        const hashedPassword = await hashPassword(admin.password);
        await db.query(
          "INSERT INTO users (username, email, password_hash, is_admin) VALUES (?, ?, ?, TRUE)",
          [admin.username, admin.email, hashedPassword]
        );
        
        const newUser = await db.query(
          "SELECT id FROM users WHERE username = ?",
          [admin.username]
        );
        
        if (newUser.length > 0) {
          await db.query(
            "INSERT INTO stats (user_id) VALUES (?)",
            [newUser[0][0]]
          );
        }
        
        console.log(`Administrateur créé: ${admin.username}`);
      }
    } else {
      console.log("Administrateur deja existant.");
    }
  } catch (error) {
    console.error("Erreur lors de la création des administrateurs:", error);
  }
};