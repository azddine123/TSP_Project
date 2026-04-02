/**
 * PAGE SUPERVISION — Temps réel via Server-Sent Events
 */
import { useState, useEffect, useRef } from 'react';
import { supervisionApi } from '../../services/api';
import type { SupervisionSnapshot, VehiculePosition, TourneeProgres, StockGlobalItem, Evenement } from '../../types';

// ── Helpers ────────────────────────────────────────────────────────────────────

function SeveriteBadge({ severite }: { severite: string }) {
  const cls: Record<string, string> = {
    info:     'bg-blue-100 text-blue-700',
    warning:  'bg-yellow-100 text-yellow-700',
    critical: 'bg-red-100 text-red-700',
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls[severite] ?? 'bg-gray-100 text-gray-600'}`}>{severite}</span>;
}

function StatutBadge({ statut }: { statut: string }) {
  const cls: Record<string, string> = {
    ouvert:        'bg-red-100 text-red-700',
    en_traitement: 'bg-yellow-100 text-yellow-700',
    resolu:        'bg-green-100 text-green-700',
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls[statut] ?? 'bg-gray-100 text-gray-600'}`}>{statut}</span>;
}

function ProgressBar({ value }: { value: number }) {
  const color = value >= 80 ? 'bg-green-500' : value >= 40 ? 'bg-brand-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-1.5 rounded-full transition-all duration-500 ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-bold w-8 text-right">{value}%</span>
    </div>
  );
}

// ── Carte miniature GPS ────────────────────────────────────────────────────────
// (placeholder — la vraie carte Leaflet est sur la page Overview)

function GpsCard({ vehicules }: { vehicules: VehiculePosition[] }) {
  if (vehicules.length === 0) return (
    <div className="flex flex-col items-center justify-center py-8 text-gray-400 text-sm gap-2">
      <svg className="w-8 h-8 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 010 16c-4 0-8-4-8-8a8 8 0 018-8z"/>
      </svg>
      Aucun véhicule en déplacement
    </div>
  );
  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {vehicules.map((v) => (
        <div key={v.distributeurId} className="px-4 py-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{v.distributeurNom}</p>
              <p className="text-xs text-gray-400 font-mono">{v.latitude.toFixed(4)}, {v.longitude.toFixed(4)}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-brand-600">{v.vitesse} km/h</p>
            <p className="text-xs text-gray-400">{new Date(v.updatedAt).toLocaleTimeString('fr-FR')}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SupervisionPage() {
  const [snapshot, setSnapshot]   = useState<SupervisionSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error,     setError]     = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const url = supervisionApi.getStreamUrl();
    const es  = new EventSource(url);
    esRef.current = es;

    es.onopen = () => { setConnected(true); setError(null); };

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as SupervisionSnapshot;
        setSnapshot(data);
        setLastUpdate(new Date());
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      setConnected(false);
      setError('Connexion SSE interrompue — tentative de reconnexion…');
    };

    return () => { es.close(); };
  }, []);

  const s = snapshot;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Supervision Temps Réel</h1>
          <p className="text-sm text-gray-500 mt-0.5">Mise à jour toutes les 5 secondes via SSE</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`} />
          <span className={connected ? 'text-green-600 font-medium' : 'text-red-500'}>
            {connected ? 'Connecté' : 'Déconnecté'}
          </span>
          {lastUpdate && <span className="text-gray-400 text-xs">{lastUpdate.toLocaleTimeString('fr-FR')}</span>}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-xl px-4 py-3 text-sm">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          {error}
        </div>
      )}

      {/* Crise active */}
      {s?.criseActive ? (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl px-5 py-3 flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <p className="text-sm font-bold text-red-700 dark:text-red-400">
            {s.criseActive.reference} — {s.criseActive.type} · {s.criseActive.zone}
          </p>
        </div>
      ) : !s ? null : (
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-3 text-sm text-gray-500">
          Aucune crise active en ce moment
        </div>
      )}

      {/* Grille principale */}
      {!s ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── Véhicules GPS ── */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Véhicules Actifs</h3>
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">{s.vehicules.length}</span>
            </div>
            <GpsCard vehicules={s.vehicules} />
          </div>

          {/* ── Stocks ── */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Stocks Entrepôts</h3>
            </div>
            {s.stocksGlobal.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-400">Aucune donnée</p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {s.stocksGlobal.map((st: StockGlobalItem) => (
                  <div key={st.entrepotId} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{st.entrepotNom}</p>
                      {st.alertesCount > 0 && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                          {st.alertesCount} alerte(s)
                        </span>
                      )}
                    </div>
                    <ProgressBar value={st.tauxRemplissage} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Progrès tournées ── */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Tournées en Cours</h3>
            </div>
            {s.tourneeProgres.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-400">Aucune tournée active</p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {s.tourneeProgres.map((tp: TourneeProgres) => (
                  <div key={tp.tourneeId} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{tp.entrepotNom}</p>
                      <span className="text-xs text-gray-500">{tp.etapesLivrees}/{tp.etapesTotal} étapes</span>
                    </div>
                    <ProgressBar value={tp.pourcentage} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Alertes actives ── */}
          <div className="lg:col-span-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-theme-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Alertes & Incidents Actifs</h3>
              {s.alertesActives.length > 0 && (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">{s.alertesActives.length}</span>
              )}
            </div>
            {s.alertesActives.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-400">Aucune alerte active — situation normale</p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {s.alertesActives.map((ev: Evenement) => (
                  <div key={ev.id} className="px-5 py-3 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <SeveriteBadge severite={ev.severite} />
                        <span className="text-xs text-gray-500 font-mono">{ev.type}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{ev.titre}</p>
                      <p className="text-xs text-gray-400 truncate">{ev.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <StatutBadge statut={ev.statut} />
                      <p className="text-xs text-gray-400 mt-1">{new Date(ev.createdAt).toLocaleTimeString('fr-FR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
