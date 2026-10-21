import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '../../common/prisma';
import { requireAuth, requireWalletRole, AuthRequest } from '../auth/auth.middleware';
import { sendSuccess, sendError } from '../../common/response';

export const attachmentRouter = Router();

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * POST /api/v1/wallets/:walletId/attachments
 * Upload a receipt image or document (as base64 or file data).
 * Accessible by all wallet members (Admin, Pengelola, Warga).
 */
attachmentRouter.post(
  '/wallets/:walletId/attachments',
  requireAuth,
  requireWalletRole(),
  async (req: AuthRequest, res: Response) => {
    try {
      const walletId = String(req.params.walletId);
      const actorId = req.user!.id;
      const { filename, mimeType, base64Data } = req.body;

      if (!base64Data || !filename) {
        return sendError(res, 'INVALID_PAYLOAD', 'File base64 dan nama file wajib disertakan.', 400);
      }

      // Extract pure base64 if data URL prefix exists
      let pureBase64 = base64Data;
      let detectedMime = mimeType || 'image/jpeg';
      if (base64Data.startsWith('data:')) {
        const matches = base64Data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          detectedMime = matches[1];
          pureBase64 = matches[2];
        }
      }

      const buffer = Buffer.from(pureBase64, 'base64');
      const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
      const safeFilename = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
      const storageKey = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}_${safeFilename}`;
      const filePath = path.join(UPLOADS_DIR, storageKey);

      fs.writeFileSync(filePath, buffer);

      const attachment = await prisma.attachment.create({
        data: {
          walletId,
          uploadedBy: actorId,
          storageKey,
          originalFilename: safeFilename,
          mimeType: detectedMime,
          sizeBytes: BigInt(buffer.length),
          checksum,
        },
      });

      return sendSuccess(
        res,
        {
          id: attachment.id,
          originalFilename: attachment.originalFilename,
          mimeType: attachment.mimeType,
          sizeBytes: Number(attachment.sizeBytes),
          checksum: attachment.checksum,
          url: `/api/v1/attachments/${attachment.id}`,
          createdAt: attachment.createdAt,
        },
        201
      );
    } catch (err: any) {
      return sendError(res, err.code || 'INTERNAL_ERROR', err.message || 'Gagal mengunggah berkas.', err.status || 500);
    }
  }
);

/**
 * GET /api/v1/attachments/:attachmentId
 * View or download an attachment by ID.
 */
attachmentRouter.get('/attachments/:attachmentId', async (req, res) => {
  try {
    const attachmentId = String(req.params.attachmentId);
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      return sendError(res, 'NOT_FOUND', 'Berkas lampiran tidak ditemukan.', 404);
    }

    const filePath = path.join(UPLOADS_DIR, attachment.storageKey);
    if (!fs.existsSync(filePath)) {
      // If file doesn't exist on disk, return an informative JSON error or transparent SVG placeholder
      return sendError(res, 'FILE_NOT_FOUND', 'Berkas fisik tidak ditemukan di server.', 404);
    }

    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${attachment.originalFilename}"`);
    const stream = fs.createReadStream(filePath);
    return stream.pipe(res);
  } catch (err: any) {
    return sendError(res, 'INTERNAL_ERROR', err.message || 'Gagal memuat berkas.', 500);
  }
});
