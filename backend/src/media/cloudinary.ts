import { v2 as cloudinary } from 'cloudinary';

import { AppError } from '../http/errors';
import { hasCloudinaryConfigured, loadConfig } from '../config';

const MAX_PROOF_BYTES = 5 * 1024 * 1024;

function ensureConfigured(): void {
  if (!hasCloudinaryConfigured()) {
    throw new AppError(503, 'SERVICE_UNAVAILABLE', 'Proof upload is not configured on the server.');
  }
}

function configureSdk(): void {
  const config = loadConfig();
  cloudinary.config({
    cloud_name: config.cloudinaryCloudName,
    api_key: config.cloudinaryApiKey,
    api_secret: config.cloudinaryApiSecret,
    secure: true,
  });
}

export function decodeProofImageBase64(imageBase64: string): Buffer {
  const raw = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
  if (!raw) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid image data.');
  }
  let buffer: Buffer;
  try {
    buffer = Buffer.from(raw, 'base64');
  } catch {
    throw new AppError(400, 'VALIDATION_ERROR', 'Could not decode image.');
  }
  if (buffer.length === 0 || buffer.length > MAX_PROOF_BYTES) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Image must be between 1 byte and 5 MB.');
  }
  return buffer;
}

export async function uploadExpenseProof(params: {
  expenseId: string;
  buffer: Buffer;
  mimeType: string;
}): Promise<{ url: string; public_id: string }> {
  ensureConfigured();
  configureSdk();

  const folder = `gharsplit/expenses/${params.expenseId}`;

  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        public_id: `proof_${params.expenseId}`,
        overwrite: true,
        format: params.mimeType === 'image/png' ? 'png' : params.mimeType === 'image/webp' ? 'webp' : 'jpg',
      },
      (err, result) => {
        if (err || !result?.secure_url) {
          reject(new AppError(502, 'UPSTREAM_ERROR', 'Could not upload proof to Cloudinary.'));
          return;
        }
        resolve({
          url: result.secure_url,
          public_id: result.public_id,
        });
      },
    );
    upload.end(params.buffer);
  });
}
