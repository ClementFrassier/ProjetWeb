import { Context } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { db } from "../config/db.ts";

// Place un nouveau navire sur la grille de jeu
export const placeShip = async (ctx: Context) => {
    try {
        const userId = ctx.state.user.id;
        const body = await ctx.request.body.json(); 
        const { gameId, x_position, y_position, orientation, type } = body;

        if (!gameId) {
            ctx.response.status = 400;
            ctx.response.body = { message: "ID de partie requis" };
            return;
        }
      
        if (x_position === undefined || y_position === undefined || orientation === undefined) {
            ctx.response.status = 400;
            ctx.response.body = { message: "Position du bateau requise" };
            return;
        }

        if (type === undefined) {
            ctx.response.status = 400;
            ctx.response.body = { message: "Type du bateau requis" };
            return;
        }

        // Détermination de la taille du navire selon son type
        let size: number;
        switch (type) {
            case "carrier":
                size = 5;
                break;
            case "battleship":
                size = 4;
                break;
            case "cruiser":
                size = 3;
                break;
            case "submarine":
                size = 3;
                break;
            case "destroyer":
                size = 2;
                break;
            default:
                ctx.response.status = 400;
                ctx.response.body = { message: "Type de bateau invalide" };
                return;
        }

        await db.query(
            "INSERT INTO ships (game_id, user_id, type, x_position, y_position, orientation, size) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [gameId, userId, type, x_position, y_position, orientation, size]
        );

        ctx.response.status = 201;
        ctx.response.body = { message: "Bateau placé avec succès" };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { message: "Erreur serveur", error: error.message };
    }
};

// Récupère tous les navires d'un joueur pour une partie donnée
export const getPlayerShips = async (ctx: Context) => {
    try {
        const userId = ctx.state.user.id;
        const gameId = ctx.request.url.searchParams.get("gameId");

        if (!gameId) {
            ctx.response.status = 400;
            ctx.response.body = { message: "ID de partie requis" };
            return;
        }

        const ships = await db.query(
            "SELECT * FROM ships WHERE game_id = ? AND user_id = ?",
            [gameId, userId]
        );

        ctx.response.status = 200;
        ctx.response.body = { ships: ships || [] };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { message: "Erreur serveur", error: error.message };
    }
};

// Vérifie si un placement de navire est valide (position, orientation et absence de chevauchement)
export const validateShipPlacement = async (ctx: Context) => {
  try {
    const userId = ctx.state.user.id;
    const body = await ctx.request.body.json(); 
    const { gameId, x_position, y_position, orientation, size } = body;

    // Vérifications de base
    if (!gameId || x_position === undefined || y_position === undefined || 
        orientation === undefined || size === undefined) {
      ctx.response.status = 400;
      ctx.response.body = { message: "Informations du bateau requise" };
      return;
    }

    // Vérification des limites de la grille
    if (x_position < 0 || y_position < 0 || x_position > 9 || y_position > 9) {
      ctx.response.status = 400;
      ctx.response.body = { message: "Position hors de la grille" };
      return;
    }

    // Vérification si le navire dépasse de la grille
    if ((orientation === 'horizontal' && x_position + size > 10) || 
        (orientation === 'vertical' && y_position + size > 10)) {
      ctx.response.status = 400;
      ctx.response.body = { message: "Le bateau dépasse de la grille" };
      return;
    }

    // Création de toutes les positions occupées par le navire
    const shipPositions = [];
    for (let i = 0; i < size; i++) {
      const pos = {
        x: orientation === 'horizontal' ? x_position + i : x_position,
        y: orientation === 'vertical' ? y_position + i : y_position
      };
      shipPositions.push(pos);
    }

    // Récupérer tous les navires existants
    const ships = await db.query(
      "SELECT * FROM ships WHERE game_id = ? AND user_id = ?",
      [gameId, userId]
    );

    // Vérifier les chevauchements
    for (const ship of ships) {
      const shipType = ship[3];
      const shipX = ship[4];
      const shipY = ship[5];
      const shipOrientation = ship[6];
      const shipSize = ship[7];

      // Créer toutes les positions occupées par ce navire existant
      const existingPositions = [];
      for (let i = 0; i < shipSize; i++) {
        const pos = {
          x: shipOrientation === 'horizontal' ? shipX + i : shipX,
          y: shipOrientation === 'vertical' ? shipY + i : shipY
        };
        existingPositions.push(pos);
      }

      // Vérifier s'il y a chevauchement
      for (const newPos of shipPositions) {
        for (const existingPos of existingPositions) {
          if (newPos.x === existingPos.x && newPos.y === existingPos.y) {
            ctx.response.status = 400;
            ctx.response.body = { message: "Bateau sur un autre bateau" };
            return;
          }
        }
      }
    }
    
    ctx.response.status = 200;
    ctx.response.body = { message: "Position du bateau valide" };

  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur serveur", error: error.message };
  }
};

// Récupère l'état actuel des navires d'un joueur (coulés ou non)
export const checkShipStatus = async (ctx: Context) => {
    try {
        const userId = ctx.state.user.id;
        const body = await ctx.request.body.json(); 
        const { gameId } = body;

        if (!gameId) {
            ctx.response.status = 400;
            ctx.response.body = { message: "ID de partie requis" };
            return;
        }

        const shipsStatus = await db.query(
            "SELECT id, is_sunk, hit_count FROM ships WHERE game_id = ? AND user_id = ?",
            [gameId, userId]
        );

        if (shipsStatus.length === 0) {
            ctx.response.status = 404;
            ctx.response.body = { message: "Aucun bateau trouvé" };
            return;
        }

        // Conversion des données brutes en objets structurés
        const formattedShips = shipsStatus.map(ship => ({
            id: ship[0],
            is_sunk: ship[1],
            hit_count: ship[2]
        }));

        ctx.response.status = 200;
        ctx.response.body = { shipsStatus: formattedShips };

    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { message: "Erreur serveur", error: error.message };
    }
};