# Backend ReliefChain — API Logistique Humanitaire

> **Framework** : [NestJS](https://nestjs.com/) (Node.js/TypeScript)  
> **Base de données** : PostgreSQL (via TypeORM)  
> **Authentification** : JWT via Keycloak (RBAC)  
> **Documentation API** : Swagger/OpenAPI  
> **Version** : 1.0.0

## 📋 Vue d'ensemble

Ce backend constitue le cœur de la plateforme **NAJDA** (ReliefChain), une solution de gestion logistique humanitaire pour la région Béni Mellal-Khénifra. Il expose une API REST sécurisée permettant la gestion des ressources, missions, crises et la supervision en temps réel.

---

## 🏗️ Architecture

### Structure des dossiers

```
backend/
├── src/
│   ├── main.ts                    # Point d'entrée NestJS
│   ├── app.module.ts              # Module racine (orchestration)
│   │
│   ├── auth/                      # Authentification JWT Keycloak
│   │   ├── auth.module.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts       # Vérification JWT
│   │   │   └── roles.guard.ts          # Vérification rôles RBAC
│   │   ├── strategies/
│   │   │   └── jwt.strategy.ts         # Stratégie Passport JWT
│   │   └── decorators/
│   │       └── roles.decorator.ts      # Décorateur @Roles()
│   │
│   ├── database/                  # Configuration PostgreSQL
│   │   └── database.module.ts
│   │
│   ├── audit/                     # Journalisation immuable
│   │   ├── audit-log.interceptor.ts    # Intercepteur global
│   │   ├── audit.controller.ts
│   │   └── entities/audit-log.entity.ts
│   │
│   ├── algorithmes/               # Pipeline algorithmique (IA)
│   │   ├── algorithmes.controller.ts   # POST /pipeline, GET /pipeline/:id
│   │   ├── algorithmes.service.ts
│   │   ├── ahp.service.ts              # Analytic Hierarchy Process
│   │   ├── topsis.service.ts           # Tri par similarité
│   │   ├── vrp.service.ts              # Vehicle Routing Problem
│   │   └── dto/run-pipeline.dto.ts
│   │
│   ├── crises/                    # Gestion des crises
│   │   ├── crises.controller.ts        # CRUD + statut
│   │   ├── crises.service.ts
│   │   └── entities/
│   │       ├── crise.entity.ts
│   │       └── douar-severite.entity.ts
│   │
│   ├── douars/                    # Géographie (douars = villages)
│   │   ├── douars.controller.ts
│   │   └── entities/douar.entity.ts
│   │
│   ├── entrepots/                 # Gestion des entrepôts
│   │   ├── entrepots.controller.ts
│   │   └── entities/entrepot.entity.ts
│   │
│   ├── distributeurs/             # Gestion des distributeurs
│   │   ├── distributeurs.controller.ts
│   │   └── entities/distributeur.entity.ts
│   │
│   ├── materiels/                 # Catalogue matériel
│   │   ├── materiels.controller.ts
│   │   └── entities/materiel.entity.ts
│   │
│   ├── stocks/                    # Gestion des stocks
│   │   ├── stocks.controller.ts        # GET /stocks, POST /mouvements
│   │   ├── stocks.service.ts
│   │   └── entities/
│   │       ├── stock.entity.ts
│   │       └── stock-mouvement.entity.ts
│   │
│   ├── missions/                  # Missions humanitaires
│   │   ├── missions.controller.ts      # CRUD + statut + sync
│   │   ├── missions.service.ts
│   │   ├── sync.controller.ts          # POST /sync (offline-first)
│   │   └── entities/
│   │       ├── mission.entity.ts
│   │       └── mission-item.entity.ts
│   │
│   ├── tournees/                  # Tournées de livraison
│   │   ├── tournees.controller.ts      # GET|PATCH /tournees
│   │   └── entities/
│   │       ├── tournee.entity.ts
│   │       └── tournee-etape.entity.ts
│   │
│   ├── evenements/                # Événements et alertes
│   │   ├── evenements.controller.ts
│   │   └── dto/send-alert.dto.ts
│   │
│   ├── supervision/               # Supervision temps réel
│   │   ├── supervision.controller.ts   # GET /supervision/stream (SSE)
│   │   ├── gps.gateway.ts              # WebSocket GPS (temps réel)
│   │   └── gps-cache.service.ts
│   │
│   ├── vehicules/                 # Gestion du parc automobile
│   │   ├── vehicules.controller.ts
│   │   └── entities/vehicule.entity.ts
│   │
│   ├── users/                     # Administration Keycloak
│   │   ├── users.controller.ts         # CRUD utilisateurs
│   │   └── keycloak-admin.service.ts
│   │
│   └── health/                    # Health check
│       └── health.controller.ts        # GET /health (public)
│
├── dist/                          # Code compilé (JavaScript)
├── .env                           # Variables d'environnement
├── .env.example                   # Template .env
└── package.json
```

---

## 🔐 Authentification & Autorisation

### Flux d'authentification

1. **Keycloak** émet les tokens JWT (accès + refresh)
2. Le backend **vérifie** la signature JWT via la clé publique Keycloak
3. Les **guards** NestJS protègent les routes :
   - `JwtAuthGuard` → vérifie la validité du token
   - `RolesGuard` → vérifie le rôle requis

### Rôles RBAC

| Rôle | Description | Accès |
|------|-------------|-------|
| `SUPER_ADMIN` | Administrateur régional | Toutes les ressources |
| `ADMIN_ENTREPOT` | Gestionnaire d'entrepôt | Son entrepôt uniquement |
| `DISTRIBUTEUR` | Chauffeur/Livreur | Missions assignées (mobile) |

### Exemple de protection

```typescript
@Controller('missions')
@UseGuards(JwtAuthGuard)
export class MissionsController {
  
  @Post()
  @Roles('ADMIN_ENTREPOT')
  @UseGuards(RolesGuard)
  create(@Body() dto: CreateMissionDto) {
    // Création de mission (admin uniquement)
  }
}
```

---

## 🔄 Pipeline Algorithmique

Le système intègre 3 algorithmes pour l'optimisation logistique :

### 1. AHP (Analytic Hierarchy Process)
**Fichier** : `algorithmes/ahp.service.ts`
- Pondère les critères de priorité (population, vulnérabilité, distance)
- Output : poids normalisés pour chaque douar

### 2. TOPSIS
**Fichier** : `algorithmes/topsis.service.ts`
- Classe les douars selon leur similarité à la solution idéale
- Utilise les poids AHP

### 3. VRP (Vehicle Routing Problem)
**Fichier** : `algorithmes/vrp.service.ts`
- Optimise les tournées de livraison
- Minimise la distance totale parcourue

### Endpoint
```
POST /api/v1/algorithmes/pipeline
Body: { criseId: string, entrepotId: string, capaciteVehicule: number }
Response: { pipelineId, tournees: [...] }
```

---

## 📡 Supervision Temps Réel

### Server-Sent Events (SSE)
**Endpoint** : `GET /api/v1/supervision/stream`
- Flux continu de l'état du système
- Dashboard SuperAdmin en temps réel

### WebSocket GPS
**Gateway** : `gps.gateway.ts`
- Connexion WebSocket sur `/gps`
- Tracking des véhicules en temps réel
- Cache Redis pour les positions récentes

---

## 📝 Audit & Traçabilité

### Intercepteur Global
L'`AuditLogInterceptor` capture automatiquement toutes les mutations :
- **POST / PUT / PATCH / DELETE** → enregistrés
- Données stockées : utilisateur, timestamp, action, payload

### Table `audit_logs` (immuable)
- Aucune suppression possible
- Conservation légale des opérations

---

## 🚀 Démarrage

### Prérequis
- Node.js ≥ 18
- PostgreSQL 15
- Keycloak (voir `../keycloak/`)

### Installation

```bash
cd backend/

# 1. Installer les dépendances
npm install

# 2. Configurer l'environnement
cp .env.example .env
# Éditer .env avec vos valeurs

# 3. Lancer en développement
npm run start:dev

# 4. Compiler pour production
npm run build
npm start
```

### Variables d'environnement (.env)

```env
# === Base de données ===
DB_HOST=localhost
DB_PORT=5432
DB_NAME=reliefchain_db
DB_USER=postgres
DB_PASSWORD=your_password

# === Keycloak ===
KEYCLOAK_SERVER=http://localhost:8180
KEYCLOAK_REALM=Logistique
KEYCLOAK_CLIENT_ID=logistique-api
KEYCLOAK_CLIENT_SECRET=votre_secret_ici

# === JWT ===
JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----

# === Application ===
PORT=9090
FRONTEND_URL=http://localhost:3000
```

---

## 📚 Documentation API

Une fois le serveur démarré :

- **Swagger UI** : http://localhost:9090/api/docs
- **OpenAPI JSON** : http://localhost:9090/api/docs-json

---

## 🧪 Tests

```bash
# Tests unitaires
npm run test

# Tests e2e
npm run test:e2e

# Coverage
npm run test:cov
```

---

## 📦 Déploiement

### Docker (recommandé)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 9090
CMD ["node", "dist/main"]
```

### Points de terminaison santé
- `GET /health` → Vérification disponibilité
- `GET /health/db` → Vérification connexion BDD

---

## 👥 Équipe

- **Azddine EL Hamdaoui** — Architecte Backend
- **Youssef Ait Karroum** — Développeur Full-Stack

---

## 📄 Licence

Projet académique — Tous droits réservés © 2024
