# Keycloak — Infrastructure IAM / SSO

> **Version** : Keycloak 24.0.4  
> **Base de données** : PostgreSQL 15 (dédiée)  
> **Port d'accès** : 8180  
> **Réseau** : mtspc26-network

## 📋 Vue d'ensemble

Ce dossier contient l'infrastructure complète d'**Identity and Access Management (IAM)** pour la plateforme NAJDA. Keycloak fournit :

- **Authentification centralisée** (SSO) pour tous les services
- **Gestion des rôles** (RBAC) avec 3 niveaux de permissions
- **Émission de tokens JWT** signés et vérifiables
- **Interface d'administration** pour la gestion des utilisateurs

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Keycloak Infrastructure                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐         ┌───────────────────────┐     │
│  │  mtspc26-       │         │   mtspc26-            │     │
│  │  keycloak       │◄───────►│   keycloak-db         │     │
│  │  (Port 8180)    │  JDBC   │   (PostgreSQL 5433)   │     │
│  └────────┬────────┘         └───────────────────────┘     │
│           │                                                 │
│           │ OpenID Connect / OAuth 2.0                     │
│           ▼                                                 │
│  ┌────────────────────────────────────────────────────┐    │
│  │                    Clients                          │    │
│  │  • logistique-api      (Backend NestJS)            │    │
│  │  • logistique-web      (Frontend React)            │    │
│  │  • logistique-mobile   (App Expo)                  │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Structure des fichiers

```
keycloak/
├── docker-compose.yml        # Orchestration Docker
├── KEYCLOAK_SETUP.md         # Guide de configuration détaillé
├── realm-export/             # Export/Import du Realm
│   └── (realm-export.json)   # Configuration complète à importer
└── README.md                 # Ce fichier
```

---

## 🚀 Démarrage rapide

### 1. Lancer Keycloak

```bash
cd keycloak/
docker-compose up -d

# Vérifier le statut
docker-compose ps
```

### 2. Accéder à la console d'administration

- **URL** : http://localhost:8180
- **Identifiants** : `admin` / `admin`

### 3. Importer le Realm (optionnel)

Si vous avez un export existant :

```bash
# Le realm-export.json doit être dans realm-export/
docker exec mtspc26-keycloak \
  /opt/keycloak/bin/kc.sh import \
  --dir /opt/keycloak/data/import \
  --realm Logistique
```

---

## ⚙️ Configuration

### Realm : "Logistique"

Le realm est l'espace d'identité isolé pour toute la plateforme.

| Paramètre | Valeur |
|-----------|--------|
| Nom du Realm | `Logistique` |
| Enabled | ON |
| SSL | Externe (en production) |

### Rôles Realm

| Rôle | Description |
|------|-------------|
| `SUPER_ADMIN` | Contrôle total, audit, supervision régionale |
| `ADMIN_ENTREPOT` | Gestion d'un entrepôt spécifique, création missions |
| `DISTRIBUTEUR` | Accès mobile uniquement, exécution missions |

### Clients configurés

#### 1. `logistique-api` (Backend NestJS)

| Paramètre | Valeur |
|-----------|--------|
| Type | OpenID Connect |
| Authentification client | **ON** (confidentiel) |
| Standard flow | OFF |
| Direct access grants | OFF |

**Utilisation** : Le backend valide les JWT mais ne fait pas de login.

#### 2. `logistique-web` (React SPA)

| Paramètre | Valeur |
|-----------|--------|
| Type | OpenID Connect |
| Authentification client | **OFF** (public) |
| Standard flow | ON |
| Redirect URIs | `http://localhost:3000/*` |
| Web origins | `http://localhost:3000` |

#### 3. `logistique-mobile` (Expo/React Native)

| Paramètre | Valeur |
|-----------|--------|
| Type | OpenID Connect |
| Authentification client | **OFF** (public) |
| Standard flow | ON |
| Direct access grants | ON |
| Redirect URIs | `exp://*`, `logistique://*` |

**Utilisation** : Login direct avec username/password pour mobile.

---

