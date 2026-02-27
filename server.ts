import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use /tmp for writable storage on Vercel
const DB_FILE = process.env.VERCEL ? path.join("/tmp", "rizz.json") : path.join(__dirname, "rizz.json");

// Helper to read/write data
const getData = () => {
  if (!fs.existsSync(DB_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  } catch (e) {
    return {};
  }
};

const saveData = (data: any) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(data));
};

const app = express();
app.use(express.json({ limit: '10mb' }));

const PORT = 3000;

app.post("/api/rizz", (req, res) => {
  const id = Math.random().toString(36).substring(2, 8);
  const data = getData();
  data[id] = req.body;
  saveData(data);
  res.json({ id });
});

app.get("/api/rizz/:id", (req, res) => {
  const data = getData();
  const config = data[req.params.id];
  if (config) {
    res.json(config);
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
