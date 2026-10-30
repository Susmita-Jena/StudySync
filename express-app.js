// express-app.js
// Shared Express application. Vercel API functions import this without
// starting a long-running local server.
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import { requireAuth } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import taskRoutes from "./routes/tasks.js";
import moodRoutes from "./routes/mood.js";
import stateRoutes from "./routes/state.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());

// Public health check.
app.get("/api/health", (req, res) => res.json({ ok: true }));

// API routes.
app.use("/api/auth", authRoutes);
app.use("/api/tasks", requireAuth, taskRoutes);
app.use("/api/mood", requireAuth, moodRoutes);
app.use("/api", requireAuth, stateRoutes);

// Local development fallback. On Vercel, the frontend is served directly
// from /public by the platform and does not need to load this app.
app.use(express.static(path.join(__dirname, "public"), { index: "landing.html" }));
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "landing.html"));
});

app.use((req, res) => res.status(404).json({ error: "Not found." }));

export default app;
