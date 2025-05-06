import { Context } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { db } from "../config/db.ts";

export const placeShip  = async (ctx: Context) => {
    try {
        const userId = ctx.state.user.id;
        // Correction: utiliser ctx.request.body().value au lieu de ctx.request.body.json()
        const body = await ctx.request.body().value;
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

        // Insérer le bateau dans la base de données
        await db.query(
        "INSERT INTO ships (game_id, user_id, type, x_position, y_position, orientation, size) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [gameId, userId, type, x_position, y_position, orientation, size]
        );

        ctx.response.status = 201; // Created
        ctx.response.body = { message: "Bateau placé avec succès" };
    }catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { message: "Erreur serveur", error: error.message };
    }
};

export const getPlayerShips = async (ctx: Context) => {
    try {
        const userId = ctx.state.user.id;
        const body = await ctx.request.body().value;
        const { gameId } = body;

        if (!gameId) {
            ctx.response.status = 400;
            ctx.response.body = { message: "ID de partie requis" };
            return;
        }

        // Correction: virgule remplacée par AND dans la requête SQL
        const ships = await db.query(
            "SELECT * FROM ships WHERE game_id = ? AND user_id = ?",
            [gameId, userId]
        );

        if (ships.length === 0) {
            ctx.response.status = 404;
            ctx.response.body = { message: "Bateau non trouvée" };
            return;
        }

        ctx.response.status = 200;
        ctx.response.body = { Ships: ships };

    }catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { message: "Erreur serveur", error: error.message };
    }
};

export const validateShipPlacement = async (ctx: Context) => {
    try {
        const userId = ctx.state.user.id;
        const body = await ctx.request.body().value;
        const { gameId, x_position, y_position, orientation, size } = body;

        if (!gameId) {
            ctx.response.status = 400;
            ctx.response.body = { message: "ID de partie requis" };
            return;
        }
      
        if (x_position === undefined || y_position === undefined || orientation === undefined || size === undefined) {
            ctx.response.status = 400;
            ctx.response.body = { message: "Informations du bateau requise" };
            return;
        }

        if (x_position < 0 || y_position < 0 || x_position > 9 || y_position > 9) {
            ctx.response.status = 400;
            ctx.response.body = { message: "Position hors de la grille" };
            return;
        }

        if (orientation === 'horizontal' && x_position + size > 10) {
            ctx.response.status = 400;
            ctx.response.body = { message: "Le bateau dépasse de la grille" };
            return;
        }

        if (orientation === 'vertical' && y_position + size > 10) {
            ctx.response.status = 400;
            ctx.response.body = { message: "Le bateau dépasse de la grille" };
            return;
        }

        // Correction: virgule remplacée par AND dans la requête SQL
        const ships = await db.query(
            "SELECT * FROM ships WHERE game_id = ? AND user_id = ?",
            [gameId, userId]
        );

        if (ships.length === 0) {
            ctx.response.status = 404;
            ctx.response.body = { message: "Bateau non trouvée" };
            return;
        }

        var i = 0;
        var positionValide = true;

        while (i < ships.length && positionValide === true) {
            if (orientation === 'horizontal' && x_position + size < ships[i].x_position + ships[i].size && x_position > ships[i].x_position) {
                ctx.response.status = 400;
                positionValide = false;
            }
            if (orientation === 'vertical' && y_position + size < ships[i].y_position + ships[i].size && y_position > ships[i].y_position) {
                ctx.response.status = 400;
                positionValide = false;
            }
            i += 1;
        }

        if (positionValide === false) {
            ctx.response.status = 404;
            ctx.response.body = { message: "Bateau sur un autre bateau" };
            return;
        }
        
        ctx.response.status = 200;
        ctx.response.body = { message: "Position du bateau valide" };

    }catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { message: "Erreur serveur", error: error.message };
    }
};

export const checkShipStatus = async (ctx: Context) => {
    try {
        const userId = ctx.state.user.id;
        const body = await ctx.request.body().value;
        const { gameId } = body;

        if (!gameId) {
            ctx.response.status = 400;
            ctx.response.body = { message: "ID de partie requis" };
            return;
        }

        // Correction: virgule remplacée par AND dans la requête SQL
        const shipsStatus = await db.query(
            "SELECT id, is_sunk, hit_count FROM ships WHERE game_id = ? AND user_id = ?",
            [gameId, userId]
        );

        if (shipsStatus.length === 0) {
            ctx.response.status = 404;
            ctx.response.body = { message: "Bateau non trouvée" };
            return;
        }

        ctx.response.status = 200;
        ctx.response.body = { ShipsStatus: shipsStatus };

    }catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { message: "Erreur serveur", error: error.message };
    }
};