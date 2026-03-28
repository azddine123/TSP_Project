# Guide de Configuration Keycloak — ReliefChain
# Plateforme Logistique Humanitaire — Béni Mellal-Khénifra

---

## ÉTAPE 0 — Lancer Keycloak avec Docker

```bash
# Se placer dans le dossier keycloak/
cd TSP_Project/keycloak/

# Lancer Keycloak + sa BDD PostgreSQL dédiée (port 5433)
docker-compose up -d

# Vérifier que les deux conteneurs sont bien "Up"
docker-compose ps
```

Attendre ~30 secondes, puis ouvrir : **http://localhost:8080**
Identifiants : `admin` / `admin`

> Port 8080 : interface admin Keycloak
> Port 5433 : PostgreSQL de Keycloak (ne pas confondre avec la BDD applicative sur 5432)

---

## ÉTAPE 1 — Créer le Realm "Logistique"

Un **Realm** est un espace d'identité isolé. Tout notre RBAC vivra dans ce Realm.

- Passer la souris sur **"master"** (menu haut-gauche) → **"Create realm"**
- **Realm name** : `Logistique`
- **Enabled** : ON
- Cliquer **"Create"**

---

## ÉTAPE 2 — Créer les 3 Rôles RBAC

Menu : **Realm roles** → **"Create role"**

| Role Name        | Description à saisir                                          |
|------------------|---------------------------------------------------------------|
| `SUPER_ADMIN`    | Audit global, carte régionale, gouvernance IAM                |
| `ADMIN_ENTREPOT` | Master Data stock, création missions, gestion distributeurs   |
| `DISTRIBUTEUR`   | Accès mobile uniquement, exécution des missions terrain       |

---

## ÉTAPE 3 — Créer le Client `logistique-api` (Backend NestJS — confidentiel)

**Clients** → **"Create client"**

| Champ                  | Valeur               |
|------------------------|----------------------|
| Client type            | OpenID Connect       |
| Client ID              | `logistique-api`     |
| Name                   | API Logistique ReliefChain |

Onglet **"Capability config"** :
- **Client authentication** : `ON` ← rend le client "confidentiel" (possède un secret)
- **Standard flow**          : `OFF`
- **Direct access grants**   : `OFF`

Après sauvegarde → onglet **Credentials** → copier le **Client Secret** → le coller dans `backend/.env`

---

## ÉTAPE 4 — Créer le Client `logistique-mobile` (App Expo — public)

| Champ                 | Valeur                |
|-----------------------|-----------------------|
| Client ID             | `logistique-mobile`   |
| Client authentication | `OFF` ← client public |
| Standard flow         | `ON`                  |
| Direct access grants  | `ON`                  |

Onglet **"Login settings"** :
```
Valid redirect URIs :
  exp://localhost:8081/*
  exp://192.168.*:8081/*
  logistique://*

Web origins : +
```

---

## ÉTAPE 5 — Créer le Client `logistique-web` (React.js SPA — public)

| Champ                 | Valeur             |
|-----------------------|--------------------|
| Client ID             | `logistique-web`   |
| Client authentication | `OFF`              |
| Standard flow         | `ON`               |

Onglet **"Login settings"** :
```
Valid redirect URIs : http://localhost:3000/*
Web origins         : http://localhost:3000
```

---

## ÉTAPE 6 — Mapper les Rôles dans le JWT (claim plat)

Par défaut Keycloak met les rôles dans `realm_access.roles` (imbriqué).
Ce mapper les expose aussi dans un claim plat `roles` pour simplifier la lecture côté NestJS.

**Clients** → `logistique-api` → **Client scopes** → `logistique-api-dedicated`
→ **"Add mapper"** → **"By configuration"** → **"User Realm Role"**

| Champ               | Valeur  |
|---------------------|---------|
| Name                | `roles` |
| Token Claim Name    | `roles` |
| Claim JSON Type     | `String`|
| Add to access token | `ON`    |
| Add to userinfo     | `ON`    |

Répéter pour les clients `logistique-mobile` et `logistique-web`.

---

## ÉTAPE 7 — Créer les 3 Utilisateurs de Test

**Users** → **"Create new user"**

### Super-Admin (Wilaya de Béni Mellal)
- **Username** : `superadmin`
- **Email** : `superadmin@beni-mellal.gov.ma`
- Onglet **Credentials** → **"Set password"** : `Admin@2024!` → désactiver **"Temporary"**
- Onglet **Role mapping** → **"Assign role"** → `SUPER_ADMIN`

### Admin Entrepôt Khénifra
- **Username** : `admin.khenifra`
- **Email** : `admin@entrepot-khenifra.gov.ma`
- Password : `Admin@2024!`
- Role mapping → `ADMIN_ENTREPOT`

### Distributeur / Chauffeur
- **Username** : `hassan.chauffeur`
- **Email** : `h.chauffeur@dist.ma`
- Password : `Dist@2024!`
- Role mapping → `DISTRIBUTEUR`

---

## ÉTAPE 8 — Vérifier qu'un Token JWT est généré correctement

```bash
# Demander un token pour le compte Admin Entrepôt
curl -s -X POST \
  http://localhost:8080/realms/Logistique/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=logistique-mobile" \
  -d "username=admin.khenifra" \
  -d "password=Admin@2024!" \
  -d "grant_type=password" | jq '.access_token'
```

Si la commande retourne une longue chaîne JWT → Keycloak est opérationnel.

Coller ce token sur **https://jwt.io** pour vérifier que le payload contient :
```json
{
  "roles": ["ADMIN_ENTREPOT"],
  "preferred_username": "admin.khenifra",
  "iss": "http://localhost:8080/realms/Logistique"
}
```

---

## ÉTAPE 9 — Exporter le Realm (assurance pour le Jour J)

Une fois toute la configuration faite, exporter le Realm dans `keycloak/realm-export/`.
Ce fichier permet de tout recréer en 1 commande si la machine est réinitialisée.

```bash
docker exec mtspc26-keycloak \
  /opt/keycloak/bin/kc.sh export \
  --dir /opt/keycloak/data/import \
  --realm Logistique \
  --users realm_file

# Le fichier est maintenant dans keycloak/realm-export/
ls -la keycloak/realm-export/
```
