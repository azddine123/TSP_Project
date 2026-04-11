# MTSP-Web — Centre de Contrôle Web

> **Framework** : React 18 + TypeScript  
> **Build Tool** : Vite  
> **Styling** : Tailwind CSS  
> **Routing** : React Router v6  
> **Cartographie** : Leaflet + React-Leaflet  
> **Authentification** : Keycloak JS  
> **Version** : 1.0.0

## 📋 Vue d'ensemble

Le **Centre de Contrôle Web** de la plateforme NAJDA est une application React destinée aux **Super-Administrateurs** et **Administrateurs d'entrepôt**. Il fournit une interface complète pour :

- 📊 **Supervision en temps réel** des opérations
- 🗺️ **Visualisation cartographique** des missions et véhicules
- 📦 **Gestion des stocks** et mouvements
- 🚛 **Planification des missions** et tournées
- 👥 **Administration des utilisateurs** (SuperAdmin)
- 🔍 **Audit et traçabilité** de toutes les actions

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MTSP-Web Architecture                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                  React Router v6                       │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │                                                       │ │
│  │  /                    → HomeRedirect (selon rôle)     │ │
│  │  /login               → Page de connexion             │ │
│  │  /admin/*             → Dashboard Admin Entrepôt      │ │
│  │  /superadmin/*        → Dashboard SuperAdmin          │ │
│  │  /mobile-only         → Info distributeur             │ │
│  │                                                       │ │
│  └───────────────────────────────────────────────────────┘ │
│                           │                                 │
│                           ▼                                 │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                  Layout & Navigation                   │ │
│  │  • AppLayout          → Structure principale          │ │
│  │  • AppSidebar         → Menu latéral (collapsible)    │ │
│  │  • AppHeader          → Header avec profil            │ │
│  │  • SidebarContext     → État du menu                  │ │
│  └───────────────────────────────────────────────────────┘ │
│                           │                                 │
│                           ▼                                 │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                  Contexts (Global State)               │ │
│  │  • AuthContext        → Keycloak + rôles utilisateur  │ │
│  │  • (Données via hooks useDataFetch)                   │ │
│  └───────────────────────────────────────────────────────┘ │
│                           │                                 │
│                           ▼                                 │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                  Services & API                        │ │
│  │  • keycloak.ts        → Instance Keycloak JS          │ │
│  │  • useDataFetch.ts    → Hooks de fetch avec cache     │ │
│  │  • API Layer          → Axios + interceptors          │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Structure des dossiers

```
mtspc-web/
├── src/
│   ├── main.tsx                   # Point d'entrée React
│   ├── App.tsx                    # Routage principal
│   │
│   ├── pages/                     # Pages de l'application
│   │   ├── LoginPage.tsx          # Authentification Keycloak
│   │   ├── DistributeurPage.tsx   # Info "mobile only"
│   │   │
│   │   ├── admin/                 # Routes ADMIN_ENTREPOT
│   │   │   ├── index.tsx          # Export AdminDashboard
│   │   │   ├── AdminDashboard.tsx # Layout admin
│   │   │   ├── AdminOverview.tsx  # Vue d'ensemble
│   │   │   ├── StockPage.tsx      # Gestion des stocks
│   │   │   ├── TourneesPage.tsx   # Tournées et itinéraires
│   │   │   ├── VehiculesPage.tsx  # Gestion du parc
│   │   │   ├── SuiviTerrainPage.tsx # Suivi des distributeurs
│   │   │   └── CreateMissionModal.tsx # Création mission
│   │   │
│   │   └── superadmin/            # Routes SUPER_ADMIN
│   │       ├── index.tsx          # Export SuperAdminDashboard
│   │       ├── SuperAdminDashboard.tsx # Layout superadmin
│   │       ├── CrisesPage.tsx     # Gestion des crises
│   │       ├── SupervisionPage.tsx # Carte régionale temps réel
│   │       ├── DispatchPage.tsx   # Dispatch missions
│   │       ├── UsersPage.tsx      # Gestion utilisateurs
│   │       ├── IncidentsPage.tsx  # Gestion incidents
│   │       ├── AuditPage.tsx      # Journal d'audit
│   │       └── PipelinePage.tsx   # Lancement algorithmes IA
│   │
│   ├── layout/                    # Composants de layout
│   │   ├── AppLayout.tsx          # Structure principale
│   │   ├── AppSidebar.tsx         # Menu latéral
│   │   ├── AppHeader.tsx          # Header avec navigation
│   │   └── SidebarContext.tsx     # État du sidebar
│   │
│   ├── components/                # Composants réutilisables
│   │   └── ProtectedRoute.tsx     # Garde de route par rôle
│   │
│   ├── contexts/                  # Contexts React
│   │   └── AuthContext.tsx        # Auth Keycloak + rôles
│   │
│   ├── hooks/                     # Custom hooks
│   │   └── useDataFetch.ts        # Fetch avec cache/SWR
│   │
│   ├── types/                     # Types TypeScript
│   │   └── index.ts               # Interfaces partagées
│   │
│   └── keycloak.ts                # Configuration Keycloak JS
│
├── public/                        # Assets statiques
│   └── NAJDA_Logo.png             # Logo de la plateforme
│
├── index.html                     # Template HTML
├── vite.config.ts                 # Configuration Vite
├── tailwind.config.js             # Configuration Tailwind
├── postcss.config.js              # Configuration PostCSS
├── tsconfig.json                  # Configuration TypeScript
└── package.json                   # Dépendances
```

---

## 🔐 Authentification

### Intégration Keycloak

**Fichier** : `src/keycloak.ts`

```typescript
import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL,
  realm: 'Logistique',
  clientId: 'logistique-web',
});
```

### Flux d'authentification

1. **Initialisation** : Keycloak.init() vérifie le token existant
2. **Login** : Redirection vers Keycloak si non authentifié
3. **Token** : Stocké en mémoire (pas de refresh token pour SPA)
4. **Déconnexion** : Appel à Keycloak.logout() + redirection

### Routage par rôle

```typescript
// App.tsx
function HomeRedirect() {
  const { hasRole } = useAuth();
  if (hasRole('SUPER_ADMIN'))    return <Navigate to="/superadmin" />;
  if (hasRole('ADMIN_ENTREPOT')) return <Navigate to="/admin" />;
  return <Navigate to="/mobile-only" />;
}
```

### ProtectedRoute

```typescript
<Route
  path="/admin/*"
  element={
    <ProtectedRoute allowedRoles={['ADMIN_ENTREPOT']}>
      <AdminDashboard />
    </ProtectedRoute>
  }
/>
```

---

## 🗺️ Cartographie

### Leaflet + React-Leaflet

**Fichier** : Utilisé dans `SupervisionPage.tsx`, `SuiviTerrainPage.tsx`

```typescript
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

<MapContainer center={[32.32, -6.35]} zoom={8}>
  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
  <Marker position={[douar.lat, douar.lng]}>
    <Popup>{douar.nom}</Popup>
  </Marker>
</MapContainer>
```

### Couches disponibles

- **OpenStreetMap** : Fond de carte standard
- **Satellite** : (Optionnel) Google Maps Satellite
- **Douars** : Marqueurs des villages
- **Véhicules** : Position en temps réel (WebSocket)
- **Missions** : Itinéraires colorés par statut

---

## 📊 Dashboards

### Admin Entrepôt (`/admin`)

Accès réservé aux gestionnaires d'entrepôt.

| Page | Description |
|------|-------------|
| Vue d'ensemble | KPIs stocks, missions en cours, alertes |
| Stocks | Inventaire, mouvements, seuils critiques |
| Tournées | Planification VRP, optimisation IA |
| Véhicules | État du parc, maintenance, assignation |
| Suivi Terrain | Position GPS des distributeurs |

### SuperAdmin (`/superadmin`)

Accès complet pour la direction régionale.

| Page | Description |
|------|-------------|
| Crises | Gestion des situations d'urgence |
| Supervision | Carte régionale temps réel |
| Dispatch | Assignation des ressources |
| Utilisateurs | CRUD utilisateurs Keycloak |
| Incidents | Traçabilité des problèmes |
| Audit | Journal complet des actions |
| Pipeline IA | Lancement algorithmes AHP/TOPSIS/VRP |

---

## 🚀 Démarrage

### Prérequis
- Node.js ≥ 18
- Backend et Keycloak démarrés

### Installation

```bash
cd mtspc-web/

# 1. Installer les dépendances
npm install

# 2. Configurer l'environnement
cp .env.example .env
# Éditer .env avec les URLs

# 3. Lancer en développement
npm run dev

# 4. Build de production
npm run build
```

### Variables d'environnement (.env)

```env
# === API Backend ===
VITE_API_URL=http://localhost:9090/api/v1

# === Keycloak ===
VITE_KEYCLOAK_URL=http://localhost:8180
VITE_KEYCLOAK_REALM=Logistique
VITE_KEYCLOAK_CLIENT_ID=logistique-web

# === Environment ===
VITE_ENV=development
```

> Les variables doivent commencer par `VITE_` pour être exposées au client.

### Accès

- **Développement** : http://localhost:3000
- **Production** : Fichiers statiques dans `dist/`

---

## 📦 Build et Déploiement

### Build production

```bash
npm run build
```

Génère le dossier `dist/` avec :
- Fichiers JS/CSS optimisés
- Assets avec hash pour cache-busting
- `index.html` prêt au déploiement

### Déploiement

#### Option 1 : Serveur statique

```bash
# Avec serve
npx serve dist

# Avec Nginx
# Copier dist/ dans /var/www/html/
```

#### Option 2 : Docker

```dockerfile
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

---

## 🎨 Design System

### Couleurs

| Couleur | Hex | Usage |
|---------|-----|-------|
| Brand Primary | `#0D47A1` | Header, boutons primaires |
| Brand Secondary | `#1565C0` | Hover, accents |
| Success | `#10B981` | Validation, succès |
| Warning | `#F59E0B` | Alerte, attention |
| Danger | `#EF4444` | Erreur, critique |

### Breakpoints Tailwind

```javascript
// tailwind.config.js
screens: {
  'sm': '640px',
  'md': '768px',
  'lg': '1024px',
  'xl': '1280px',
}
```

---

## 🧪 Tests

```bash
# Lancer les tests
npm test

# Mode watch
npm test -- --watch

# Coverage
npm test -- --coverage
```

---

## 🔧 Dépannage

### Problème : "Keycloak is not initialized"
**Solution** : Vérifier que les variables `VITE_KEYCLOAK_*` sont définies dans `.env`.

### Problème : CORS sur les appels API
**Solution** : Ajouter l'origine du frontend dans les `Web origins` du client Keycloak.

### Problème : Carte Leaflet vide
**Solution** : Vérifier que les styles CSS de Leaflet sont importés :
```typescript
import 'leaflet/dist/leaflet.css';
```

### Problème : Hot reload lent
**Solution** : Augmenter la mémoire de Node :
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
```

---

## 📚 Ressources

- [React Documentation](https://react.dev)
- [Vite Guide](https://vitejs.dev/guide/)
- [Tailwind CSS](https://tailwindcss.com)
- [React Router](https://reactrouter.com)
- [Leaflet](https://leafletjs.com)
- [Keycloak JS Adapter](https://www.keycloak.org/docs/latest/securing_apps/)

---

## 👥 Équipe

- **Azddine EL Hamdaoui**
- **Youssef Ait Karroum**

---

## 📄 Licence

Projet académique — Tous droits réservés © 2024
