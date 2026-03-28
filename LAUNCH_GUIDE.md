# Documentation de Lancement Officielle — MTSPC26
# Plateforme Logistique Humanitaire · Béni Mellal-Khénifra

---

## Prérequis

| Outil        | Version min | Vérification          |
|--------------|-----------|-----------------------|
| Docker       | 24+       | `docker --version`    |
| Node.js      | 20 LTS    | `node --version`      |
| npm          | 10+       | `npm --version`       |
| Expo CLI     | 0.18+     | `npx expo --version`  |

---

## Carte des ports (à garder en tête)

| Service                  | Port  | URL locale                        |
|--------------------------|-------|-----------------------------------|
| Keycloak Admin + OIDC    | 8080  | http://localhost:8080             |
| PostgreSQL Keycloak       | 5433  | (interne Docker, ne pas toucher)  |
| PostgreSQL Application   | 5432  | localhost:5432                    |
| Backend NestJS           | 9090  | http://localhost:9090/api/v1      |
| Swagger (docs API)       | 9090  | http://localhost:9090/api/docs    |
| Frontend Web (Vite)      | 3000  | http://localhost:3000             |
| App Mobile (Expo Go)     | 8081  | (QR code dans le terminal)        |

---

## ÉTAPE 1 — Lancer l'Infrastructure Docker

Ouvrir **deux terminaux séparés** (un par conteneur) ou utiliser une seule commande :

```bash
# ── Terminal A : Keycloak + sa BDD interne ──────────────────────────────────
cd /home/azas/TSP_Project/keycloak
docker-compose up -d

# Vérifier que les deux conteneurs sont "Up" (healthy)
docker-compose ps
# Attendu : mtspc26-keycloak (Up) + mtspc26-keycloak-db (Up, healthy)


# ── Terminal B : PostgreSQL applicatif ──────────────────────────────────────
cd /home/azas/TSP_Project/database
docker-compose up -d

# Vérifier
docker-compose ps
# Attendu : mtspc26-app-db (Up, healthy)
```

**Test de vérification Keycloak (attendre ~30 s le temps du démarrage) :**
```bash
curl -s http://localhost:8080/realms/master | grep -o '"realm":"[^"]*"'
# Réponse attendue : "realm":"master"
```

> **IMPORTANT :** Si vous démarrez Keycloak pour la première fois, il faut maintenant
> configurer le Realm manuellement. Référez-vous à `keycloak/KEYCLOAK_SETUP.md`
> (Étapes 1 à 9). Cela prend ~10 minutes et n'est à faire qu'une seule fois.
> Ensuite, exportez le Realm pour ne plus jamais avoir à recommencer.

---

## ÉTAPE 2 — Récupérer le Secret Keycloak (une seule fois)

Après la configuration du Realm :

1. Aller sur http://localhost:8080
2. Se connecter (`admin` / `admin`)
3. Sélectionner le Realm **Logistique** (menu haut-gauche)
4. **Clients** → `logistique-api` → onglet **Credentials**
5. Copier la valeur du champ **Client Secret**
6. Coller cette valeur dans `backend/.env` à la ligne `KEYCLOAK_CLIENT_SECRET=`

---

## ÉTAPE 3 — Les 3 fichiers .env (déjà créés, vérifier les valeurs)

### `backend/.env`

```env
PORT=9090
NODE_ENV=development

# PostgreSQL applicatif (docker/database/docker-compose.yml)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=admin
DB_PASSWORD=admin_password
DB_NAME=mtspc_logistique

# Keycloak (docker/keycloak/docker-compose.yml → port 8080)
KEYCLOAK_SERVER=http://localhost:8080
KEYCLOAK_REALM=Logistique
KEYCLOAK_CLIENT_ID=logistique-api
KEYCLOAK_CLIENT_SECRET=COLLER_LE_SECRET_ICI      ← seule valeur à modifier

KEYCLOAK_JWKS_URI=http://localhost:8080/realms/Logistique/protocol/openid-connect/certs
KEYCLOAK_ISSUER=http://localhost:8080/realms/Logistique

FRONTEND_URL=http://localhost:3000
```

