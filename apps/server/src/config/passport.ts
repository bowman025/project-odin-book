import bcryptjs from 'bcryptjs';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { findUserForAuth } from '../services/userService.js';

const DUMMY_HASH = '8f4d92a1b7e6c5d3f2a1b8c9d0e1f2a3b4c5d6e7f8g9h0i1j2k3l4m5n6';
const INVALID_CREDENTIALS = 'Invalid credentials';

const normalizeIdentifier = (input: string) => {
  const trimmed = input.trim();
  return trimmed.includes('@') ? trimmed.toLowerCase() : trimmed;
};

const verifyPassword = async (
  password: string,
  hash: string | null | undefined,
) => {
  const effectiveHash = hash ?? DUMMY_HASH;
  return bcryptjs.compare(password, effectiveHash);
};

passport.use(
  new LocalStrategy(
    {
      usernameField: 'username',
      passwordField: 'password',
    },
    async (usernameOrEmail, password, done) => {
      try {
        const identifier = normalizeIdentifier(usernameOrEmail);
        const user = await findUserForAuth(identifier);

        const passwordValid = await verifyPassword(
          password,
          user?.passwordHash,
        );

        if (!passwordValid || !user?.passwordHash) {
          return done(null, false, { message: INVALID_CREDENTIALS });
        }

        return done(null, {
          id: user.id,
          username: user.username,
          email: user.email,
        });
      } catch (error) {
        return done(error);
      }
    },
  ),
);

export default passport;
