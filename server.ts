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

const db = new Database("macrolens.db");

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    name TEXT,
    calorie_goal INTEGER DEFAULT 2000,
    protein_goal INTEGER DEFAULT 150,
    carbs_goal INTEGER DEFAULT 200,
    fat_goal INTEGER DEFAULT 70
  );
  CREATE TABLE IF NOT EXISTS food_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    food_name TEXT,
    calories INTEGER,
    protein INTEGER,
    carbs INTEGER,
    fat INTEGER,
    image_url TEXT,
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
      secret: process.env.SESSION_SECRET || "macrolens-secret",
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

  // Food Analysis Route
  app.post("/api/analyze-food", requireAuth, async (req, res) => {
    const { image } = req.body; // base64 image
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Gemini API key not configured" });
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          {
            inlineData: {
              data: image.split(',')[1],
              mimeType: "image/jpeg"
            }
          },
          {
            text: "Analyze this food image and estimate the calories and macros (protein, carbs, fat). Provide a name for the food. Return strictly as JSON."
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              foodName: { type: "string" },
              calories: { type: "number" },
              protein: { type: "number" },
              carbs: { type: "number" },
              fat: { type: "number" }
            },
            required: ["foodName", "calories", "protein", "carbs", "fat"]
          }
        },
      });

      const result = JSON.parse(response.text || "{}");
      
      // Save to DB
      const stmt = db.prepare("INSERT INTO food_logs (user_id, food_name, calories, protein, carbs, fat, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)");
      stmt.run(req.session.userId, result.foodName, result.calories, result.protein, result.carbs, result.fat, image);

      res.json(result);
    } catch (error: any) {
      console.error("Analysis error:", error);
      res.status(500).json({ error: "Failed to analyze food", details: error.message });
    }
  });

  app.get("/api/logs", requireAuth, (req, res) => {
    const logs = db.prepare("SELECT * FROM food_logs WHERE user_id = ? ORDER BY created_at DESC").all(req.session.userId);
    res.json(logs);
  });

  app.get("/api/stats", requireAuth, (req, res) => {
    const stats = db.prepare(`
      SELECT 
        SUM(calories) as totalCalories,
        SUM(protein) as totalProtein,
        SUM(carbs) as totalCarbs,
        SUM(fat) as totalFat
      FROM food_logs 
      WHERE user_id = ? AND date(created_at) = date('now')
    `).get(req.session.userId) as any;

    const user = db.prepare("SELECT calorie_goal, protein_goal, carbs_goal, fat_goal FROM users WHERE id = ?").get(req.session.userId) as any;

    res.json({
      current: stats || { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 },
      goals: user
    });
  });

  app.post("/api/goals", requireAuth, (req, res) => {
    const { calorie_goal, protein_goal, carbs_goal, fat_goal } = req.body;
    db.prepare("UPDATE users SET calorie_goal = ?, protein_goal = ?, carbs_goal = ?, fat_goal = ? WHERE id = ?")
      .run(calorie_goal, protein_goal, carbs_goal, fat_goal, req.session.userId);
    res.json({ success: true });
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
