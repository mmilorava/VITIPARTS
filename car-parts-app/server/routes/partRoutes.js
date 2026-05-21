const express = require("express");

const {
  getPartsByCarId,
  createPartForCar,
  updatePart,
  reorderParts,
  deletePart,
} = require("../controllers/partController");
const { protectAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.patch("/cars/:id/parts/reorder", protectAdmin, reorderParts);
router.get("/cars/:id/parts", getPartsByCarId);
router.post("/cars/:id/parts", protectAdmin, createPartForCar);
router.patch("/parts/:id", protectAdmin, updatePart);
router.delete("/parts/:id", protectAdmin, deletePart);

module.exports = router;
