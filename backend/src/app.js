const express = require("express");
const cors = require("cors");
const gameRoutes = require("./routes/gameRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", gameRoutes);

app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

module.exports = app;