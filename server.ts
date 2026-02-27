import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use /tmp for writable storage on Vercel
const DB_FILE = process.env.VERCEL ? path.join("/tmp", "rizz.json") : path.join(__dirname, "rizz.json");

// In-memory cache to handle Vercel's stateless nature during a single session
let memoryStore: Record<string, any> = {};

const getData = () => {
  try {
    if (fs.existsSync(DB_FILE)) {
      const fileData = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
      // Merge file data with memory store, memory store takes precedence for newest links
      return { ...fileData, ...memoryStore };
    }
  } catch (e) {
    console.error("Read error", e);
  }
  return memoryStore;
};

const saveData = (data: any) => {
  try {
    // Only save to disk if we are not in a restricted environment or if /tmp is available
    fs.writeFileSync(DB_FILE, JSON.stringify(data));
  } catch (e) {
    console.error("Write error", e);
  }
};

const app = express();
// Vercel's hard limit is 4.5MB for serverless functions
app.use(express.json({ limit: '4.5mb' })); 
app.use(express.urlencoded({ limit: '4.5mb', extended: true }));

const PORT = 3000;

app.post("/api/rizz", (req, res) => {
  try {
    const id = Math.random().toString(36).substring(2, 8);
    const data = getData();
    data[id] = req.body;
    memoryStore[id] = req.body; // Update memory store
    saveData(data);
    res.json({ id });
  } catch (err) {
    console.error("POST error", err);
    res.status(500).json({ error: "Failed to generate" });
  }
});

app.get("/api/rizz/:id", (req, res) => {
  try {
    const data = getData();
    const config = data[req.params.id];
    if (config) {
      res.json(config);
    } else {
      // Check memory store specifically as a backup
      const memConfig = memoryStore[req.params.id];
      if (memConfig) {
        res.json(memConfig);
      } else {
        res.status(404).json({ error: "Not found" });
      }
    }
  } catch (err) {
    res.status(500).json({ error: "Server error" });
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