### `mtspc-web/.env`

```env
# Keycloak SSO pour la SPA React
VITE_KEYCLOAK_URL=http://localhost:8080
VITE_KEYCLOAK_REALM=Logistique
VITE_KEYCLOAK_CLIENT_ID=logistique-web

# Backend NestJS
VITE_API_URL=http://localhost:9090/api/v1
```

### `mtspc-mobile/.env`

```env
# ─ Émulateur Android ─────────────────────────────────────────
EXPO_PUBLIC_API_HOST=10.0.2.2
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:9090/api/v1
EXPO_PUBLIC_KEYCLOAK_SERVER=http://10.0.2.2:8080

# ─ Téléphone physique WiFi → remplacer par votre IP locale ───
# Trouver votre IP : hostname -I | awk '{print $1}'
# EXPO_PUBLIC_API_HOST=192.168.1.XXX
# EXPO_PUBLIC_API_BASE_URL=http://192.168.1.XXX:9090/api/v1
# EXPO_PUBLIC_KEYCLOAK_SERVER=http://192.168.1.XXX:8080

EXPO_PUBLIC_KEYCLOAK_REALM=Logistique
EXPO_PUBLIC_KEYCLOAK_CLIENT_ID=logistique-mobile
```

---

## ÉTAPE 4 — Lancer le Backend NestJS

```bash
cd /home/azas/TSP_Project/backend

# Installer les dépendances (une seule fois)
npm install

# Lancer en mode développement (hot-reload)
npm run start:dev
```

**Sorties attendues dans le terminal :**
```
🚀 API Logistique MTSPC26 démarrée
   → Backend  : http://localhost:9090/api/v1
   → Swagger  : http://localhost:9090/api/docs
   → Keycloak : http://localhost:8080/realms/Logistique
```

**Test de vérification :**
```bash
# La route /health est publique (@Public()) — doit répondre sans JWT
curl http://localhost:9090/api/v1/health
# Réponse : {"status":"ok"}

# Une route protégée doit retourner 401 sans token
curl http://localhost:9090/api/v1/missions
# Réponse : {"statusCode":401,"message":"Token JWT manquant ou invalide."}
```

---

## ÉTAPE 5 — Lancer l'Application Web (mtspc-web)

```bash
cd /home/azas/TSP_Project/mtspc-web

# Installer les dépendances (une seule fois)
npm install

# Lancer le serveur de développement Vite
npm run dev
```

**Sortie attendue :**
```
  VITE v5.x.x  ready in 312 ms
  ➜  Local:   http://localhost:3000/
```

Ouvrir http://localhost:3000 dans le navigateur.
L'app redirige immédiatement vers la page de login Keycloak.

**Comptes de test :**

| Compte             | Mot de passe | Rôle             | Dashboard affiché         |
|--------------------|-------------|------------------|---------------------------|
| `admin.khenifra`   | `Admin@2024!` | ADMIN_ENTREPOT  | Stock + Créer Mission     |
| `superadmin`       | `Admin@2024!` | SUPER_ADMIN     | Carte Leaflet + Audit Logs |

---

## ÉTAPE 6 — Lancer l'Application Mobile (mtspc-mobile)

```bash
cd /home/azas/TSP_Project/mtspc-mobile

# Installer les dépendances Expo (une seule fois)
npm install

# Lancer Expo Go
npx expo start
```

Un **QR code** apparaît dans le terminal.

### Scanner depuis un téléphone physique
1. Installer **Expo Go** sur le téléphone (App Store / Google Play)
2. S'assurer que le téléphone et le PC sont sur **le même réseau WiFi**
3. Mettre à jour `mtspc-mobile/.env` avec l'IP locale du PC :
   ```bash
   # Trouver l'IP locale du PC
   hostname -I | awk '{print $1}'
   # Ex : 192.168.1.45
   ```
   Puis dans `.env` remplacer `10.0.2.2` par `192.168.1.45`
