import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { router } from './routes/router';
import './styles/global.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error(
    'Failed to find the root element. Make sure it exists in index.html',
  );
}

createRoot(container).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
