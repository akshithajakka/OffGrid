import '@fontsource-variable/archivo';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { WarRoomStdbRoot } from './stdb/StdbProvider';
import { USE_MOCK } from './stdb/config';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WarRoomStdbRoot>
      <App />
    </WarRoomStdbRoot>
  </StrictMode>
);

if (USE_MOCK) {
  console.info('[warroom] VITE_MOCK=true — localStorage mock backend');
} else {
  console.info('[warroom] Live SpacetimeDB', import.meta.env.VITE_STDB_URI);
}
