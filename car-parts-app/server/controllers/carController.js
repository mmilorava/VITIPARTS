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
const carFallbackSort = { brand: 1, model: 1, year: 1, createdAt: 1, _id: 1 };

const getAllCars = async (req, res) => {
  try {
    await ensureSortOrder(Car, {}, carFallbackSort);

    const cars = await Car.find().sort({ sortOrder: 1, _id: 1 });
    res.status(200).json(cars);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch cars." });
  }
};

const getCarById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid car ID." });
    }

    const car = await Car.findById(id);

    if (!car) {
      return res.status(404).json({ message: "Car not found." });
    }

    res.status(200).json(car);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch car." });
  }
};

const createCar = async (req, res) => {
  try {
    const { brandId, model, year, image, description } = req.body;

    if (!mongoose.Types.ObjectId.isValid(brandId)) {
      return res.status(400).json({ message: "Please choose a valid brand." });
    }

    const brand = await Brand.findById(brandId);

    if (!brand) {
      return res.status(404).json({ message: "Selected brand was not found." });
    }

    await ensureSortOrder(Car, {}, carFallbackSort);

    const storedImage = await saveUploadedImage(image, "car");
    const nextSortOrder = await getNextSortOrder(Car);

    const newCar = await Car.create({
      brandId: brand._id,
      brand: brand.name,
      model,
      year,
      image: storedImage,
      description,
      sortOrder: nextSortOrder,
    });

    res.status(201).json(newCar);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Failed to create car." });
  }
};

const updateCar = async (req, res) => {
  try {
    const { id } = req.params;
    const { brandId, model, year, image, description } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid car ID." });
    }

    if (!mongoose.Types.ObjectId.isValid(brandId)) {
      return res.status(400).json({ message: "Please choose a valid brand." });
    }

    const car = await Car.findById(id);

    if (!car) {
      return res.status(404).json({ message: "Car not found." });
    }

    const brand = await Brand.findById(brandId);

    if (!brand) {
      return res.status(404).json({ message: "Selected brand was not found." });
    }

    car.brandId = brand._id;
    car.brand = brand.name;
    car.model = model;
    car.year = year;
    car.description = description;
    car.image = await replaceStoredImage(car.image, image, "car");

    await car.save();

    res.status(200).json(car);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Failed to update car." });
  }
};

const reorderCars = async (req, res) => {
  try {
    await ensureSortOrder(Car, {}, carFallbackSort);
    await reorderDocuments(Car, req.body?.orderedIds);

    const cars = await Car.find().sort({ sortOrder: 1, _id: 1 });
    res.status(200).json(cars);
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to reorder cars.",
    });
  }
};

const deleteCar = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid car ID." });
    }

    const deletedCar = await Car.findByIdAndDelete(id);

    if (!deletedCar) {
      return res.status(404).json({ message: "Car not found." });
    }

    const carParts = await Part.find({ carId: id }).select("image");

    await Promise.all(carParts.map((part) => deleteStoredImage(part.image)));
    // Remove parts that belong to the deleted car.
    await Part.deleteMany({ carId: id });
    await deleteStoredImage(deletedCar.image);

    res.status(200).json({ message: "Car deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete car." });
  }
};

module.exports = {
  getAllCars,
  getCarById,
  createCar,
  updateCar,
  reorderCars,
  deleteCar,
};
