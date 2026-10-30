// dev-server.js — local development entry point
import app from "./express-app.js";

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`StudySync running at http://localhost:${PORT}`);
});
