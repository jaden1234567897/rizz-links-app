import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("rizz.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS rizz_links (
    id TEXT PRIMARY KEY,
    config TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const app = express();
app.use(express.json({ limit: '10mb' }));

const PORT = 3000;

app.post("/api/rizz", (req, res) => {
  const id = Math.random().toString(36).substring(2, 8);
  const config = JSON.stringify(req.body);
  try {
    db.prepare("INSERT INTO rizz_links (id, config) VALUES (?, ?)").run(id, config);
    res.json({ id });
  } catch (e) {
    res.status(500).json({ error: "Failed to save link" });
  }
});

app.get("/api/rizz/:id", (req, res) => {
  const row = db.prepare("SELECT config FROM rizz_links WHERE id = ?").get(req.params.id) as { config: string } | undefined;
  if (row) {
    res.json(JSON.parse(row.config));
  } else {
    res.status(404).json({ error: "Not found" });
  }
});

async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }
}

setupVite();

if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
