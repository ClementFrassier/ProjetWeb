import { serve } from "https://deno.land/std@0.200.0/http/server.ts";
import { serveDir } from "https://deno.land/std@0.200.0/http/file_server.ts";

const port = 8080;

// Lire les fichiers de certificat
try {
  const cert = await Deno.readTextFile("../certs/cert.pem");
  const key = await Deno.readTextFile("../certs/key.pem");

  // Démarrer le serveur HTTPS
  console.log("Démarrage du serveur HTTPS...");
  serve(async (req) => {
    return await serveDir(req, {
      fsRoot: ".",
      showDirListing: true,
      enableCors: true,
    });
  }, { 
    port,
    cert,
    key,
    // Indiquer explicitement qu'on utilise TLS
    secure: true
  });

  console.log(`Secure frontend server running on https://localhost:${port}`);
} catch (error) {
  console.error("Erreur lors du démarrage du serveur HTTPS:", error);
}