4. Scanner le QR code avec l'app Expo Go

### Lancer sur émulateur Android
```bash
# S'assurer qu'un émulateur est démarré dans Android Studio, puis :
npx expo start --android
# Les URLs 10.0.2.2 dans .env fonctionnent nativement pour l'émulateur
```

### Lancer sur simulateur iOS (Mac uniquement)
```bash
npx expo start --ios
# Changer EXPO_PUBLIC_API_HOST=localhost dans .env
```

---

## RÉSUMÉ : Ordre de démarrage en une seule session

```bash
# ─── 1. Infrastructure (2 terminaux) ──────────────────────────
cd ~/TSP_Project/keycloak  && docker-compose up -d
cd ~/TSP_Project/database  && docker-compose up -d

# ─── 2. Backend (1 terminal) ──────────────────────────────────
cd ~/TSP_Project/backend   && npm install && npm run start:dev

# ─── 3. Frontend Web (1 terminal) ─────────────────────────────
cd ~/TSP_Project/mtspc-web && npm install && npm run dev

# ─── 4. Mobile (1 terminal) ───────────────────────────────────
cd ~/TSP_Project/mtspc-mobile && npm install && npx expo start
```

Total : **5 terminaux ouverts** en parallèle.

---

## Commandes utiles

### Arrêter proprement

```bash
# Arrêter les conteneurs Docker (données conservées)
cd ~/TSP_Project/keycloak  && docker-compose down
cd ~/TSP_Project/database  && docker-compose down

# Arrêter backend / web / mobile : Ctrl+C dans chaque terminal
```

### Réinitialiser la base de données (repartir de zéro)

```bash
cd ~/TSP_Project/database
docker-compose down -v          # -v supprime le volume → données effacées
docker-compose up -d            # Recrée le conteneur vide
# Puis relancer le backend : TypeORM synchronize: true recrée les tables
```

### Voir les logs du backend en temps réel

```bash
# Dans le terminal backend, les logs s'affichent automatiquement.
# Pour filtrer uniquement les logs d'audit :
npm run start:dev 2>&1 | grep "\[AUDIT\]"
```

### Tester un JWT manuellement (pour vérifier Keycloak)

```bash
# Obtenir un token pour admin.khenifra
TOKEN=$(curl -s -X POST \
  http://localhost:8080/realms/Logistique/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=logistique-mobile&username=admin.khenifra&password=Admin@2024!&grant_type=password" \
  | jq -r '.access_token')

echo "Token obtenu : ${TOKEN:0:50}..."

# Tester une route protégée du backend avec ce token
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:9090/api/v1/missions
```

---

## Diagnostic des erreurs fréquentes

| Symptôme | Cause probable | Solution |
|---|---|---|
| `curl: Connection refused` sur 8080 | Keycloak pas encore démarré | Attendre 30 s, relancer `docker-compose ps` |
| Backend : `Unable to connect to database` | PostgreSQL non démarré | `cd database && docker-compose up -d` |
| Backend : `Error fetching JWKS` | Keycloak inaccessible depuis NestJS | Vérifier `KEYCLOAK_JWKS_URI` dans `.env` |
| Web : Écran blanc après login | Mauvais `VITE_KEYCLOAK_URL` | Doit être `http://localhost:8080` |
| Mobile : `Network request failed` | Téléphone ne voit pas le PC | Remplacer `10.0.2.2` par l'IP WiFi du PC dans `.env` |
| Mobile : `invalid_redirect_uri` | URI non déclarée dans Keycloak | Vérifier `Valid redirect URIs` contient `logistique://*` |
| JWT rejeté `403 Forbidden` | Rôle non assigné à l'utilisateur | Keycloak Admin → Users → Role mapping |
