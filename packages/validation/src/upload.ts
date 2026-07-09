import z from 'zod';

export const CloudinaryFolderQuerySchema = z.object({
  folder: z.enum(['profiles', 'posts'], {
    error: "Folder query must be strictly 'profiles' or 'posts'",
  }),
});

export type CloudinaryFolderQueryInput = z.infer<
  typeof CloudinaryFolderQuerySchema
>;
