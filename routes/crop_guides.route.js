import express from "express";
const router = express.Router();
import authMiddleware from "../middlewares/auth.middleware.js";
import {
  createGuide,
  deleteGuide,
  getAllGuides,
  getGuideById,
  updateGuide,
} from "../controllers/crop_guide.js";

import {
  createGuideHeading,
  getAllGuideHeadings,
  deleteHeading,
} from "../controllers/guide_heaing.controller.js";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../confiq/cloudinary.js";
import multer from "multer";
import pool from "../confiq/mysqldb.js";
import path from "path";
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const ext = file.originalname.split(".").pop();

    return {
      resource_type: "auto",
      folder: "my-app-media",
      public_id: `${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
      format: ext,
    };
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "video/mp4",
    ];

    const allowedExtensions = [".jpg", ".jpeg", ".png", ".mp4"];

    const ext = path.extname(file.originalname).toLowerCase();

    const isMimeAllowed = allowedMimeTypes.includes(file.mimetype);
    const isExtAllowed = allowedExtensions.includes(ext);

    if (isMimeAllowed || isExtAllowed) {
      return cb(null, true);
    }

    return cb(new Error("Only images and mp4 videos allowed"));
  },
});
// router.post("/create-guide", authMiddleware, upload.any(), createGuide);
// router.get("/getAll-crop_guides", authMiddleware, getAllGuides);
// router.get("/:id", authMiddleware, getGuideById);
// router.put("/update-crop_guide/:id", authMiddleware, upload.any(), updateGuide);
// router.delete("/delete_crop_guide/:id", authMiddleware, deleteGuide);

// Heading

router.post("/create_headings", authMiddleware, createGuideHeading);
router.delete("/delete_headings/:id", authMiddleware, deleteHeading);
router.get("/get_headings_all", authMiddleware, getAllGuideHeadings);

// Guide Parent
router.post("/guide_parent", authMiddleware, async (req, res) => {
  const { crop_guide_heading_id, crop_id } = req.body;
  console.log(req.body);

  // Validation
  if (!crop_guide_heading_id || !crop_id) {
    return res.status(400).json({
      success: false,
      message: "crop_guide_heading_id and crop_id are required",
    });
  }

  // Check duplicate heading
  const [existingCropHeading] = await pool.query(
    `
      SELECT id
      FROM crop_guide_heading
      WHERE id = ?
      limit 1
      `,
    [crop_guide_heading_id],
  );
  const [existingCrop] = await pool.query(
    `
      SELECT id
      FROM crops
      WHERE id = ?
      `,
    [crop_id],
  );
  console.log(existingCropHeading, existingCrop);

  if (existingCropHeading.length === 0 || existingCrop.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Crop or Heading not found",
    });
  }

  // Insert heading
  const [result] = await pool.query(
    `
      INSERT INTO crop_guide_parent
       (crop_guide_heading_id, crop_id)
      VALUES (?, ?)
      `,
    [crop_guide_heading_id, crop_id],
  );
  return res.status(201).json({
    success: true,
    message: "Guide parent created successfully",
    data: result.insertId,
  });
});

router.get("/guide_parents", authMiddleware, async (req, res) => {
  try {
    const [parents] = await pool.query(
      `
      SELECT
        p.id AS parent_id,
        p.crop_guide_heading_id,
        h.title AS heading_title,
        h.titleHi AS heading_title_hi,
        p.crop_id,
        c.name AS crop_name,
        c.nameHi AS crop_name_hi
      FROM crop_guide_parent p
      JOIN crop_guide_heading h ON h.id = p.crop_guide_heading_id
      JOIN crops c ON c.id = p.crop_id
      ORDER BY h.title, c.name
      
      `,
    );

    return res.status(200).json({
      success: true,
      data: parents,
    });
  } catch (error) {
    console.error("Get Guide Parents Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Check parent exists
    const [parent] = await pool.query(
      `
      SELECT 
        p.id,
        p.crop_id,
        c.name AS crop_name,
        p.crop_guide_heading_id,
        h.title AS heading_title,
        p.created_at,
        p.updated_at

      FROM crop_guide_parent p

      JOIN crops c
        ON c.id = p.crop_id

      JOIN crop_guide_heading h
        ON h.id = p.crop_guide_heading_id

      WHERE p.id = ?
      `,
      [id],
    );

    if (parent.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Guide parent not found",
      });
    }

    // Get details
    const [details] = await pool.query(
      `
      SELECT
        id,
        title,
        description,
        media_url,
        created_at,
        updated_at

      FROM crop_guide_details

      WHERE crop_guide_parent_id = ?
      `,
      [id],
    );

    return res.status(200).json({
      success: true,
      data: {
        ...parent[0],
        details,
      },
    });
  } catch (error) {
    console.error("Get Guide Parent Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

router.delete("/delete_guide_parent/:id", authMiddleware, async (req, res) => {
  console.log("DELETNG GUIDE PARENT", req.params);
  const id = Number(req.params.id);
  try {
    const [existingParent] = await pool.query(
      `
      select id
      from crop_guide_parent
      where id = ?
      `,
      [id],
    );

    if (existingParent.length === 0) {
      return res
        .status(404)
        .json({ success: false, messagee: "Crop Guide parent not found" });
    }
    await pool.query(
      `
        update  crop_guide_parent
        set is_deleted = true
        where id = ?
      `,
      [id],
    );

    return res.status(200).json({
      success: true,
      message: "Guide parent deleted successfully",
    });
  } catch (error) {
    console.log("DELETE GUIDE PARENT Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});
// Guide Details

router.post(
  "/create_guide_details",
  authMiddleware,
  upload.any(),
  async (req, res) => {
    try {
      const { crop_guide_parent_id, details } = req.body;
      console.log(req.body);
      if (!crop_guide_parent_id) {
        return res.status(400).json({
          success: false,
          message: "crop_guide_parent_id is required",
        });
      }

      let parsedDetails;
      try {
        parsedDetails =
          typeof details === "string" ? JSON.parse(details) : details;
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Invalid JSON format in details",
          error: error.message,
        });
      }

      if (!Array.isArray(parsedDetails)) {
        return res.status(400).json({
          success: false,
          message: "details must be an array",
        });
      }

      // Check parent exists
      const [parent] = await pool.query(
        `SELECT id FROM crop_guide_parent WHERE id = ?`,
        [crop_guide_parent_id],
      );
      if (parent.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Guide parent not found",
        });
      }

      // All uploaded files – expects fieldname "media"
      const files = req.files || [];
      let fileIndex = 0;

      const insertValues = parsedDetails.map((item) => {
        // Assign files to this detail sequentially (one file per detail)
        const mediaUrls = [];
        if (fileIndex < files.length) {
          const file = files[fileIndex];
          mediaUrls.push({
            public_id: file.filename,
            file_url: file.path,
          });
          fileIndex++;
        }

        return [
          item.title || null,
          item.titleHi || null,
          item.description || null,
          item.descriptionHi || null,
          JSON.stringify(mediaUrls),
          crop_guide_parent_id,
        ];
      });

      // If you want multiple files per detail, adjust mapping accordingly

      await pool.query(
        `INSERT INTO crop_guide_details
       (title, titleHi, description, descriptionHi, media_url, crop_guide_parent_id)
       VALUES ?`,
        [insertValues],
      );

      return res.status(201).json({
        success: true,
        message: "Guide details created successfully",
      });
    } catch (error) {
      console.error("Create Guide Details Error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  },
);
router.get("/guide_details", authMiddleware, async (req, res) => {
  try {
    const [details] = await pool.query(
      `
      SELECT
        id,
        title,
        titleHi,
        description,
        descriptionHi,  
        media_url,
        created_at,
        updated_at

      FROM crop_guide_details

      ORDER BY id DESC
      `,
    );

    // Parse media JSON
    const formattedDetails = details.map((item) => {
      let media_url = [];
      if (item.media_url) {
        try {
          media_url =
            typeof item.media_url === "string"
              ? JSON.parse(item.media_url)
              : item.media_url;
        } catch {
          media_url = [item.media_url];
        }
      }
      return { ...item, media_url };
    });

    return res.status(200).json({
      success: true,
      count: formattedDetails.length,
      data: formattedDetails,
    });
  } catch (error) {
    console.error("Get Guide Details Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});
router.get("/guide_details/:parentId", authMiddleware, async (req, res) => {
  try {
    const { parentId } = req.params;
    console.log("34567890");
    if (!parentId) {
      return res.status(400).json({
        success: false,
        message: "parentId is required",
      });
    }
    // Check parent exists
    const [parent] = await pool.query(
      `
      SELECT 
        p.id,
        p.crop_id,
        c.name AS crop_name,
        c.nameHi AS crop_name_hi,
        h.title AS heading_title,
        h.titleHi AS heading_title_hi

      FROM crop_guide_parent p

      JOIN crops c
        ON c.id = p.crop_id

      JOIN crop_guide_heading h
        ON h.id = p.crop_guide_heading_id

      WHERE p.id = ?
      `,
      [parentId],
    );

    if (parent.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Guide parent not found",
      });
    }

    // Get details
    const [details] = await pool.query(
      `
      SELECT
        id,
        title,
        titleHi,
        description,
        descriptionHi,
        media_url,
        created_at,
        updated_at

      FROM crop_guide_details

      WHERE crop_guide_parent_id = ?

      ORDER BY id DESC
      `,
      [parentId],
    );

    // Parse media JSON
    const formattedDetails = details.map((item) => {
      let media_url = [];
      if (item.media_url) {
        try {
          media_url =
            typeof item.media_url === "string"
              ? JSON.parse(item.media_url)
              : item.media_url;
        } catch {
          media_url = [item.media_url];
        }
      }
      return { ...item, media_url };
    });

    return res.status(200).json({
      success: true,
      parent: parent[0],
      count: formattedDetails.length,
      data: formattedDetails,
    });
  } catch (error) {
    console.error("Get Guide Details Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

router.put(
  "/update_guide_details/:id",
  authMiddleware,
  upload.any(),
  async (req, res) => {
    try {
      const { id } = req.params;

      const { title, description, titleHi, descriptionHi } = req.body;

      // Existing detail
      const [existing] = await pool.query(
        `
        SELECT *
        FROM crop_guide_details
        WHERE id = ?
        `,
        [id],
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Guide detail not found",
        });
      }

      // Old media
      let media_url = existing[0].media_url
        ? JSON.parse(existing[0].media_url)
        : [];

      // New uploaded files
      const files = req.files || [];

      // Append new images
      if (files.length > 0) {
        const newMedia = files.map((file) => ({
          public_id: file.filename,
          file_url: file.path,
        }));

        media_url = [...media_url, ...newMedia];
      }

      // Update DB
      await pool.query(
        `
        UPDATE crop_guide_details
        SET
          title = ?,
          titleHi = ?,
          description = ?,
          descriptionHi = ?,
          media_url = ?
        WHERE id = ?
        `,
        [
          title || existing[0].title,
          titleHi || existing[0].titleHi,
          description || existing[0].description,
          descriptionHi || existing[0].descriptionHi,
          JSON.stringify(media_url),
          id,
        ],
      );

      // Updated data
      const [updated] = await pool.query(
        `
        SELECT *
        FROM crop_guide_details
        WHERE id = ?
        `,
        [id],
      );

      return res.status(200).json({
        success: true,
        message: "Guide details updated successfully",
        data: {
          ...updated[0],
          media_url: updated[0].media_url
            ? JSON.parse(updated[0].media_url)
            : [],
        },
      });
    } catch (error) {
      console.error("Update Guide Details Error:", error);

      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  },
);

router.delete(
  "/delete_guide_image/:detailId",
  authMiddleware,
  async (req, res) => {
    try {
      const { detailId } = req.params;

      const { public_id } = req.body;

      if (!public_id) {
        return res.status(400).json({
          success: false,
          message: "public_id is required",
        });
      }

      // Existing detail
      const [existing] = await pool.query(
        `
      SELECT *
      FROM crop_guide_details
      WHERE id = ?
      `,
        [detailId],
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Guide detail not found",
        });
      }

      // Existing media
      let media_url = existing[0].media_url
        ? JSON.parse(existing[0].media_url)
        : [];

      // Find image exists
      const imageExists = media_url.find((img) => img.public_id === public_id);

      if (!imageExists) {
        return res.status(404).json({
          success: false,
          message: "Image not found",
        });
      }

      // Delete from cloudinary
      await cloudinary.uploader.destroy(public_id);

      // Remove from array
      media_url = media_url.filter((img) => img.public_id !== public_id);

      // Update DB
      await pool.query(
        `
      UPDATE crop_guide_details
      SET media_url = ?
      WHERE id = ?
      `,
        [JSON.stringify(media_url), detailId],
      );

      return res.status(200).json({
        success: true,
        message: "Image deleted successfully",
        media_url,
      });
    } catch (error) {
      console.error("Delete Guide Image Error:", error);

      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  },
);
router.delete("/delete_guide_details/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query(
      `
      SELECT *
      FROM crop_guide_details
      WHERE id = ?
      `,
      [id],
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Guide details not found",
      });
    }

    // Delete cloudinary images
    // const media = existing[0].media_url
    //   ? JSON.parse(existing[0].media_url)
    //   : [];

    // for (const img of media) {
    //   if (img.public_id) {
    //     await cloudinary.uploader.destroy(img.public_id);
    //   }
    // }

    await pool.query(
      `
        update  crop_guide_details
        set is_deleted = true
        where id = ?
      `,
      [id],
    );

    return res.status(200).json({
      success: true,
      message: "Guide details deleted successfully",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export default router;
