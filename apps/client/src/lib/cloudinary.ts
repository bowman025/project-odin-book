import type { CloudinaryFolderQueryInput } from '@project-odin-book/validation';
import { CloudinaryFolderQuerySchema } from '@project-odin-book/validation';
import { apiFetch } from './api.js';

type CloudinarySignatureResponse = {
  status: string;
  data: {
    uploadConfig: {
      signature: string;
      timestamp: number;
      apiKey: string;
      cloudName: string;
      folder: string;
      publicId: string;
      allowedFormats: string[];
      maxFileSize: number;
    };
  };
};

export const uploadImageToCloudinary = async (
  file: File,
  folderInput: CloudinaryFolderQueryInput['folder'],
): Promise<string> => {
  const validationResult = CloudinaryFolderQuerySchema.safeParse({
    folder: folderInput,
  });
  if (!validationResult.success) {
    throw new Error(
      validationResult.error.issues[0]?.message ||
        'Invalid upload folder selected.',
    );
  }

  const { folder } = validationResult.data;

  const signatureResponse = await apiFetch(
    `/uploads/signature?folder=${folder}`,
  );

  if (!signatureResponse.ok) {
    throw new Error(
      'Could not set up secure upload session. Please try again.',
    );
  }

  const body: CloudinarySignatureResponse = await signatureResponse.json();
  const config = body.data.uploadConfig;

  if (file.size > config.maxFileSize) {
    const maxMb = config.maxFileSize / 1_000_000;
    throw new Error(
      `This file is too large. The maximum size allowed is ${maxMb}MB.`,
    );
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', config.apiKey);
  formData.append('timestamp', config.timestamp.toString());
  formData.append('signature', config.signature);
  formData.append('folder', config.folder);
  formData.append('public_id', config.publicId);
  formData.append('allowed_formats', config.allowedFormats.join(','));

  const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`;
  const uploadResponse = await fetch(cloudinaryUrl, {
    method: 'POST',
    body: formData,
  });

  if (!uploadResponse.ok) {
    const errorBody = await uploadResponse.json().catch(() => ({}));
    throw new Error(
      errorBody.error?.message ||
        'Failed to upload image. Please try a different file.',
    );
  }

  const result = await uploadResponse.json();
  return result.secure_url;
};
