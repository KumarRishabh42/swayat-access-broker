import "dotenv/config";
import express from "express";
import cors from "cors";
import routes from "./routes.ts";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/api", routes);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`[Server] Policy backend listening on http://localhost:${PORT}`);
});
