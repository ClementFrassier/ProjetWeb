import { ServerRequest } from "https://deno.land/std@0.200.0/http/server.ts";
import { serveDir } from "https://deno.land/std@0.200.0/http/file_server.ts";
import { serveTls } from "https://deno.land/std@0.200.0/http/server.ts";

const port = 8080;

try {
  console.log("Démarrage du serveur HTTPS...");
  
  await serveTls(async (req: ServerRequest) => {
    return await serveDir(req, {
      fsRoot: ".",
      showDirListing: true,
      enableCors: true,
    });
  }, {
    port,
    certFile: "../certs/cert.pem",
    keyFile: "../certs/key.pem",
  });

  console.log(`Serveur frontend sécurisé lancé sur https://localhost:${port}`);
} catch (error) {
  console.error("Erreur lors du démarrage du serveur HTTPS:", error);
  console.error(error.stack);
}