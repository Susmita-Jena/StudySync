// routes/mood.js
import { Router } from "express";
import { db } from "../db.js";
import { todayKey } from "../lib/gamify.js";

const router = Router();
const VALID_MOODS = ["happy", "sad", "okay", "satire", "lovely", "melancholic"];

router.get("/", (req, res) => {
  const moods = db.data.moods
    .filter((m) => m.userId === req.userId)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  res.json(moods);
});

// Upsert — one entry per user per day
router.post("/", (req, res) => {
  const { mood, color, note, date } = req.body || {};
  if (!VALID_MOODS.includes(mood)) {
    return res.status(400).json({ error: "Pick a valid mood option." });
  }
  const day = date || todayKey();

  let entry = db.data.moods.find((m) => m.userId === req.userId && m.date === day);
  if (entry) {
    entry.mood = mood;
    entry.color = color || entry.color;
    entry.note = note || "";
  } else {
    entry = {
      id: "m_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      userId: req.userId,
      date: day,
      mood,
      color: color || "periwinkle",
      note: note || "",
      createdAt: new Date().toISOString(),
    };
    db.data.moods.push(entry);
  }
  db.save();
  res.status(201).json(entry);
});

export default router;
