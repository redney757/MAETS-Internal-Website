import app from "./App.js";
import { initADFS } from "./Auth/adfs.js";

const PORT = 3001;

try {
  await initADFS();

  const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });

  server.on("error", console.error);
  server.on("close", () => console.log("SERVER CLOSED"));
} catch (err) {
  console.error("Startup failed:", err);
}