import { Navigate, Route, Routes } from 'react-router-dom';
import App from './App';
import { DemoControls } from './components/DemoControls';
import { GlobalBoxKeys } from './components/GlobalBoxKeys';
import { EmployeeBadgePage } from './pages/access/EmployeeBadgePage';
import { AdminConsolePage } from './pages/access/AdminConsolePage';
import { EmployeePathPage } from './pages/access/EmployeePathPage';
import { GatePage } from './pages/access/GatePage';

export function AppRouter() {
  return (
    <>
      <GlobalBoxKeys />
      <Routes>
        <Route path="/" element={<GatePage />} />
        <Route path="/admin" element={<AdminConsolePage />} />
        <Route path="/employee" element={<EmployeePathPage />} />
        <Route path="/employee/badge/:uid" element={<EmployeeBadgePage />} />
        <Route path="/legacy/*" element={<App />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <DemoControls />
    </>
  );
}
