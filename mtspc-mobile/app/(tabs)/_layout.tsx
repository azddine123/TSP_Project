/**
 * Layout des onglets de l'app mobile.
 * Redirige vers le login si l'utilisateur n'est pas authentifié.
 */
import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { ActivityIndicator, View } from 'react-native';

export default function TabsLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1565C0" />
      </View>
    );
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
          title:       'Mes Missions',
          tabBarIcon:  ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
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
