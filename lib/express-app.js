// lib/express-app.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { requireAuth } from "../middleware/auth.js";
import authRoutes from "../routes/auth.js";
import taskRoutes from "../routes/tasks.js";
import moodRoutes from "../routes/mood.js";
import stateRoutes from "../routes/state.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/tasks", requireAuth, taskRoutes);
app.use("/api/mood", requireAuth, moodRoutes);
app.use("/api", requireAuth, stateRoutes);
app.use((req, res) => res.status(404).json({ error: "Not found." }));
export default app;
