import crypto from 'node:crypto';
import { env } from '../config/env.js';

export type UploadSignaturePayload = {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
  publicId: string;
  allowedFormats: string[];
  maxFileSize: number;
};

const allowedFormatsList = ['gif', 'jpeg', 'jpg', 'png', 'webp'];
const allowedFormats = allowedFormatsList.join(',');

export const generateUploadSignature = (options: {
  userId: string;
  folderName: 'profiles' | 'posts';
}): UploadSignaturePayload => {
  const { userId, folderName } = options;
  const timestamp = Math.round(Date.now() / 1000);
  const folder = `odin-book/${folderName}`;
  const publicId = `user_${userId}_${timestamp}`;

  const paramsToSign: Record<string, string | number> = {
    allowed_formats: allowedFormats,
    folder,
    public_id: publicId,
    resource_type: 'image',
    timestamp,
  };

  const signatureBase = Object.keys(paramsToSign)
    .sort()
    .map((key) => `${key}=${paramsToSign[key]}`)
    .join('&');

  const signature = crypto
    .createHash('sha1')
    .update(signatureBase + env.CLOUDINARY_API_SECRET)
    .digest('hex');

  return {
    signature,
    timestamp,
    apiKey: env.CLOUDINARY_API_KEY,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    folder,
    publicId,
    allowedFormats: allowedFormatsList,
    maxFileSize: 5_000_000,
  };
};
