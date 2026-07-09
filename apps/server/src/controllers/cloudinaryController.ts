import { CloudinaryFolderQuerySchema } from '@project-odin-book/validation';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError.js';
import { generateUploadSignature } from '../services/cloudinaryService.js';

export const getUploadSignature = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const queryResult = CloudinaryFolderQuerySchema.safeParse(req.query);

  if (!queryResult.success) {
    return next(queryResult.error);
  }

  try {
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return next(new AppError('Authentication context required', 401));
    }

    const { folder } = queryResult.data;

    const uploadConfig = generateUploadSignature({
      userId: currentUserId,
      folderName: folder,
    });

    return res.status(200).json({
      status: 'success',
      data: { uploadConfig },
    });
  } catch (error) {
    return next(error);
  }
};
