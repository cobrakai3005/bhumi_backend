import pool from "../confiq/mysqldb.js";

export const createDisease = async (req, res) => {
  try {
    const {
      crop_id,
      title,
      titleHi,
      description,
      descriptionHi,
      symptoms,
      symptomsHi,
      prevention,
      preventionHi,
      treatment,
      treatmentHi,

      sequence,
    } = req.body;

    if (
      !crop_id ||
      !title ||
      !titleHi ||
      !descriptionHi ||
      !symptoms ||
      !symptomsHi ||
      !prevention ||
      !preventionHi ||
      !treatment ||
      !treatmentHi
    ) {
      return res.status(400).json({
        success: false,
        message: "crop_id, title and titleHi are required",
      });
    }

    const images = req.files?.map((file) => file.path) || [];

    const images_id = req.files?.map((file) => file.filename) || [];
    const [result] = await pool.query(
      `
      INSERT INTO crop_diseases (
        crop_id,
        title,
        titleHi,
        description,
        descriptionHi,
        symptoms,
        symptomsHi,
        prevention,
        preventionHi,
        treatment,
        treatmentHi,
        image,
        image_id,
        sequence
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        crop_id,
        title,
        titleHi,
        description,
        descriptionHi,
        symptoms,
        symptomsHi,
        prevention,
        preventionHi,
        treatment,
        treatmentHi,
        JSON.stringify(images),
        JSON.stringify(images_id),
        sequence || 0,
      ],
    );

    res.status(201).json({
      success: true,
      diseaseId: result.insertId,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getAllDiseases = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT *
      FROM crop_diseases
      WHERE is_deleted = 0
      ORDER BY sequence ASC
    `);

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const getDiseaseById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `
      SELECT *
      FROM crop_diseases
      WHERE id = ?
      AND is_deleted = 0
      `,
      [id],
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Disease not found",
      });
    }

    res.json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const getDiseasesByCrop = async (req, res) => {
  try {
    const { cropId } = req.params;

    const [rows] = await pool.query(
      `
      SELECT *
      FROM crop_diseases
      WHERE crop_id = ?
      AND is_deleted = 0
      ORDER BY sequence ASC
      `,
      [cropId],
    );

    res.json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const updateDisease = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      crop_id,
      title,
      titleHi,
      description,
      descriptionHi,
      symptoms,
      symptomsHi,
      prevention,
      preventionHi,
      treatment,
      treatmentHi,
      sequence,
    } = req.body;

    const images = req.files?.map((file) => file.path) || [];
    const imageIds = req.files?.map((file) => file.filename) || [];

    const [existing] = await pool.query(
      `SELECT * FROM crop_diseases WHERE id = ?`,
      [id],
    );

    if (!existing.length) {
      return res.status(404).json({
        success: false,
        message: "Disease not found",
      });
    }

    const oldDisease = existing[0];

    const finalImages =
      images.length > 0 ? JSON.stringify(images) : oldDisease.image;

    const finalImageIds =
      imageIds.length > 0 ? JSON.stringify(imageIds) : oldDisease.image_id;

    const [result] = await pool.query(
      `
      UPDATE crop_diseases
      SET
        crop_id = ?,
        title = ?,
        titleHi = ?,
        description = ?,
        descriptionHi = ?,
        symptoms = ?,
        symptomsHi = ?,
        prevention = ?,
        preventionHi = ?,
        treatment = ?,
        treatmentHi = ?,
        image = ?,
        image_id = ?,
        sequence = ?
      WHERE id = ?
      `,
      [
        crop_id,
        title,
        titleHi,
        description,
        descriptionHi,
        symptoms,
        symptomsHi,
        prevention,
        preventionHi,
        treatment,
        treatmentHi,
        finalImages,
        finalImageIds,
        sequence,
        id,
      ],
    );

    res.json({
      success: true,
      message: "Disease updated successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const deleteDisease = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      `
      UPDATE crop_diseases
      SET is_deleted = 1
      WHERE id = ?
      `,
      [id],
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Disease not found",
      });
    }

    res.json({
      success: true,
      message: "Disease deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
