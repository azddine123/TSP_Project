# MTSP-Mobile — Application Mobile Distributeur

> **Framework** : React Native / Expo (SDK 54)  
> **Navigation** : Expo Router (file-based)  
> **UI** : React Native Paper + Tailwind  
> **Authentification** : JWT Keycloak + Biométrie  
> **Plateformes** : iOS, Android  
> **Version** : 1.0.0

## 📋 Vue d'ensemble

L'application mobile **MTSP-Mobile** est destinée aux **distributeurs/chauffeurs** de la plateforme NAJDA. Elle permet :

- 🚛 **Consultation des missions** assignées
- 🗺️ **Navigation GPS** vers les douars (villages)
- ✅ **Confirmation des livraisons** avec signature
- 📍 **Tracking GPS** en temps réel
- 🔐 **Authentification biométrique** (empreinte/Face ID)
- 📴 **Mode hors-ligne** avec synchronisation

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MTSP-Mobile Architecture                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                  Expo Router (File-based)              │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │  /(auth)/                                             │ │
│  │    ├── login.tsx         → Écran de connexion         │ │
│  │    └── _layout.tsx       → Layout groupe auth         │ │
│  │                                                       │ │
│  │  /(tabs)/                                             │ │
│  │    ├── home.tsx          → Tableau de bord            │ │
│  │    ├── map.tsx           → Carte des missions         │ │
│  │    ├── profile.tsx       → Profil & biométrie         │ │
│  │    └── _layout.tsx       → Layout onglets             │ │
│  │                                                       │ │
│  │  /mission-detail.tsx     → Détails mission            │ │
│  │  /livraison-confirmation.tsx → Signature & validation │ │
│  │                                                       │ │
│  └───────────────────────────────────────────────────────┘ │
│                           │                                 │
│                           ▼                                 │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                  Contexts (Global State)               │ │
│  │  • AuthContext          → JWT + utilisateur           │ │
│  │  • (Future: MissionContext, SyncContext...)           │ │
│  └───────────────────────────────────────────────────────┘ │
│                           │                                 │
│                           ▼                                 │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                  Services & Hooks                      │ │
│  │  • useGpsTracking.ts    → Géolocalisation             │ │
│  │  • useBiometrics.ts     → Empreinte/Face ID           │ │
│  │  • API Layer            → Axios + interceptors        │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Structure des dossiers

```
mtspc-mobile/
├── app/                           # Routes Expo Router
│   ├── (auth)/                    # Groupe de routes : authentification
│   │   ├── _layout.tsx            # Layout sans tab bar
│   │   └── login.tsx              # Formulaire de connexion
│   │
│   ├── (tabs)/                    # Groupe de routes : onglets principaux
│   │   ├── _layout.tsx            # Tab Navigator
│   │   ├── home.tsx               # Accueil (missions du jour)
│   │   ├── map.tsx                # Carte avec positions
│   │   └── profile.tsx            # Profil utilisateur
│   │
│   ├── _layout.tsx                # Layout racine (AuthProvider)
│   ├── mission-detail.tsx         # Écran détail mission (modal)
│   └── livraison-confirmation.tsx # Écran confirmation livraison
│
├── contexts/                      # Contexts React (state global)
│   └── AuthContext.tsx            # Gestion JWT + biométrie
│
├── components/                    # Composants réutilisables
│   ├── MissionCard.tsx            # Carte de mission
│   ├── TourneeStepCard.tsx        # Étape de tournée
│   ├── SignatureCanvas.tsx        # Canvas pour signature
│   ├── MapViewWrapper.tsx         # Wrapper react-native-maps
│   └── BordereauDouar.tsx         # Bordereau de livraison
│
├── hooks/                         # Custom hooks
│   ├── useGpsTracking.ts          # Tracking GPS en arrière-plan
│   └── useBiometrics.ts           # Authentification biométrique
│
├── config/                        # Configuration
│   └── keycloakConfig.ts          # Paramètres Keycloak
│
├── types/                         # Types TypeScript
│   └── app.ts                     # Interfaces métier
│
├── mock/                          # Données de test
│   ├── missions.ts                # Missions mockées
│   └── tournees.ts                # Tournées mockées
│
├── assets/                        # Ressources statiques
│   └── images/                    # Logo, icônes, splash
│
├── app.json                       # Configuration Expo
├── package.json                   # Dépendances
└── tsconfig.json                  # Configuration TypeScript
```

---

## 🔐 Authentification

### Flux de connexion

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Login     │────►│  Keycloak Auth  │────►│   JWT Token     │
│   Screen    │     │  (Direct Grant) │     │   + Refresh     │
└─────────────┘     └─────────────────┘     └────────┬────────┘
                                                      │
                                                      ▼
                                             ┌─────────────────┐
                                             │  SecureStore    │
                                             │  (Chiffré)      │
                                             │  • access_token │
                                             │  • refresh_token│
                                             │  • user_data    │
                                             └─────────────────┘
