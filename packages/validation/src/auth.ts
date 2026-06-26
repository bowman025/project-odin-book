import { z } from 'zod';

const getEmailPrefix = (email: string): string => {
  return email.split('@')[0]?.toLowerCase() ?? '';
};

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
      if (emailPrefix?.length >= 4 && password.includes(emailPrefix))
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

export type RegisterInput = Omit<
  z.infer<typeof RegisterSchema>,
  'confirmPassword'
>;

export const LoginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, { error: 'Username or email is required' }),

  password: z.string().min(1, { error: 'Password is required' }),
});

export type LoginInput = z.infer<typeof LoginSchema>;
