/**
 * Layout racine — Gestion de la navigation selon l'état d'authentification.
 * - isLoading     → écran de chargement (vérification session stockée)
 * - non connecté  → redirige vers /(auth)/login
 * - connecté      → redirige vers /(tabs)/home
 */
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Pas connecté → aller au login
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Déjà connecté → aller à l'accueil
      router.replace('/(tabs)/home');
    }
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0D47A1', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="mission-detail"
        options={{ headerShown: false, presentation: 'card' }}
      />
      <Stack.Screen
        name="livraison-confirmation"
        options={{ headerShown: false, presentation: 'card' }}
      />
      <Stack.Screen
        name="settings"
        options={{ headerShown: false, presentation: 'card' }}
      />
      <Stack.Screen
        name="biometric-settings"
        options={{ headerShown: false, presentation: 'card' }}
      />
      <Stack.Screen
        name="theme-settings"
        options={{ headerShown: false, presentation: 'card' }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <PaperProvider>
        <RootNavigator />
      </PaperProvider>
    </AuthProvider>
  );
}
