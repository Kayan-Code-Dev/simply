import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../prisma.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    // Optional filtering, e.g. allowing certain extensions
    cb(null, true);
  }
});

const uploadFields = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'file', maxCount: 1 }
]);

// Helper to remove files
const removeFile = (filePath) => {
  if (!filePath) return;
  const fullPath = path.resolve(filePath);
  fs.access(fullPath, fs.constants.F_OK, (err) => {
    if (!err) {
      fs.unlink(fullPath, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting file:', unlinkErr);
      });
    }
  });
};

// 1. Get all news/announcements (User & Admin access)
router.get('/', authenticateToken, async (req, res) => {
  const { category, isFeatured } = req.query;

  try {
    const where = {};
    if (category && category !== 'LATEST') {
      if (category === 'FEATURED') {
        where.isFeatured = true;
      } else {
        where.category = category.toUpperCase();
      }
    }
    if (isFeatured === 'true') {
      where.isFeatured = true;
    }

    const newsList = await prisma.news.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json(newsList);
  } catch (err) {
    console.error('Error fetching news:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 2. Get single news and increment view count
router.get('/:id', authenticateToken, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID.' });

  try {
    const newsItem = await prisma.news.update({
      where: { id },
      data: { views: { increment: 1 } }
    });
    res.json(newsItem);
  } catch (err) {
    console.error('Error fetching single news:', err);
    res.status(404).json({ error: 'News item not found.' });
  }
});

// 3. Create news announcement (Admin only)
router.post('/', authenticateToken, authorizeRoles('ADMIN'), uploadFields, async (req, res) => {
  const { title, content, category, isFeatured } = req.body;

  if (!title || !content || !category) {
    // Cleanup uploaded files on validation error
    if (req.files?.image) removeFile(req.files.image[0].path);
    if (req.files?.file) removeFile(req.files.file[0].path);
    return res.status(400).json({ error: 'Title, content and category are required.' });
  }

  const imageUrl = req.files?.image ? `/uploads/${req.files.image[0].filename}` : null;
  const fileUrl = req.files?.file ? `/uploads/${req.files.file[0].filename}` : null;

  try {
    const newsItem = await prisma.news.create({
      data: {
        title,
        content,
        category: category.toUpperCase(),
        imageUrl,
        fileUrl,
        isFeatured: isFeatured === 'true' || isFeatured === true,
        views: 0
      }
    });

    res.status(201).json(newsItem);
  } catch (err) {
    console.error('Error creating news:', err);
    // Cleanup files on db error
    if (imageUrl) removeFile(imageUrl.substring(1));
    if (fileUrl) removeFile(fileUrl.substring(1));
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 4. Update news announcement (Admin only)
router.put('/:id', authenticateToken, authorizeRoles('ADMIN'), uploadFields, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID.' });

  const { title, content, category, isFeatured } = req.body;

  try {
    const existing = await prisma.news.findUnique({ where: { id } });
    if (!existing) {
      if (req.files?.image) removeFile(req.files.image[0].path);
      if (req.files?.file) removeFile(req.files.file[0].path);
      return res.status(404).json({ error: 'News item not found.' });
    }

    const data = {};
    if (title !== undefined) data.title = title;
    if (content !== undefined) data.content = content;
    if (category !== undefined) data.category = category.toUpperCase();
    if (isFeatured !== undefined) data.isFeatured = isFeatured === 'true' || isFeatured === true;

    if (req.files?.image) {
      data.imageUrl = `/uploads/${req.files.image[0].filename}`;
      if (existing.imageUrl) removeFile(existing.imageUrl.substring(1));
    }
    if (req.files?.file) {
      data.fileUrl = `/uploads/${req.files.file[0].filename}`;
      if (existing.fileUrl) removeFile(existing.fileUrl.substring(1));
    }

    const updated = await prisma.news.update({
      where: { id },
      data
    });

    res.json(updated);
  } catch (err) {
    console.error('Error updating news:', err);
    if (req.files?.image) removeFile(req.files.image[0].path);
    if (req.files?.file) removeFile(req.files.file[0].path);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 5. Delete news announcement (Admin only)
router.delete('/:id', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID.' });

  try {
    const existing = await prisma.news.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'News item not found.' });

    await prisma.news.delete({ where: { id } });

    // Cleanup assets
    if (existing.imageUrl) removeFile(existing.imageUrl.substring(1));
    if (existing.fileUrl) removeFile(existing.fileUrl.substring(1));

    res.json({ message: 'News item deleted successfully.' });
  } catch (err) {
    console.error('Error deleting news:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
