import express from "express";
import path from "path";
import fs from "fs";
import { sql } from "@vercel/postgres";
import LZString from "lz-string";

// Robust directory selection: try /tmp first as it's always writable in these environments
const getDbDir = () => {
  const paths = [
    "/tmp/rizz_db",
    path.join(process.cwd(), "rizz_db")
  ];
  
  for (const p of paths) {
    try {
      if (!fs.existsSync(p)) {
        fs.mkdirSync(p, { recursive: true });
      }
      // Test writability
      const testFile = path.join(p, ".write-test");
      fs.writeFileSync(testFile, "test");
      fs.unlinkSync(testFile);
      console.log(`Using writable storage at: ${p}`);
      return p;
    } catch (e) {
      console.warn(`Path ${p} not writable, trying next...`);
    }
  }
  return "/tmp"; // Absolute fallback
};

const DB_DIR = getDbDir();

// In-memory cache for speed
const memoryStore = new Map<string, any>();

// Initialize Postgres if available
const usePostgres = !!process.env.POSTGRES_URL;

async function initDb() {
  if (!usePostgres) return;
  
  try {
    // Set a timeout for the initial connection/table creation
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Postgres init timeout")), 5000));
    const init = sql`
      CREATE TABLE IF NOT EXISTS rizz_links (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await Promise.race([init, timeout]);
    console.log("Postgres initialized successfully");
  } catch (e) {
    console.warn("Postgres init failed or timed out. Falling back to file storage.", e.message);
  }
}

const getData = async (id: string) => {
  // 1. Check Memory
  if (memoryStore.has(id)) return memoryStore.get(id);

  // 2. Check Postgres
  if (usePostgres) {
    try {
      const { rows } = await sql`SELECT data FROM rizz_links WHERE id = ${id}`;
      if (rows.length > 0) {
        const data = rows[0].data;
        memoryStore.set(id, data);
        return data;
      }
    } catch (e) {
      console.error("Postgres read error", e.message);
    }
  }

  // 3. Check File System (Individual files are much faster than one giant JSON)
  try {
    const filePath = path.join(DB_DIR, `${id}.json`);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      memoryStore.set(id, data);
      return data;
    }
  } catch (e) {
    console.error("File read error", e.message);
  }
  return null;
};

const saveData = async (id: string, data: any) => {
  // 1. Save to Memory
  memoryStore.set(id, data);

  // 2. Save to File System (Immediate persistence)
  try {
    const filePath = path.join(DB_DIR, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data));
  } catch (e) {
    console.error("File write error", e.message);
  }

  // 3. Save to Postgres (Async, don't block the response)
  if (usePostgres) {
    sql`
      INSERT INTO rizz_links (id, data) 
      VALUES (${id}, ${JSON.stringify(data)})
      ON CONFLICT (id) DO UPDATE SET data = ${JSON.stringify(data)}
    `.catch(e => console.error("Postgres async write error", e.message));
  }
};

const app = express();

// Add CORS support for cross-domain preview access
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const PORT = 3000;

app.post("/api/rizz", async (req, res) => {
  const requestId = Math.random().toString(36).substring(2, 8);
  console.log(`[${requestId}] POST /api/rizz started`);
  
  try {
    let data = req.body;
    
    if (!data) {
      console.error(`[${requestId}] No body received`);
      return res.status(400).json({ error: "Empty request body" });
    }

    // Check if data is compressed
    if (data.compressed) {
      console.log(`[${requestId}] Decompressing payload...`);
      try {
        const decompressed = LZString.decompressFromEncodedURIComponent(data.compressed);
        if (!decompressed) {
          throw new Error("Decompression returned null/empty");
        }
        data = JSON.parse(decompressed);
        console.log(`[${requestId}] Decompression successful`);
      } catch (deError) {
        console.error(`[${requestId}] Decompression/Parse failed:`, deError.message);
        return res.status(400).json({ error: "Invalid compressed data" });
      }
    }

    const id = Math.random().toString(36).substring(2, 8);
    await saveData(id, data);
    console.log(`[${requestId}] Successfully saved as ${id}`);
    res.json({ id });
  } catch (err) {
    console.error(`[${requestId}] Unexpected error:`, err);
    res.status(500).json({ error: "Internal server error during save" });
  }
});

app.get("/api/ping", (req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
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

// Start DB init in background immediately for serverless
initDb().catch(e => console.error("Background DB init error:", e.message));

async function startServer() {
  console.log("Starting server initialization...");
  
  if (process.env.NODE_ENV !== "production") {
    console.log("Running in development mode with Vite middleware");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Running in production mode");
    const distPath = path.join(process.cwd(), "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    } else {
      console.warn("Dist folder not found! Vite middleware might be needed or build is missing.");
    }
  }

  // ALWAYS listen on PORT 3000 in this environment, EXCEPT on Vercel
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`>>> Server is officially listening on port ${PORT} <<<`);
    });
  }
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
