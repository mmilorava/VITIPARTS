const mongoose = require("mongoose");

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
const partFallbackSort = { createdAt: -1, _id: 1 };

const getPartsByCarId = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid car ID." });
    }

    const car = await Car.findById(id);

    if (!car) {
      return res.status(404).json({ message: "Car not found." });
    }

    await ensureSortOrder(Part, { carId: id }, partFallbackSort);

    const parts = await Part.find({ carId: id }).sort({ sortOrder: 1, _id: 1 });

    res.status(200).json(parts);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch parts." });
  }
};

const createPartForCar = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, price, category, condition, image, description } =
      req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid car ID." });
    }

    const car = await Car.findById(id);

    if (!car) {
      return res.status(404).json({ message: "Car not found." });
    }

    await ensureSortOrder(Part, { carId: id }, partFallbackSort);

    const storedImage = await saveUploadedImage(image, "part");
    const nextSortOrder = await getNextSortOrder(Part, { carId: id });

    const newPart = await Part.create({
      carId: id,
      name,
      code,
      price,
      category,
      condition,
      image: storedImage,
      description,
      sortOrder: nextSortOrder,
    });

    res.status(201).json(newPart);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Failed to create part." });
  }
};

const updatePart = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, price, category, condition, image, description } =
      req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid part ID." });
    }

    const part = await Part.findById(id);

    if (!part) {
      return res.status(404).json({ message: "Part not found." });
    }

    part.name = name;
    part.code = code;
    part.price = price;
    part.category = category;
    part.condition = condition;
    part.description = description;
    part.image = await replaceStoredImage(part.image, image, "part");

    await part.save();

    res.status(200).json(part);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Failed to update part." });
  }
};

const reorderParts = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid car ID." });
    }

    await ensureSortOrder(Part, { carId: id }, partFallbackSort);
    await reorderDocuments(Part, req.body?.orderedIds, { carId: id });

    const parts = await Part.find({ carId: id }).sort({ sortOrder: 1, _id: 1 });
    res.status(200).json(parts);
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to reorder parts.",
    });
  }
};

const deletePart = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid part ID." });
    }

    const deletedPart = await Part.findByIdAndDelete(id);

    if (!deletedPart) {
      return res.status(404).json({ message: "Part not found." });
    }

    await deleteStoredImage(deletedPart.image);

    res.status(200).json({ message: "Part deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete part." });
  }
};

module.exports = {
  getPartsByCarId,
  createPartForCar,
  updatePart,
  reorderParts,
  deletePart,
};
