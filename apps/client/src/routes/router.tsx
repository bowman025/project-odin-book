import { createBrowserRouter } from 'react-router';
import { ErrorPage } from '../components/ErrorPage/ErrorPage';
import { LoginPage } from '../features/auth/LoginPage/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage/RegisterPage';
import { ExplorePage } from '../features/follows/ExplorePage/ExplorePage';
import { exploreLoader } from '../features/follows/ExplorePage/exploreLoader.js';
import { TimelinePage } from '../features/posts/TimelinePage/TimelinePage.js';
import { timelineLoader } from '../features/posts/TimelinePage/timelineLoader';
import { ProfilePage } from '../features/profiles/ProfilePage/ProfilePage.js';
import { profileLoader } from '../features/profiles/ProfilePage/profileLoader.js';
import { ProtectedLayout } from '../layouts/ProtectedLayout/ProtectedLayout.js';
import { RootLayout } from '../layouts/RootLayout/RootLayout';
import { rootLoader } from '../layouts/RootLayout/rootLoader.js';

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
