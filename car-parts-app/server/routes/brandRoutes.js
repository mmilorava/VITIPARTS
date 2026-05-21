const express = require("express");

const {
  getAllBrands,
  getBrandById,
  getCarsByBrandId,
  createBrand,
  updateBrand,
  reorderBrands,
  deleteBrand,
} = require("../controllers/brandController");
const { protectAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getAllBrands);
router.patch("/reorder", protectAdmin, reorderBrands);
router.get("/:id/cars", getCarsByBrandId);
router.get("/:id", getBrandById);
router.post("/", protectAdmin, createBrand);
router.patch("/:id", protectAdmin, updateBrand);
router.delete("/:id", protectAdmin, deleteBrand);

module.exports = router;
