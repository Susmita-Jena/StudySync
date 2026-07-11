// server.js
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
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Public health check — must be registered before the broad "/api" auth
// gate below, or Express applies requireAuth to it too (route order matters).
app.get("/api/health", (req, res) => res.json({ ok: true }));

// ---- API routes ----
app.use("/api/auth", authRoutes);
app.use("/api/tasks", requireAuth, taskRoutes);
app.use("/api/mood", requireAuth, moodRoutes);
app.use("/api", requireAuth, stateRoutes); // /api/me, /api/state, /api/pomodoro/complete, /api/water, /api/achievements

// ---- Static frontend ----
app.use(express.static(path.join(__dirname, "public"), { index: "landing.html" }));

// Fallback: unknown non-API GET requests go to the landing page
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "landing.html"));
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found." });
});

app.listen(PORT, () => {
  console.log(`StudySync running at http://localhost:${PORT}`);
});
