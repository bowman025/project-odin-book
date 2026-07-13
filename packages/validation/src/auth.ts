import { z } from 'zod';

export const getEmailPrefix = (email: string): string | null => {
  const [prefix] = email.split('@');
  return prefix ? prefix.toLowerCase() : null;
};

const basePasswordSchema = z
  .string()
  .min(8, { error: 'Password must be at least 8 characters long' })
  .max(100, { error: 'Password cannot exceed 100 characters' })
  .regex(/[A-Z]/, {
    error: 'Password must contain at least one uppercase letter',
  })
  .regex(/[0-9]/, { error: 'Password must contain at least one number' })
  .regex(/[^a-zA-Z0-9]/, {
    error: 'Password must contain at least one special character',
  });

export const RegisterSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, { error: 'Username must be at least 3 characters long' })
      .max(20, { error: 'Username cannot exceed 20 characters' })
      .regex(/^[a-zA-Z0-9_]+$/, {
        error: 'Username can only contain letters, numbers, and underscores',
      }),

    email: z
      .email({ error: 'Please enter a valid email address' })
      .toLowerCase(),

    password: basePasswordSchema,
    confirmPassword: z
      .string()
      .min(1, { error: 'Please confirm your password' }),
  })
  .refine(
    (data) => {
      const password = data.password.toLowerCase();
      const emailPrefix = getEmailPrefix(data.email);
      const username = data.username.toLowerCase();

      if (password.includes(username)) return false;
      if (
        emailPrefix &&
        emailPrefix.length >= 4 &&
        password.includes(emailPrefix)
      )
        return false;

      return true;
    },
    {
      error: 'Password cannot contain your username or parts of your email',
      path: ['password'],
    },
  )
  .refine((data) => data.password === data.confirmPassword, {
    error: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterDTO = z.infer<typeof RegisterSchema>;
export type RegisterInput = Omit<RegisterDTO, 'confirmPassword'>;

export const LoginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, { error: 'Username or email is required' }),

  password: z.string().min(1, { error: 'Password is required' }),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const ChangePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, { error: 'Current password is required' }),
    newPassword: basePasswordSchema,
    confirmNewPassword: z
      .string()
      .min(1, { error: 'Please confirm your password' }),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    error: 'New password must be different from your current password',
    path: ['newPassword'],
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    error: 'Passwords do not match',
    path: ['confirmNewPassword'],
  });

export type ChangePasswordDTO = z.infer<typeof ChangePasswordSchema>;
export type ChangePasswordInput = Omit<ChangePasswordDTO, 'confirmNewPassword'>;

export const DeleteAccountSchema = z
  .object({
    password: z.string().min(1, { error: 'Password is required' }).optional(),
    confirmation: z.literal('DELETE').optional(),
  })
  .refine((data) => data.password || data.confirmation, {
    error: 'Verification required',
    path: [],
  });

export type DeleteAccountInput = z.infer<typeof DeleteAccountSchema>;
