/**
 * PAGE SUPERVISION — Par entrepôt (mock polling)
 */
import { useState, useEffect } from 'react';
import { USE_MOCK_DATA, supervisionMockApi } from '../../services/mockApi';
import { supervisionApi } from '../../services/api';
import { MOCK_ENTREPOTS, MOCK_VEHICULES } from '../../mock';
import type { SupervisionSnapshot, StockGlobalItem, TourneeProgres, VehiculePosition, Evenement, Entrepot } from '../../types';

// ── Helpers ────────────────────────────────────────────────────────────────────

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

function SeveriteBadge({ severite }: { severite: string }) {
  const cls: Record<string, string> = {
    info: 'bg-blue-100 text-blue-700', warning: 'bg-yellow-100 text-yellow-700', critical: 'bg-red-100 text-red-700',
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls[severite] ?? 'bg-gray-100 text-gray-600'}`}>{severite}</span>;
}

// ── Panneau détail d'un entrepôt ───────────────────────────────────────────────

function EntrepotDetail({
  entrepot, snapshot,
}: {
  entrepot: Entrepot;
  snapshot: SupervisionSnapshot | null;
}) {
  const stock: StockGlobalItem | undefined = snapshot?.stocksGlobal.find(s => s.entrepotId === entrepot.id);
  const tournees: TourneeProgres[] = snapshot?.tourneeProgres.filter(t => t.entrepotNom === entrepot.nom) ?? [];

  // Véhicules de l'entrepôt depuis le mock + positions live
  const vehiculesEntrepot = MOCK_VEHICULES.filter(v => v.entrepotId === entrepot.id);
  const livePositions = snapshot?.vehicules ?? [];

  return (
    <div className="space-y-4">
      {/* Stock */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-theme-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Stock</h3>
        </div>
        <div className="px-5 py-4">
          {stock ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Taux de remplissage</span>
                {stock.alertesCount > 0 && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                    {stock.alertesCount} alerte(s)
                  </span>
                )}
              </div>
              <ProgressBar value={stock.tauxRemplissage} />
            </div>
          ) : (
            <p className="text-sm text-gray-400">Aucune donnée de stock</p>
          )}
        </div>
      </div>

      {/* Véhicules */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-theme-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Véhicules</h3>
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-full">{vehiculesEntrepot.length}</span>
        </div>
        {vehiculesEntrepot.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-400">Aucun véhicule assigné</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {vehiculesEntrepot.map(v => {
              const live: VehiculePosition | undefined = v.statut === 'en_mission'
                ? livePositions.find(lp => lp.tourneeId === `tournee-${v.id}`) ?? livePositions[0]
                : undefined;
              return (
                <div key={v.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${v.statut === 'en_mission' ? 'bg-green-500 animate-pulse' : v.statut === 'disponible' ? 'bg-gray-400' : 'bg-red-400'}`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{v.immatriculation}</p>
                      <p className="text-xs text-gray-400">{v.type} · {v.capaciteKg} kg</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      v.statut === 'en_mission' ? 'bg-green-100 text-green-700'
                      : v.statut === 'disponible' ? 'bg-gray-100 text-gray-600'
                      : 'bg-red-100 text-red-600'
                    }`}>{v.statut.replace('_', ' ')}</span>
                    {live && <p className="text-xs text-gray-400 mt-0.5">{live.vitesse} km/h</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Missions / Tournées */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-theme-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Tournées en cours</h3>
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-full">{tournees.length}</span>
        </div>
        {tournees.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-400">Aucune tournée active pour cet entrepôt</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {tournees.map(t => (
              <div key={t.tourneeId} className="px-4 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-mono text-gray-500">{t.tourneeId}</p>
                  <span className="text-xs text-gray-500">{t.etapesLivrees}/{t.etapesTotal} étapes</span>
                </div>
                <ProgressBar value={t.pourcentage} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────

const STATUT_DOT: Record<string, string> = {
  actif:     'bg-green-500',
  surcharge: 'bg-red-500',
  inactif:   'bg-gray-400',
};

export default function SupervisionPage() {
  const [snapshot,          setSnapshot]          = useState<SupervisionSnapshot | null>(null);
  const [connected,         setConnected]         = useState(false);
  const [lastUpdate,        setLastUpdate]        = useState<Date | null>(null);
  const [error,             setError]             = useState<string | null>(null);
  const [selectedEntrepot,  setSelectedEntrepot]  = useState<Entrepot>(MOCK_ENTREPOTS[0]);

  useEffect(() => {
    if (USE_MOCK_DATA) {
      // Mode mock : polling toutes les 5s
      const fetch = () =>
        supervisionMockApi.getSnapshot().then(s => {
          setSnapshot(s);
          setConnected(true);
          setLastUpdate(new Date());
        });
      fetch();
      const id = setInterval(fetch, 5000);
      return () => clearInterval(id);
    } else {
      // Mode réel : SSE
      const url = supervisionApi.getStreamUrl();
      const es  = new EventSource(url);
      es.onopen    = () => { setConnected(true); setError(null); };
      es.onmessage = (e) => {
        try { setSnapshot(JSON.parse(e.data)); setLastUpdate(new Date()); } catch { /* ignore */ }
      };
      es.onerror = () => { setConnected(false); setError('Connexion SSE interrompue — tentative de reconnexion…'); };
      return () => es.close();
    }
  }, []);

  const alertes: Evenement[] = snapshot?.alertesActives ?? [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Supervision Temps Réel</h1>
          <p className="text-sm text-gray-500 mt-0.5">Vue par entrepôt · mise à jour toutes les 5 secondes</p>
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
          {error}
        </div>
      )}

      {/* Bannière crise active */}
      {snapshot?.criseActive && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl px-5 py-3 flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <p className="text-sm font-bold text-red-700 dark:text-red-400">
            {snapshot.criseActive.reference} — {snapshot.criseActive.type} · {snapshot.criseActive.zone}
          </p>
        </div>
      )}

      {/* Layout master-detail */}
      <div className="flex gap-5 min-h-[500px]">
        {/* ── Panneau gauche : liste entrepôts ── */}
        <div className="w-64 shrink-0 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-theme-sm overflow-hidden self-start">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Entrepôts</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {MOCK_ENTREPOTS.map(e => {
              const stockItem = snapshot?.stocksGlobal.find(s => s.entrepotId === e.id);
              const isSelected = selectedEntrepot.id === e.id;
              return (
                <button
                  key={e.id}
                  onClick={() => setSelectedEntrepot(e)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-2.5 transition-colors ${
                    isSelected
                      ? 'bg-brand-50 dark:bg-brand-900/20 border-l-2 border-brand-500'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border-l-2 border-transparent'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${STATUT_DOT[e.statut] ?? 'bg-gray-400'}`} />
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${isSelected ? 'text-brand-700 dark:text-brand-300' : 'text-gray-900 dark:text-white'}`}>
                      {e.province}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{e.nom.replace('Entrepôt Régional ', '')}</p>
                    {stockItem && (
                      <div className="mt-1 h-1 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                        <div
                          className={`h-1 rounded-full ${stockItem.tauxRemplissage >= 80 ? 'bg-green-400' : stockItem.tauxRemplissage >= 40 ? 'bg-brand-400' : 'bg-red-400'}`}
                          style={{ width: `${stockItem.tauxRemplissage}%` }}
                        />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Panneau droit : détail entrepôt ── */}
        <div className="flex-1 min-w-0">
          <div className="mb-3 flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${STATUT_DOT[selectedEntrepot.statut] ?? 'bg-gray-400'}`} />
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">{selectedEntrepot.nom}</h2>
            <span className="text-sm text-gray-400">· {selectedEntrepot.province}</span>
          </div>

          {!snapshot ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
            </div>
          ) : (
            <EntrepotDetail entrepot={selectedEntrepot} snapshot={snapshot} />
          )}
        </div>
      </div>

      {/* Alertes globales — pleine largeur */}
      {alertes.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-theme-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Alertes & Incidents Actifs</h3>
            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">{alertes.length}</span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {alertes.map((ev: Evenement) => (
              <div key={ev.id} className="px-5 py-3 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <SeveriteBadge severite={ev.severite} />
                    <span className="text-xs text-gray-500 font-mono">{ev.type}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{ev.titre}</p>
                  <p className="text-xs text-gray-400 truncate">{ev.description}</p>
                </div>
                <p className="text-xs text-gray-400 shrink-0">{new Date(ev.createdAt).toLocaleTimeString('fr-FR')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
