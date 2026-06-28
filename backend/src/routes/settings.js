import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../prisma.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Multer storage for branding files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `branding-${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const removeFile = (filePath) => {
  if (!filePath) return;
  const fullPath = path.resolve(filePath.startsWith('/') ? filePath.substring(1) : filePath);
  fs.access(fullPath, fs.constants.F_OK, (err) => {
    if (!err) {
      fs.unlink(fullPath, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting file:', unlinkErr);
      });
    }
  });
};

// Helper to get setting value or default
async function getSetting(key, defaultValue = '') {
  const setting = await prisma.systemSetting.findUnique({
    where: { key }
  });
  return setting ? setting.value : defaultValue;
}

// Helper to set setting value
async function setSetting(key, value) {
  return prisma.systemSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value }
  });
}

// 1. Get Branding Settings (Public)
router.get('/', async (req, res) => {
  try {
    const siteName = await getSetting('siteName', 'Simply.com');
    const primaryColor = await getSetting('primaryColor', '#8b5cf6');
    const logoUrl = await getSetting('logoUrl', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=100&q=80');
    const pwaUrl = await getSetting('pwaUrl', '');

    res.json({
      siteName,
      primaryColor,
      logoUrl,
      pwaUrl
    });
  } catch (err) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 2. Save Branding Settings (Admin Only)
router.put(
  '/',
  authenticateToken,
  authorizeRoles('ADMIN'),
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'pwa', maxCount: 1 }
  ]),
  async (req, res) => {
    const { siteName, primaryColor } = req.body;

    try {
      if (siteName !== undefined) {
        await setSetting('siteName', siteName);
      }
      if (primaryColor !== undefined) {
        await setSetting('primaryColor', primaryColor);
      }

      // Check for file uploads
      if (req.files) {
        if (req.files.logo && req.files.logo[0]) {
          const oldLogo = await getSetting('logoUrl', '');
          // Remove old custom logo if it exists
          if (oldLogo && oldLogo.includes('/uploads/branding-logo')) {
            removeFile(oldLogo);
          }
          const logoUrl = `/uploads/${req.files.logo[0].filename}`;
          await setSetting('logoUrl', logoUrl);
        }

        if (req.files.pwa && req.files.pwa[0]) {
          const oldPwa = await getSetting('pwaUrl', '');
          // Remove old custom pwa icon if it exists
          if (oldPwa && oldPwa.includes('/uploads/branding-pwa')) {
            removeFile(oldPwa);
          }
          const pwaUrl = `/uploads/${req.files.pwa[0].filename}`;
          await setSetting('pwaUrl', pwaUrl);
        }
      }

      // Fetch fresh settings to return
      const updatedSiteName = await getSetting('siteName', 'Simply.com');
      const updatedPrimaryColor = await getSetting('primaryColor', '#8b5cf6');
      const updatedLogoUrl = await getSetting('logoUrl', '');
      const updatedPwaUrl = await getSetting('pwaUrl', '');

      res.json({
        message: 'Settings updated successfully.',
        settings: {
          siteName: updatedSiteName,
          primaryColor: updatedPrimaryColor,
          logoUrl: updatedLogoUrl,
          pwaUrl: updatedPwaUrl
        }
      });
    } catch (err) {
      console.error('Error saving settings:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  }
);

// Get Payment Gateway Settings (Authenticated Users)
router.get('/payment', authenticateToken, async (req, res) => {
  try {
    const rawVal = await getSetting('payment_settings', null);
    
    // Default fallback values
    let settings = {
      stripe: { enabled: true, secretKey: '', publishableKey: '' },
      paypal: { enabled: true, clientId: '', clientSecret: '' },
      payoneer: { enabled: true, email: 'payoneer@simply.com' },
      manual: { enabled: true, iban: 'AE600000001234567890123', accountName: 'Simply Central Bank' }
    };

    if (rawVal) {
      try {
        settings = JSON.parse(rawVal);
      } catch (e) {
        console.error('Error parsing payment settings:', e);
      }
    }

    // Redact secret keys if user is not an ADMIN
    if (req.user.role !== 'ADMIN') {
      if (settings.stripe) {
        settings.stripe.secretKey = settings.stripe.secretKey ? '••••••••' : '';
      }
      if (settings.paypal) {
        settings.paypal.clientSecret = settings.paypal.clientSecret ? '••••••••' : '';
      }
    }

    res.json(settings);
  } catch (err) {
    console.error('Error getting payment settings:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Save Payment Gateway Settings (Admin Only)
router.put(
  '/payment',
  authenticateToken,
  authorizeRoles('ADMIN'),
  async (req, res) => {
    try {
      const { stripe, paypal, payoneer, manual } = req.body;

      // Load current settings to merge in case of redacted values sent back
      const rawVal = await getSetting('payment_settings', null);
      let currentSettings = {
        stripe: { enabled: true, secretKey: '', publishableKey: '' },
        paypal: { enabled: true, clientId: '', clientSecret: '' },
        payoneer: { enabled: true, email: 'payoneer@simply.com' },
        manual: { enabled: true, iban: 'AE600000001234567890123', accountName: 'Simply Central Bank' }
      };
      if (rawVal) {
        try {
          currentSettings = JSON.parse(rawVal);
        } catch (e) {}
      }

      // Merge and handle password mask (••••••••)
      const newSettings = {
        stripe: {
          enabled: !!stripe?.enabled,
          publishableKey: stripe?.publishableKey || '',
          secretKey: (stripe?.secretKey === '••••••••' || !stripe?.secretKey) 
            ? (currentSettings.stripe?.secretKey || '') 
            : stripe.secretKey
        },
        paypal: {
          enabled: !!paypal?.enabled,
          clientId: paypal?.clientId || '',
          clientSecret: (paypal?.clientSecret === '••••••••' || !paypal?.clientSecret)
            ? (currentSettings.paypal?.clientSecret || '')
            : paypal.clientSecret
        },
        payoneer: {
          enabled: !!payoneer?.enabled,
          email: payoneer?.email || ''
        },
        manual: {
          enabled: !!manual?.enabled,
          iban: manual?.iban || '',
          accountName: manual?.accountName || ''
        }
      };

      await setSetting('payment_settings', JSON.stringify(newSettings));
      res.json({ message: 'Payment gateway settings updated successfully.', settings: newSettings });
    } catch (err) {
      console.error('Error saving payment settings:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  }
);

export default router;
