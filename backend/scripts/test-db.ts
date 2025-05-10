// backend/scripts/test-db.ts
import { db } from "../config/db.ts";

async function testLastInsertRowId() {
  try {
    console.log("Test de last_insert_rowid()...");
    
    // Insérer une partie de test
    await db.query(
      "INSERT INTO games (player1_id, status) VALUES (?, 'waiting')",
      [999]
    );
    
    // Tester différentes façons de récupérer l'ID
    console.log("\n1. Test avec SELECT last_insert_rowid() as id");
    const result1 = await db.query("SELECT last_insert_rowid() as id");
    console.log("Résultat complet:", result1);
    console.log("Type:", typeof result1);
    console.log("Est un tableau?", Array.isArray(result1));
    if (result1.length > 0) {
      console.log("Premier élément:", result1[0]);
      console.log("Type du premier élément:", typeof result1[0]);
    }
    
    console.log("\n2. Test avec SELECT last_insert_rowid()");
    const result2 = await db.query("SELECT last_insert_rowid()");
    console.log("Résultat complet:", result2);
    
    console.log("\n3. Test avec query directe");
    const result3 = db.query("SELECT last_insert_rowid()");
    console.log("Résultat complet:", result3);
    
    // Nettoyer
    await db.query("DELETE FROM games WHERE player1_id = 999");
    
  } catch (error) {
    console.error("Erreur:", error);
  } finally {
    db.close();
  }
}

testLastInsertRowId();