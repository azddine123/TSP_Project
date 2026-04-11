/**
 * Routeur principal Admin Entrepôt.
 */
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminOverview    from './AdminOverview';
import StockPage        from './StockPage';
import VehiculesPage    from './VehiculesPage';
import TourneesPage     from './TourneesPage';
import SuiviTerrainPage from './SuiviTerrainPage';
import SettingsPage     from './SettingsPage';

export default function AdminDashboard() {
  return (
    <Routes>
      <Route index                   element={<AdminOverview />} />
      <Route path="stock"            element={<StockPage />} />
      <Route path="vehicules"        element={<VehiculesPage />} />
      <Route path="tournees"         element={<TourneesPage />} />
      <Route path="suivi"            element={<SuiviTerrainPage />} />
      <Route path="settings"         element={<SettingsPage />} />
      <Route path="*"                element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