## 🔐 Mappers JWT

### Claim `roles` (plat)

Par défaut, Keycloak place les rôles dans `realm_access.roles`. Pour simplifier la lecture côté backend, un mapper expose les rôles dans un claim plat :

```json
{
  "preferred_username": "admin.khenifra",
  "roles": ["ADMIN_ENTREPOT"],
  "iss": "http://localhost:8180/realms/Logistique"
}
```

**Configuration** :
- Client → `logistique-api` → Client scopes → `logistique-api-dedicated`
- Add mapper → User Realm Role
- Token Claim Name : `roles`

---

## 👤 Utilisateurs de test

| Utilisateur | Mot de passe | Rôle | Description |
|-------------|--------------|------|-------------|
| `superadmin` | `Admin@2024!` | SUPER_ADMIN | Admin régional Béni Mellal |
| `admin.khenifra` | `Admin@2024!` | ADMIN_ENTREPOT | Gestionnaire entrepôt Khénifra |
| `hassan.chauffeur` | `Dist@2024!` | DISTRIBUTEUR | Chauffeur/distributeur |

---

## 🌐 Endpoints Keycloak

| Endpoint | URL |
|----------|-----|
| Console Admin | http://localhost:8180/admin |
| Authorization | http://localhost:8180/realms/Logistique/protocol/openid-connect/auth |
| Token | http://localhost:8180/realms/Logistique/protocol/openid-connect/token |
| UserInfo | http://localhost:8180/realms/Logistique/protocol/openid-connect/userinfo |
| JWKS (clés publiques) | http://localhost:8180/realms/Logistique/protocol/openid-connect/certs |
| Logout | http://localhost:8180/realms/Logistique/protocol/openid-connect/logout |

---

## 🧪 Test de l'authentification

### Obtenir un token

```bash
curl -X POST http://localhost:8180/realms/Logistique/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=logistique-mobile" \
  -d "username=admin.khenifra" \
  -d "password=Admin@2024!" \
  -d "grant_type=password"
```

### Réponse

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 300,
  "refresh_expires_in": 1800
}
```

### Vérifier le token

Coller le token sur https://jwt.io pour inspecter le payload.

---

## 💾 Sauvegarde / Restauration

### Exporter le Realm

```bash
docker exec mtspc26-keycloak \
  /opt/keycloak/bin/kc.sh export \
  --dir /opt/keycloak/data/import \
  --realm Logistique \
  --users realm_file
```

Le fichier sera disponible dans `keycloak/realm-export/`.

### Importer le Realm

```bash
docker exec mtspc26-keycloak \
  /opt/keycloak/bin/kc.sh import \
  --dir /opt/keycloak/data/import \
  --realm Logistique
```

---

## 🔧 Dépannage

### Problème : "Invalid redirect URI"

**Solution** : Vérifier que l'URI exacte est configurée dans le client (y compris le port).

### Problème : Token sans rôles

**Solution** : Vérifier que le mapper "User Realm Role" est configuré et ajouté au token.

### Problème : Connexion refusée à PostgreSQL

**Solution** : 
```bash
# Vérifier que la BDD Keycloak est démarrée
docker-compose logs keycloak-db

# Le port 5433 est utilisé pour éviter les conflits avec la BDD applicative
```

### Problème : CORS

**Solution** : Ajouter l'origine dans les "Web origins" du client Keycloak.

---

## 📊 Monitoring

### Logs

```bash
# Logs Keycloak
docker-compose logs -f keycloak

# Logs base de données
docker-compose logs -f keycloak-db
```

### Santé

```bash
# Vérifier que Keycloak répond
curl http://localhost:8180/realms/Logistique
```

---

## 📝 Références

- [Documentation Keycloak](https://www.keycloak.org/documentation)
- [OpenID Connect](https://openid.net/connect/)
- [JWT.io](https://jwt.io)

---

## 👥 Équipe

- **Azddine EL Hamdaoui**
- **Youssef Ait Karroum**

---

## 📄 Licence

Projet académique — Tous droits réservés © 2024
