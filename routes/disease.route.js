import express from "express";
import {
  createDisease,
  getAllDiseases,
  getDiseaseById,
  getDiseasesByCrop,
  updateDisease,
  deleteDisease,
} from "../controllers/disease.controller.js";
import upload from "../middlewares/multer.js";
import authMiddleware from "../middlewares/auth.middleware.js";
const router = express.Router();

router.post(
  "/create",
  authMiddleware,
  upload.array("diseases_image", 10),
  createDisease,
);

router.get("/", authMiddleware, getAllDiseases);

router.get("/crop/:cropId", authMiddleware, getDiseasesByCrop);

router.get("/:id", authMiddleware, getDiseaseById);

router.put(
  "/update/:id",
  authMiddleware,
  upload.array("diseases_image", 10),
  updateDisease,
);

router.delete("/delete/:id", authMiddleware, deleteDisease);

export default router;
