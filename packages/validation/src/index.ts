import { z } from 'zod';

export const RegisterSchema = z
  .object({
    username: z
      .string()
      .min(3, { error: 'Username must be at least 3 characters long' })
      .max(20, { error: 'Username cannot exceed 20 characters' })
      .regex(/^[a-zA-Z0-9_]+$/, {
        error: 'Username can only contain letters, numbers, and underscores',
      }),

    email: z
      .email({ error: 'Please enter a valid email address' })
      .toLowerCase(),

    password: z
      .string()
      .min(8, { error: 'Password must be at least 8 characters long' })
      .regex(/[A-Z]/, {
        error: 'Password must contain at least one uppercase letter',
      })
      .regex(/[0-9]/, { error: 'Password must contain at least one number' })
      .regex(/[^a-zA-Z0-9]/, {
        error: 'Password must contain at least one special character',
      }),

    confirmPassword: z.string({ error: 'Please confirm your password' }),
  })
  .refine(
    (data) =>
      !data.password.toLowerCase().includes(data.username.toLowerCase()),
    {
      error: 'Password cannot contain your username',
      path: ['password'],
    },
  )
  .refine(
    (data) =>
      !data.password
        .toLowerCase()
        .includes(data.email.split('@')[0]?.toLowerCase() ?? ''),
    {
      error: 'Password cannot contain parts of your email address',
      path: ['password'],
    },
  )
  .refine((data) => data.password === data.confirmPassword, {
    error: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  username: z.string().min(1, { error: 'Username or email is required' }),

  password: z.string().min(1, { error: 'Password is required' }),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const UpdateProfileSchema = z.object({
  bio: z
    .string()
    .trim()
    .max(160, { error: 'Bio cannot exceed 160 characters' })
    .transform((val) => (val === '' ? null : val))
    .nullable()
    .optional(),

  profilePicture: z
    .url({
      protocol: /^https$/,
      hostname: /^(.*\.)?cloudinary\.com$/,
      error: 'Profile picture URL must be a valid Cloudinary HTTPS URL',
    })
    .nullable()
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

export const CreatePostSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, { error: 'Post content cannot be empty' })
    .max(280, { error: 'Post cannot exceed 280 characters' }),

  imageUrl: z
    .url({
      protocol: /^https$/,
      hostname: /^(.*\.)?cloudinary\.com$/,
      error: 'Image URL must be a valid Cloudinary HTTPS URL',
    })
    .nullable()
    .optional(),

  tags: z.array(z.string()).optional(),
});

export type CreatePostInput = z.infer<typeof CreatePostSchema>;
