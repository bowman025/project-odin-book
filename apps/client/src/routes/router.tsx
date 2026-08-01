import { createBrowserRouter } from 'react-router';
import { ErrorPage } from '../components/ErrorPage/ErrorPage';
import { LoginPage } from '../features/auth/LoginPage/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage/RegisterPage';
import { DirectoryPage } from '../features/follows/DirectoryPage/DirectoryPage.js';
import { directoryLoader } from '../features/follows/DirectoryPage/directoryLoader.js';
import { PostDetailPage } from '../features/posts/PostDetailPage/PostDetailPage';
import { postDetailLoader } from '../features/posts/PostDetailPage/postDetailLoader.js';
import { TimelinePage } from '../features/posts/TimelinePage/TimelinePage';
import { timelineLoader } from '../features/posts/TimelinePage/timelineLoader.js';
import { ProfilePage } from '../features/profiles/ProfilePage/ProfilePage';
import { profileLoader } from '../features/profiles/ProfilePage/profileLoader.js';
import { SettingsPage } from '../features/settings/SettingsPage.jsx';
import { settingsLoader } from '../features/settings/settingsLoader.js';
import { HashtagFeedPage } from '../features/tags/HashtagFeedPage/HashtagFeedPage';
import { hashtagFeedLoader } from '../features/tags/HashtagFeedPage/hashtagFeedLoader.js';
import { ProtectedLayout } from '../layouts/ProtectedLayout/ProtectedLayout';
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
            path: 'posts/:postId',
            element: <PostDetailPage />,
            loader: postDetailLoader,
          },
          {
            path: 'users',
            element: <DirectoryPage />,
            loader: directoryLoader,
          },
          {
            path: 'users/:username',
            element: <ProfilePage />,
            loader: profileLoader,
          },
          {
            path: 'tags',
            element: <HashtagFeedPage />,
            loader: hashtagFeedLoader,
          },
          {
            path: 'settings',
            element: <SettingsPage />,
            loader: settingsLoader,
          },
        ],
      },
    ],
  },
]);
