import 'express';

declare global {
  namespace Express {
    interface User {
      id: string;
      username: string;
      email: string;
    }

    interface Request {
      user?: User;
    }
  }
}
