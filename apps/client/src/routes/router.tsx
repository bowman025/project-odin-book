import { createBrowserRouter } from 'react-router';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { TimelinePage } from '../features/posts/TimelinePage';
import { timelineLoader } from '../features/posts/timelineLoader';
import { ProtectedLayout } from '../layouts/ProtectedLayout';
import { RootLayout } from '../layouts/RootLayout';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'register',
        element: <RegisterPage />,
      },
      {
        element: <ProtectedLayout />,
        children: [
          {
            index: true,
            element: <TimelinePage />,
            loader: timelineLoader,
          },
        ],
      },
    ],
  },
]);
