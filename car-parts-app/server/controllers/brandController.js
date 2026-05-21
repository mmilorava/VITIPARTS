const mongoose = require("mongoose");

const Brand = require("../models/Brand");
const Car = require("../models/Car");
const Part = require("../models/Part");
const {
  ensureSortOrder,
  getNextSortOrder,
  reorderDocuments,
} = require("../utils/ordering");
const {
  deleteStoredImage,
  replaceStoredImage,
  saveUploadedImage,
} = require("../utils/imageStorage");

const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const brandFallbackSort = { name: 1, createdAt: 1, _id: 1 };
const carFallbackSort = { brand: 1, model: 1, year: 1, createdAt: 1, _id: 1 };

const getAllBrands = async (req, res) => {
  try {
    await ensureSortOrder(Brand, {}, brandFallbackSort);

    const brands = await Brand.find().sort({ sortOrder: 1, _id: 1 });
    res.status(200).json(brands);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch brands." });
  }
};

const getBrandById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid brand ID." });
    }

    const brand = await Brand.findById(id);

    if (!brand) {
      return res.status(404).json({ message: "Brand not found." });
    }

    res.status(200).json(brand);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch brand." });
  }
};

const getCarsByBrandId = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid brand ID." });
    }

    const brand = await Brand.findById(id);

    if (!brand) {
      return res.status(404).json({ message: "Brand not found." });
    }

    await ensureSortOrder(Car, {}, carFallbackSort);

    const cars = await Car.find({ brandId: id }).sort({ sortOrder: 1, _id: 1 });

    res.status(200).json(cars);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch cars for this brand." });
  }
};

const createBrand = async (req, res) => {
  try {
    const { name, image, description } = req.body;
    const trimmedName = name?.trim();

    const existingBrand = await Brand.findOne({
      name: { $regex: `^${escapeRegex(trimmedName)}$`, $options: "i" },
    });

    if (existingBrand) {
      return res.status(400).json({ message: "This brand already exists." });
    }

    await ensureSortOrder(Brand, {}, brandFallbackSort);

    const storedImage = await saveUploadedImage(image, "brand");
    const nextSortOrder = await getNextSortOrder(Brand);

    const newBrand = await Brand.create({
      name: trimmedName,
      image: storedImage,
      description,
      sortOrder: nextSortOrder,
    });

    // If older cars were saved before Brand support was added, link them when
    // the admin creates the matching brand name.
    await Car.updateMany(
      {
        brand: { $regex: `^${escapeRegex(trimmedName)}$`, $options: "i" },
        $or: [{ brandId: { $exists: false } }, { brandId: null }],
      },
      {
        brandId: newBrand._id,
        brand: newBrand.name,
      }
    );

    res.status(201).json(newBrand);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Failed to create brand." });
  }
};

const updateBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, image, description } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid brand ID." });
    }

    const brand = await Brand.findById(id);

    if (!brand) {
      return res.status(404).json({ message: "Brand not found." });
    }

    const trimmedName = name?.trim();
    const existingBrand = await Brand.findOne({
      _id: { $ne: id },
      name: { $regex: `^${escapeRegex(trimmedName)}$`, $options: "i" },
    });

    if (existingBrand) {
      return res.status(400).json({ message: "This brand already exists." });
    }

    const previousName = brand.name;

    brand.name = trimmedName;
    brand.description = description;
    brand.image = await replaceStoredImage(brand.image, image, "brand");

    await brand.save();

    if (previousName !== brand.name) {
      await Car.updateMany({ brandId: brand._id }, { brand: brand.name });
    }

    res.status(200).json(brand);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Failed to update brand." });
  }
};

const reorderBrands = async (req, res) => {
  try {
    await ensureSortOrder(Brand, {}, brandFallbackSort);
    await reorderDocuments(Brand, req.body?.orderedIds);

    const brands = await Brand.find().sort({ sortOrder: 1, _id: 1 });
    res.status(200).json(brands);
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to reorder brands.",
    });
  }
};

const deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid brand ID." });
    }

    const brand = await Brand.findById(id);

    if (!brand) {
      return res.status(404).json({ message: "Brand not found." });
    }

    const brandCars = await Car.find({ brandId: id }).select("_id image");
    const carIds = brandCars.map((car) => car._id);

    if (carIds.length > 0) {
      const carParts = await Part.find({ carId: { $in: carIds } }).select(
        "image"
      );

      await Promise.all(carParts.map((part) => deleteStoredImage(part.image)));
      await Part.deleteMany({ carId: { $in: carIds } });
      await Promise.all(brandCars.map((car) => deleteStoredImage(car.image)));
      await Car.deleteMany({ brandId: id });
    }

    await deleteStoredImage(brand.image);
    await Brand.findByIdAndDelete(id);

    res.status(200).json({ message: "Brand deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete brand." });
  }
};

module.exports = {
  getAllBrands,
  getBrandById,
  getCarsByBrandId,
  createBrand,
  updateBrand,
  reorderBrands,
  deleteBrand,
};
