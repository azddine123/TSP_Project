/**
 * Routeur principal Super-Admin.
 * Chaque sous-route correspond à un item du sidebar.
 */
import { Routes, Route, Navigate } from 'react-router-dom';
import SuperAdminOverview  from './SuperAdminDashboard';
import CrisesPage          from './CrisesPage';
import PipelinePage        from './PipelinePage';
import SupervisionPage     from './SupervisionPage';
import DispatchPage        from './DispatchPage';
import IncidentsPage       from './IncidentsPage';
import UsersPage           from './UsersPage';
import AuditPage           from './AuditPage';

export default function SuperAdminDashboard() {
  return (
    <Routes>
      <Route index               element={<SuperAdminOverview />} />
      <Route path="crises"       element={<CrisesPage />} />
      <Route path="pipeline"     element={<PipelinePage />} />
      <Route path="supervision"  element={<SupervisionPage />} />
      <Route path="dispatch"     element={<DispatchPage />} />
      <Route path="incidents"    element={<IncidentsPage />} />
      <Route path="users"        element={<UsersPage />} />
      <Route path="audit"        element={<AuditPage />} />
      <Route path="*"            element={<Navigate to="/superadmin" replace />} />
    </Routes>
  );
}
