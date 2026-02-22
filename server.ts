import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import session from "express-session";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("partyplanner.db");

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    name TEXT
  );
  CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    prompt TEXT,
    venues TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.set("trust proxy", 1);
  app.use(express.json());
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "party-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: true, // Required for SameSite=None in iframe
        sameSite: "none",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  // Auth Middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  };

  // API Routes
  app.post("/api/auth/signup", (req, res) => {
    const { email, password, name } = req.body;
    try {
      const stmt = db.prepare("INSERT INTO users (email, password, name) VALUES (?, ?, ?)");
      const result = stmt.run(email, password, name);
      req.session.userId = result.lastInsertRowid as number;
      res.json({ id: result.lastInsertRowid, email, name });
    } catch (e: any) {
      res.status(400).json({ error: "Email already exists" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ? AND password = ?").get(email, password) as any;
    if (user) {
      req.session.userId = user.id;
      res.json({ id: user.id, email: user.email, name: user.name });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not logged in" });
    const user = db.prepare("SELECT id, email, name FROM users WHERE id = ?").get(req.session.userId) as any;
    res.json(user);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  // Party Planning Route
  app.post("/api/plan", requireAuth, async (req, res) => {
    const { prompt, location } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Gemini API key not configured" });
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `You are a professional party planner. Based on the user's request: "${prompt}", find the top 3 best venues.
        
        CRITICAL: You MUST return the data as a valid JSON array of objects. 
        Each object MUST have these keys: "name", "rating", "description", "address", "website".
        Do not include any other text before or after the JSON array.
        
        Example format:
        [
          {
            "name": "Venue Name",
            "rating": 4.5,
            "description": "A great place for...",
            "address": "123 Main St, Chicago, IL",
            "website": "https://example.com"
          }
        ]`,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: (location && typeof location.latitude === 'number') ? {
                latitude: location.latitude,
                longitude: location.longitude
              } : undefined
            }
          }
        },
      });

      const text = response.text || "";
      console.log("Gemini raw response:", text);
      
      let venues = [];
      try {
        // More aggressive JSON extraction
        const startIdx = text.indexOf('[');
        const endIdx = text.lastIndexOf(']');
        
        if (startIdx !== -1 && endIdx !== -1) {
          const jsonStr = text.substring(startIdx, endIdx + 1);
          venues = JSON.parse(jsonStr);
        } else {
          console.warn("Could not find JSON array in response");
          // Fallback: if no JSON but we have grounding, maybe we can synthesize?
          // But for now, let's just return what we found or empty.
        }
      } catch (parseError) {
        console.error("JSON parse error:", parseError, "Text was:", text);
      }

      // Add grounding links if available
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks && venues.length > 0) {
        venues.forEach((v: any, i: number) => {
          // Try to find a matching chunk by name if possible, or just use index
          const chunk = chunks[i];
          if (chunk?.maps) {
            v.mapsUri = chunk.maps.uri;
          }
        });
      }

      // Ensure we have at least some data to return
      if (venues.length === 0) {
        return res.status(404).json({ error: "No venues found for this request. Try being more specific." });
      }

      // Save plan
      const stmt = db.prepare("INSERT INTO plans (user_id, prompt, venues) VALUES (?, ?, ?)");
      stmt.run(req.session.userId, prompt, JSON.stringify(venues));

      res.json({ venues });
    } catch (error: any) {
      console.error("Planning error details:", error);
      res.status(500).json({ error: "Failed to generate plan", details: error.message });
    }
  });

  app.get("/api/history", requireAuth, (req, res) => {
    const plans = db.prepare("SELECT * FROM plans WHERE user_id = ? ORDER BY created_at DESC").all(req.session.userId);
    res.json(plans.map((p: any) => ({ ...p, venues: JSON.parse(p.venues) })));
  });

  // Vite middleware for development
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
