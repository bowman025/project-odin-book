import 'express';

declare global {
  namespace Express {
    interface User {
      id: string;
      username: string;
      email: string;
      profilePicture?: string | null;
    }

    interface Request {
      user?: User;
    }
  }
}
