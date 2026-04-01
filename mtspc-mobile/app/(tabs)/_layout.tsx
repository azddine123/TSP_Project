/**
 * Layout des onglets de l'app mobile — SDK 54 / expo-router v4
 * =============================================================
 * SDK 54 / expo-router v4 breaking change :
 * Le pattern useEffect + router.replace() pour les redirections d'auth
 * cause un flash de l'UI non authentifiée et des race conditions.
 * → Utiliser le composant <Redirect> d'expo-router (rendu synchrone,
 *   avant que les tabs ne soient montés).
 */
import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { ActivityIndicator, View } from 'react-native';

export default function TabsLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1565C0" />
      </View>
    );
  }

  // Redirect est rendu avant le montage des tabs → pas de flash de contenu
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor:   '#1565C0',
        tabBarInactiveTintColor: '#9E9E9E',
        tabBarStyle: {
          borderTopWidth:  1,
          borderTopColor: '#E0E0E0',
          paddingBottom:   4,
          height:          58,
        },
        headerStyle:      { backgroundColor: '#1565C0' },
        headerTintColor:  '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title:      'Missions',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tour"
        options={{
          title:      'Tournée',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="navigate" size={size} color={color} />
          ),
          headerStyle:      { backgroundColor: '#1565C0' },
          headerTintColor:  '#fff',
          headerTitleStyle: { fontWeight: '700' },
          headerTitle:      'Tournée VRP',
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title:      'Carte',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title:      'Profil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
