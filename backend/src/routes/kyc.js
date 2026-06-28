import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../prisma.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Multer storage configuration for KYC files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `kyc-${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, JPEG, PNG, or PDF files are allowed.'), false);
    }
  }
});

const uploadKyc = upload.fields([
  { name: 'frontImage', maxCount: 1 },
  { name: 'backImage', maxCount: 1 }
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

// 1. Get KYC Status and info (authenticated user)
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({
      kycStatus: user.kycStatus,
      kycFullName: user.kycFullName,
      kycDocumentType: user.kycDocumentType,
      kycDocumentNumber: user.kycDocumentNumber,
      kycFrontImage: user.kycFrontImage,
      kycBackImage: user.kycBackImage,
      kycSubmittedAt: user.kycSubmittedAt,
      status: user.status
    });
  } catch (err) {
    console.error('Error fetching KYC status:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 2. Submit KYC info
router.post('/submit', authenticateToken, uploadKyc, async (req, res) => {
  const { fullName, documentType, documentNumber } = req.body;
  const userId = req.user.id;

  if (!fullName || !documentType || !documentNumber) {
    // Cleanup uploaded files on validation error
    if (req.files?.frontImage) removeFile(req.files.frontImage[0].path);
    if (req.files?.backImage) removeFile(req.files.backImage[0].path);
    return res.status(400).json({ error: 'Full name, document type, and document number are required.' });
  }

  if (!req.files?.frontImage || !req.files?.backImage) {
    if (req.files?.frontImage) removeFile(req.files.frontImage[0].path);
    if (req.files?.backImage) removeFile(req.files.backImage[0].path);
    return res.status(400).json({ error: 'Both front and back document images are required.' });
  }

  const frontPath = `/uploads/${req.files.frontImage[0].filename}`;
  const backPath = `/uploads/${req.files.backImage[0].filename}`;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      removeFile(req.files.frontImage[0].path);
      removeFile(req.files.backImage[0].path);
      return res.status(404).json({ error: 'User not found.' });
    }

    // Clean up old files if they existed
    if (user.kycFrontImage) removeFile(user.kycFrontImage.substring(1));
    if (user.kycBackImage) removeFile(user.kycBackImage.substring(1));

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        kycStatus: 'PENDING',
        kycFullName: fullName,
        kycDocumentType: documentType,
        kycDocumentNumber: documentNumber,
        kycFrontImage: frontPath,
        kycBackImage: backPath,
        kycSubmittedAt: new Date()
      }
    });

    res.json({
      message: 'KYC documents submitted successfully.',
      kycStatus: updatedUser.kycStatus,
      kycFullName: updatedUser.kycFullName,
      kycDocumentType: updatedUser.kycDocumentType,
      kycDocumentNumber: updatedUser.kycDocumentNumber,
      kycFrontImage: updatedUser.kycFrontImage,
      kycBackImage: updatedUser.kycBackImage,
      kycSubmittedAt: updatedUser.kycSubmittedAt
    });

  } catch (err) {
    console.error('Error submitting KYC:', err);
    if (req.files?.frontImage?.[0]?.path) removeFile(req.files.frontImage[0].path);
    if (req.files?.backImage?.[0]?.path) removeFile(req.files.backImage[0].path);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
