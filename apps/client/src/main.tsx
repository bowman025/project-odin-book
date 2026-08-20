import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { GatewayLoader } from './components/GatewayLoader/GatewayLoader';
import { getRouter } from './routes/router';
import './styles/global.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error(
    'Failed to find the root element. Make sure it exists in index.html',
  );
}

const ApplicationEntryBootstrap = () => {
  const [isServerAwake, setIsServerAwake] = useState(false);

  if (!isServerAwake) {
    return <GatewayLoader onAwake={() => setIsServerAwake(true)} />;
  }

  const runtimeRouter = getRouter();

  return <RouterProvider router={runtimeRouter} />;
};

createRoot(container).render(
  <StrictMode>
    <ApplicationEntryBootstrap />
  </StrictMode>,
);
