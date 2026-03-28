/**
 * Layout racine de l'application Expo Router.
 * Enveloppe toute l'app dans AuthProvider.
 */
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { AuthProvider } from './contexts/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <PaperProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)"           options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)"           options={{ headerShown: false }} />
          <Stack.Screen
            name="mission-detail"
            options={{ headerShown: false, presentation: 'card' }}
          />
        </Stack>
      </PaperProvider>
    </AuthProvider>
  );
}
