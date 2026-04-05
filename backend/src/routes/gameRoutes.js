const express = require("express");
const router = express.Router();
const controller = require("../controllers/gameController");

router.get("/game-state", controller.getState);
router.post("/scan", controller.scanEgg);
router.post("/reset", controller.reset);

module.exports = router;