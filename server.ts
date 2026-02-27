import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { sql } from "@vercel/postgres";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use /tmp for writable storage on Vercel (fallback)
const DB_FILE = process.env.VERCEL ? path.join("/tmp", "rizz.json") : path.join(__dirname, "rizz.json");

// In-memory cache
let memoryStore: Record<string, any> = {};

// Initialize Postgres if available
const usePostgres = !!process.env.POSTGRES_URL;

async function initDb() {
  if (usePostgres) {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS rizz_links (
          id TEXT PRIMARY KEY,
          data JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      console.log("Postgres initialized");
    } catch (e) {
      console.error("Postgres init error", e);
    }
  }
}

const getData = async (id: string) => {
  if (usePostgres) {
    try {
      const { rows } = await sql`SELECT data FROM rizz_links WHERE id = ${id}`;
      if (rows.length > 0) return rows[0].data;
    } catch (e) {
      console.error("Postgres read error", e);
    }
  }

  // Fallback to memory/file
  if (memoryStore[id]) return memoryStore[id];
  
  try {
    if (fs.existsSync(DB_FILE)) {
      const fileData = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
      return fileData[id];
    }
  } catch (e) {
    console.error("File read error", e);
  }
  return null;
};

const saveData = async (id: string, data: any) => {
  if (usePostgres) {
    try {
      await sql`
        INSERT INTO rizz_links (id, data) 
        VALUES (${id}, ${JSON.stringify(data)})
        ON CONFLICT (id) DO UPDATE SET data = ${JSON.stringify(data)}
      `;
    } catch (e) {
      console.error("Postgres write error", e);
    }
  }

  // Always fallback to memory/file for redundancy
  memoryStore[id] = data;
  try {
    const current = fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE, "utf-8")) : {};
    current[id] = data;
    fs.writeFileSync(DB_FILE, JSON.stringify(current));
  } catch (e) {
    console.error("File write error", e);
  }
};

const app = express();
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const PORT = 3000;

app.post("/api/rizz", async (req, res) => {
  try {
    const id = Math.random().toString(36).substring(2, 8);
    await saveData(id, req.body);
    res.json({ id });
  } catch (err) {
    console.error("POST error", err);
    res.status(500).json({ error: "Failed to generate" });
  }
});

app.get("/api/rizz/:id", async (req, res) => {
  try {
    const config = await getData(req.params.id);
    if (config) {
      res.json(config);
    } else {
      res.status(404).json({ error: "Not found" });
    }
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

async function startServer() {
  await initDb();

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

  if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
