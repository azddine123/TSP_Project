/**
 * MOCK DATA INDEX
 * ===============
 * Point central pour toutes les données mock de développement
 * Compatible avec Admin et SuperAdmin dashboards
 */

export * from './missions';
export * from './tournees';
export * from './admin';
export * from './superadmin';
export * from './vehicules';
export * from './distributeurs';
export * from './crises';
export * from './douars';
export * from './entrepots';
export * from './adminApi';
export * from './entrepotA';

// Re-export avec les noms attendus par l'API
export { MOCK_ADMIN_MISSIONS as MOCK_MISSIONS_ADMIN } from './admin';
export { MOCK_STOCK as MOCK_STOCK_ADMIN } from './admin';
export { MOCK_ENTREPOTS, MOCK_AUDIT_LOGS } from './superadmin';
export { MOCK_VEHICULES } from './vehicules';
export { MOCK_DISTRIBUTEURS } from './distributeurs';
export { MOCK_CRISES } from './crises';
export { MOCK_DOUBLES } from './douars';
