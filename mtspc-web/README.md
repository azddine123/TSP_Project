# ReliefChain — Frontend Web

Interface de gestion logistique humanitaire pour la région Béni Mellal-Khénifra.

## Stack technique

| Outil | Version | Rôle |
|---|---|---|
| React | 18.3 | Framework UI |
| TypeScript | 5.4 | Typage statique |
| Vite | 5.3 | Bundler & dev server |
| MUI / MUI X DataGrid | 5.15 / 7.5 | Composants UI |
| Leaflet / react-leaflet | 1.9 / 4.2 | Carte interactive |
| Axios | 1.7 | Client HTTP |
| Keycloak-JS | 24 | Authentification SSO |
| React Router | 6.23 | Routage côté client |

---

## Prérequis

- Node.js 18+
- Services suivants actifs (voir `LAUNCH_GUIDE.md` à la racine) :
  - **Keycloak** sur `http://localhost:8180`
  - **Backend NestJS** sur `http://localhost:9090`

---

## Installation & lancement

```bash
cd mtspc-web
cp .env.example .env     # Vérifier les variables (voir ci-dessous)
npm install
npm run dev              # Démarre sur http://localhost:3000
```

### Variables d'environnement (`.env`)

```env
VITE_KEYCLOAK_URL=http://localhost:8180
VITE_KEYCLOAK_REALM=Logistique
VITE_KEYCLOAK_CLIENT_ID=logistique-web
VITE_API_URL=http://localhost:9090/api/v1
```

### Scripts disponibles

```bash
npm run dev      # Serveur de développement (HMR)
npm run build    # Vérification TypeScript + build production → dist/
npm run preview  # Prévisualiser le build de production
```

---

## Architecture

```
src/
├── main.tsx                  # Point d'entrée React
├── App.tsx                   # Routage principal par rôle
├── theme.ts                  # Thème MUI centralisé
├── keycloak.ts               # Instance Keycloak singleton
│
├── types/
│   └── index.ts              # Interfaces TypeScript partagées (source unique)
│
├── constants/
│   └── index.ts              # Couleurs, labels, enums, formatage dates
│
├── contexts/
│   └── AuthContext.tsx       # État d'auth global (useAuth hook)
│
├── hooks/
│   └── useDataFetch.ts       # Hook générique loading/error/data
│
├── services/
│   └── api.ts                # Client Axios + appels API métier
│
├── components/
│   ├── Navbar.tsx            # Barre de navigation (role-based)
│   ├── ProtectedRoute.tsx    # Garde d'accès par rôle
│   ├── PageHeader.tsx        # En-tête de page standardisée
│   ├── DataState.tsx         # États loading / error / empty
│   └── RoleBadge.tsx         # Chip de rôle réutilisable
│
└── pages/
    ├── DistributeurPage.tsx              # Accès mobile-only
    ├── admin/
    │   ├── AdminDashboard.tsx            # Stock + Missions (ADMIN_ENTREPOT)
    │   └── CreateMissionModal.tsx        # Formulaire création mission
    └── superadmin/
        ├── SuperAdminDashboard.tsx       # Carte + Audit logs (SUPER_ADMIN)
        └── SuperAdminDashboard.css       # Styles Leaflet popup
```

---

## Authentification & RBAC

L'authentification est entièrement déléguée à **Keycloak** (OAuth2 / OpenID Connect).

| Rôle | Route | Accès |
|---|---|---|
| `SUPER_ADMIN` | `/superadmin` | Carte régionale + audit logs |
| `ADMIN_ENTREPOT` | `/admin` | Stock + création de missions |
| `DISTRIBUTEUR` | `/mobile-only` | Redirection vers l'app mobile |

- **`AuthContext`** initialise Keycloak au démarrage et force le login (`onLoad: 'login-required'`).
- **`ProtectedRoute`** vérifie le rôle côté React et affiche une page "Accès Refusé" si nécessaire.
- **`api.ts`** injecte le JWT Bearer dans chaque requête et rafraîchit le token automatiquement (seuil 30s).

---

## Couche API

Tous les appels passent par `src/services/api.ts` :

```typescript
stockApi.getAll()          // GET  /stocks
missionApi.getAll()        // GET  /missions
missionApi.create(dto)     // POST /missions
auditApi.getLogs(params)   // GET  /audit?page=&limit=&operation=
entrepotApi.getAll()       // GET  /entrepots
distributeurApi.getAll()   // GET  /distributeurs
materielApi.getAll()       // GET  /materiels
```

En cas d'erreur, utiliser `getApiErrorMessage(err)` pour obtenir un message lisible.

---

## Conventions de développement

### Typage
- Toutes les interfaces métier sont dans `src/types/index.ts`.
- Ne pas redéfinir de types localement s'ils existent déjà dans `types/`.
- Les composants MUI DataGrid utilisent `GridColDef` et `GridRenderCellParams<T>`.

### Constantes
- Les couleurs MUI, labels et formats de date sont dans `src/constants/index.ts`.
- Ne pas dupliquer les maps couleur/label dans les composants.

### Styles
- Utiliser le prop `sx` de MUI en priorité.
- Pas de `style={{}}` inline dans les composants React — exception : les Popups Leaflet (hors ThemeProvider), où des fichiers `.css` dédiés sont utilisés.
- Le thème global est dans `src/theme.ts`.

### Gestion des états de données
- Utiliser `<DataState loading error empty>` pour tous les états loading/error/empty.
- Utiliser `useDataFetch(fetcher)` pour le pattern simple (un seul endpoint).
- Pour les chargements parallèles (`Promise.all`), gérer manuellement les états.

### Composants réutilisables
- `PageHeader` — en-tête de page avec titre, sous-titre et actions.
- `DataState` — loading / error / empty state unifié.
- `RoleBadge` — chip de rôle Keycloak coloré.

---

## Décisions techniques

| Décision | Raison |
|---|---|
| Keycloak `onLoad: 'login-required'` | L'app ne s'affiche jamais sans authentification |
| Token refresh à 30s (API) + 60s (onTokenExpired) | Double filet de sécurité session |
| MUI DataGrid côté client (stock, missions) | Volumes < 10 000 lignes, filtres natifs suffisants |
| MUI DataGrid côté serveur (audit logs) | Volume potentiellement élevé, pagination serveur obligatoire |
| Leaflet + OpenStreetMap | Pas de clé API requise, licence libre |
| `src/types/` séparé de `src/services/api.ts` | Source unique de vérité, évite les doublons inter-fichiers |

---

## Améliorations futures (backlog)

- [ ] Tests unitaires (Vitest + Testing Library)
- [ ] Filtre par entrepôt / date dans les audit logs
- [ ] Notifications temps réel (WebSocket) pour alertes de stock
- [ ] Export CSV des missions et des logs d'audit
- [ ] Mode sombre (thème MUI dark mode)
- [ ] Pagination côté serveur pour les missions et stocks
- [ ] Internationalisation (i18n) — actuellement fr-MA hardcodé
