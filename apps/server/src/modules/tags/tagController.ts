import { TagSuggestionQuerySchema } from '@project-odin-book/validation';
import type { NextFunction, Request, Response } from 'express';
import { fetchTagSuggestions } from './tagService.js';

export const getTagSuggestions = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const queryResult = TagSuggestionQuerySchema.safeParse(req.query);

  if (!queryResult.success) {
    return next(queryResult.error);
  }

  try {
    const { q } = queryResult.data;
    const suggestions = await fetchTagSuggestions(q);

    return res.status(200).json({
      status: 'success',
      data: suggestions,
    });
  } catch (error) {
    return next(error);
  }
};
