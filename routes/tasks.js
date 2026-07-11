// routes/tasks.js
import { Router } from "express";
import { db } from "../db.js";
import {
  XP_PER_PRIORITY,
  getOrCreateUserState,
  applyXp,
  advanceStreak,
  levelForXp,
} from "../lib/gamify.js";

const router = Router();
const VALID_PRIORITIES = ["low", "mid", "high"];

router.get("/", (req, res) => {
  const tasks = db.data.tasks
    .filter((t) => t.userId === req.userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(tasks);
});

router.post("/", (req, res) => {
  const { text, priority } = req.body || {};
  if (!text || !text.trim()) {
    return res.status(400).json({ error: "Task text can't be empty." });
  }
  const p = VALID_PRIORITIES.includes(priority) ? priority : "mid";

  const task = {
    id: "t_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    userId: req.userId,
    text: text.trim(),
    priority: p,
    done: false,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
  db.data.tasks.push(task);
  db.save();
  res.status(201).json(task);
});

router.patch("/:id", (req, res) => {
  const task = db.data.tasks.find((t) => t.id === req.params.id && t.userId === req.userId);
  if (!task) return res.status(404).json({ error: "Task not found." });

  const { done, text, priority } = req.body || {};
  const state = getOrCreateUserState(db, req.userId);
  let leveledUp = false;

  if (typeof done === "boolean" && done !== task.done) {
    const delta = XP_PER_PRIORITY[task.priority] || XP_PER_PRIORITY.mid;
    if (done) {
      task.done = true;
      task.completedAt = new Date().toISOString();
      const result = applyXp(state, delta);
      leveledUp = result.leveledUp;
      advanceStreak(state);
    } else {
      task.done = false;
      task.completedAt = null;
      applyXp(state, -delta);
      // streak is a one-way ratchet — unchecking a task doesn't undo the day
    }
  }
  if (typeof text === "string" && text.trim()) task.text = text.trim();
  if (VALID_PRIORITIES.includes(priority)) task.priority = priority;

  db.save();
  res.json({
    task,
    xp: state.xp,
    level: levelForXp(state.xp),
    leveledUp,
    streak: state.streak,
  });
});

router.delete("/:id", (req, res) => {
  const before = db.data.tasks.length;
  db.data.tasks = db.data.tasks.filter(
    (t) => !(t.id === req.params.id && t.userId === req.userId)
  );
  if (db.data.tasks.length === before) {
    return res.status(404).json({ error: "Task not found." });
  }
  db.save();
  res.json({ ok: true });
});

export default router;