```

### Biométrie

L'application supporte l'authentification biométrique (Face ID / Touch ID / Empreinte) :

1. **Premier login** : Username/password → stockage sécurisé
2. **Activer biométrie** : Dans le profil, activer l'option
3. **Prochains lancements** : Déverrouillage rapide sans réseau

**Fichier** : `app/hooks/useBiometrics.ts`

---

## 🗺️ Fonctionnalités GPS

### Tracking en temps réel

- **Hook** : `useGpsTracking.ts`
- **Fréquence** : Toutes les 30 secondes en mission active
- **Envoi** : WebSocket vers le serveur de supervision
- **Précision** : 10m en zone rurale

### Carte interactive

- **Librairie** : `react-native-maps`
- **Fournisseur** : Google Maps (Android) / Apple Maps (iOS)
- **Fonctionnalités** :
  - Position des douars
  - Itinéraire optimal (VRP)
  - Position des autres véhicules

---

## 📴 Mode hors-ligne

### Stratégie Offline-First

```typescript
// Soumission mission
async function submitMission(missionData) {
  if (netInfo.isConnected) {
    // En ligne → envoi direct
    await api.post('/sync', missionData);
  } else {
    // Hors-ligne → stockage local
    await AsyncStorage.setItem(
      `pending_${missionData.id}`,
      JSON.stringify(missionData)
    );
  }
}

// Synchronisation au retour en ligne
useEffect(() => {
  if (netInfo.isConnected) {
    syncPendingData();
  }
}, [netInfo.isConnected]);
```

**Stockage** : AsyncStorage pour les données en attente  
**Files** : Queue de synchronisation avec retry

---

## 🚀 Démarrage

### Prérequis
- Node.js ≥ 18
- Expo CLI : `npm install -g expo-cli`
- Expo Go sur votre mobile (App Store / Play Store)

### Installation

```bash
cd mtspc-mobile/

# 1. Installer les dépendances
npm install

# 2. Configurer l'environnement
cp .env.example .env
# Éditer .env avec l'IP de votre machine

# 3. Lancer le serveur de développement
npm start
# ou
expo start
```

### Variables d'environnement (.env)

```env
# === API Backend ===
API_URL=http://192.168.1.X:9090/api/v1

# === Keycloak ===
KEYCLOAK_URL=http://192.168.1.X:8180
KEYCLOAK_REALM=Logistique
KEYCLOAK_CLIENT_ID=logistique-mobile

# === Environment ===
ENV=development
```

> ⚠️ Remplacez `192.168.1.X` par l'IP locale de votre machine

### Lancer sur appareil

1. Scanner le QR code avec l'app **Expo Go**
2. Ou utiliser un émulateur : `npm run android` / `npm run ios`

---

## 📱 Écrans principaux

### 1. Login (`app/(auth)/login.tsx`)
- Formulaire username/password
- Bouton biométrie (si activé)
- Logo NAJDA

### 2. Home (`app/(tabs)/home.tsx`)
- Missions du jour
- Statistiques rapides
- Alertes/notifications

### 3. Map (`app/(tabs)/map.tsx`)
- Carte avec position actuelle
- Marqueurs des douars à livrer
- Itinéraire suggéré

### 4. Profil (`app/(tabs)/profile.tsx`)
- Informations utilisateur
- Toggle biométrie
- Déconnexion

### 5. Mission Detail (`app/mission-detail.tsx`)
- Détails de la mission
- Liste des étapes
- Bouton "Démarrer la livraison"

### 6. Livraison Confirmation (`app/livraison-confirmation.tsx`)
- Signature du receveur
- Photo optionnelle
- Confirmation finale

---

## 🔧 Composants clés

### MissionCard
```typescript
<MissionCard
  mission={mission}
  onPress={() => navigateToDetail(mission)}
  status="en_cours" | "terminee" | "en_attente"
/>
```

### SignatureCanvas
```typescript
<SignatureCanvas
  onSignature={(signatureBase64) => saveSignature(signatureBase64)}
  penColor="#0D47A1"
/>
```

### MapViewWrapper
```typescript
<MapViewWrapper
  markers={douars}
  route={optimizedRoute}
  showUserLocation
/>
```

---

## 🧪 Tests

```bash
# Linter
npm run lint

# Tests unitaires
npm test

# Tests sur appareil
expo start --dev-client
```

---

## 📦 Build de production

### Android

```bash
# Générer l'APK
eas build --platform android

# Ou en local
expo build:android
```

### iOS

```bash
# Build EAS (nécessite un compte Apple Developer)
eas build --platform ios

# Ou local (Mac uniquement)
expo build:ios
```

---

## 🐛 Dépannage

### Problème : "Network Error"
**Solution** : Vérifier que l'IP dans `.env` correspond à votre machine et que le backend est accessible.

### Problème : Carte vide
**Solution** : Vérifier que la clé API Google Maps est configurée dans `app.json`.

### Problème : Biométrie ne fonctionne pas
**Solution** : Vérifier les permissions dans `app.json` et que l'appareil supporte la biométrie.

### Problème : SecureStore échoue
**Solution** : Sur Android, l'appareil doit avoir un verrouillage d'écran configuré.

---

## 🔒 Sécurité

- **JWT** : Stocké de manière chiffrée via SecureStore
- **Biométrie** : Déverrouille l'accès aux tokens existants (pas de login réseau)
- **Certificat pinning** : À implémenter pour la production
- **Root detection** : Vérification de l'intégrité de l'appareil

---

## 📚 Documentation

- [Expo Documentation](https://docs.expo.dev)
- [React Native](https://reactnative.dev)
- [React Native Paper](https://reactnativepaper.com)

---

## 👥 Équipe

- **Azddine EL Hamdaoui**
- **Youssef Ait Karroum**

---

## 📄 Licence

Projet académique — Tous droits réservés © 2024
