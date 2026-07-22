import { createBrowserRouter } from 'react-router';
import { ErrorPage } from '../components/ErrorPage/ErrorPage';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { ExplorePage } from '../features/follows/ExplorePage';
import { exploreLoader } from '../features/follows/exploreLoader.js';
import { TimelinePage } from '../features/posts/TimelinePage';
import { timelineLoader } from '../features/posts/timelineLoader';
import { ProfilePage } from '../features/profiles/ProfilePage';
import { profileLoader } from '../features/profiles/profileLoader.js';
import { ProtectedLayout } from '../layouts/ProtectedLayout';
import { RootLayout } from '../layouts/RootLayout';
import { rootLoader } from '../layouts/rootLoader.js';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    loader: rootLoader,
    errorElement: <ErrorPage />,
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
          {
            path: 'users',
            element: <ExplorePage />,
            loader: exploreLoader,
          },
          {
            path: 'users/:username',
            element: <ProfilePage />,
            loader: profileLoader,
          },
        ],
      },
    ],
  },
]);
