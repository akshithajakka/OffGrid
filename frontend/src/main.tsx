import '@fontsource-variable/archivo/wdth.css';
import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { AppRouter } from './AppRouter';
import { OffGridStdbRoot } from './stdb/StdbProvider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OffGridStdbRoot>
      <ToastProvider>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </ToastProvider>
    </OffGridStdbRoot>
  </StrictMode>,
);
