/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/(auth)` | `/(auth)/login` | `/(tabs)` | `/(tabs)/home` | `/(tabs)/map` | `/(tabs)/profile` | `/_sitemap` | `/components/MissionCard` | `/config/keycloakConfig` | `/contexts/AuthContext` | `/home` | `/login` | `/map` | `/mission-detail` | `/profile` | `/services/missionService` | `/services/syncService` | `/types/app`;
      DynamicRoutes: never;
      DynamicRouteTemplate: never;
    }
  }
}
