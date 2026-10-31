// dev-server.js — local development entry point
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import app from "./lib/express-app.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public"), { index: "index.html" }));
app.use("/api", (req, res) => res.status(404).json({ error: "Not found." }));
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`StudySync running at http://localhost:${PORT}`);
});
