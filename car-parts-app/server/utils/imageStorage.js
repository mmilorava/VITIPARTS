const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");

const UPLOADS_ROUTE = "/uploads";
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");
const DATA_URL_PATTERN = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/;
const MIME_EXTENSION_MAP = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const normalizeImageValue = (imageValue) =>
  typeof imageValue === "string" ? imageValue.trim() : "";

const saveUploadedImage = async (imageValue, filePrefix = "image") => {
  const trimmedImage = normalizeImageValue(imageValue);

  if (!trimmedImage) {
    return "";
  }

  const imageMatch = trimmedImage.match(DATA_URL_PATTERN);

  if (!imageMatch) {
    return trimmedImage;
  }

  const mimeType = imageMatch[1].toLowerCase();
  const fileExtension = MIME_EXTENSION_MAP[mimeType];

  if (!fileExtension) {
    throw new Error("Unsupported image format. Please use PNG, JPG, or WEBP.");
  }

  await fs.mkdir(UPLOADS_DIR, { recursive: true });

  const fileName = `${filePrefix}-${crypto.randomUUID()}.${fileExtension}`;
  const outputPath = path.join(UPLOADS_DIR, fileName);
  const imageBuffer = Buffer.from(imageMatch[2], "base64");

  await fs.writeFile(outputPath, imageBuffer);

  return `${UPLOADS_ROUTE}/${fileName}`;
};

const deleteStoredImage = async (imageValue) => {
  const trimmedImage = normalizeImageValue(imageValue);

  if (!trimmedImage.startsWith(`${UPLOADS_ROUTE}/`)) {
    return;
  }

  const fileName = path.basename(trimmedImage);
  const imagePath = path.join(UPLOADS_DIR, fileName);

  try {
    await fs.unlink(imagePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
};

const replaceStoredImage = async (
  currentImageValue,
  nextImageValue,
  filePrefix = "image"
) => {
  const currentImage = normalizeImageValue(currentImageValue);
  const nextImage = normalizeImageValue(nextImageValue);

  if (nextImage === currentImage) {
    return currentImage;
  }

  if (!nextImage) {
    await deleteStoredImage(currentImage);
    return "";
  }

  const storedImage = await saveUploadedImage(nextImage, filePrefix);

  if (currentImage && currentImage !== storedImage) {
    await deleteStoredImage(currentImage);
  }

  return storedImage;
};

module.exports = {
  UPLOADS_DIR,
  UPLOADS_ROUTE,
  deleteStoredImage,
  replaceStoredImage,
  saveUploadedImage,
};
