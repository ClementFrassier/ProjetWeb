// frontend/server.ts
import { serve } from "https://deno.land/std@0.200.0/http/server.ts";
import { serveDir } from "https://deno.land/std@0.200.0/http/file_server.ts";

const port = 8080;

serve(async (req) => {
  return await serveDir(req, {
    fsRoot: ".",
    showDirListing: true,
    enableCors: true,
  });
}, { port });

console.log(`Frontend server running on http://localhost:${port}`);