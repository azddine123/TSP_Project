/**
 * SETTINGS SCREEN — MTSPC Mobile
 * ================================
 * Écran principal des paramètres, inspiré de LabCollect.
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

// ── Couleurs NAJDA ────────────────────────────────────────────────────────────
const C = {
  primary:   '#1565C0',
  error:     '#D32F2F',
  success:   '#2E7D32',
  warning:   '#F57F17',
  bg:        '#F5F5F5',
  surface:   '#fff',
  border:    '#E0E0E0',
  textPri:   '#212121',
  textSec:   '#757575',
  white:     '#fff',
};

// ── Types ─────────────────────────────────────────────────────────────────────
type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface SettingItem {
  icon:     IconName;
  label:    string;
  subtitle: string;
  onPress:  () => void;
}

interface SettingSection {
  title:     string;
  icon:      IconName;
  iconColor: string;
  items:     SettingItem[];
}

// ── Composant ─────────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  const sections: SettingSection[] = [
    {
      title: 'Sécurité',
      icon: 'shield-checkmark',
      iconColor: C.error,
      items: [
        {
          icon: 'finger-print',
          label: 'Données biométriques',
          subtitle: "Activer l'authentification par empreinte",
          onPress: () => router.push('/biometric-settings'),
        },
        {
          icon: 'lock-closed',
          label: 'Authentification à deux facteurs',
          subtitle: 'Sécuriser davantage votre compte',
          onPress: () => {},
        },
      ],
    },
    {
      title: 'Affichage',
      icon: 'color-palette',
      iconColor: C.primary,
      items: [
        {
          icon: 'contrast',
          label: 'Thème',
          subtitle: 'Clair, sombre ou automatique',
          onPress: () => router.push('/theme-settings'),
        },
        {
          icon: 'text',
          label: 'Taille du texte',
          subtitle: 'Ajuster la taille de la police',
          onPress: () => router.push('/theme-settings'),
        },
      ],
    },
    {
      title: 'Langues',
      icon: 'language',
      iconColor: C.success,
      items: [
        {
          icon: 'flag',
          label: 'Français',
          subtitle: 'Langue actuelle',
          onPress: () => {},
        },
        {
          icon: 'flag',
          label: 'العربية',
          subtitle: 'تغيير إلى العربية',
          onPress: () => {},
        },
        {
          icon: 'flag',
          label: 'English',
          subtitle: 'Switch to English',
          onPress: () => {},
        },
      ],
    },
    {
      title: 'Données',
      icon: 'server',
      iconColor: C.warning,
      items: [
        {
          icon: 'download',
          label: 'Exporter mes données',
          subtitle: 'Télécharger vos données personnelles',
          onPress: () => {},
        },
        {
          icon: 'trash',
          label: 'Supprimer le cache',
          subtitle: "Libérer de l'espace de stockage",
          onPress: () => router.push('/(tabs)/profile'),
        },
        {
          icon: 'sync',
          label: 'Synchronisation',
          subtitle: 'Gérer la synchronisation des données',
          onPress: () => router.push('/(tabs)/profile'),
        },
      ],
    },
    {
      title: 'Support',
      icon: 'help-circle',
      iconColor: C.primary,
      items: [
        {
          icon: 'call',
          label: 'Contacter le support',
          subtitle: "Obtenir de l'aide technique",
          onPress: () => {},
        },
        {
          icon: 'document-text',
          label: "Conditions d'utilisation",
          subtitle: "Lire les conditions d'utilisation",
          onPress: () => {},
        },
        {
          icon: 'information-circle',
          label: 'À propos',
          subtitle: "Version 1.0.0 — Plateforme NAJDA",
          onPress: () => {},
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={C.textPri} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paramètres</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {sections.map((section, si) => (
          <View key={si} style={styles.section}>
            {/* Section header */}
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconWrap, { backgroundColor: section.iconColor + '18' }]}>
                <Ionicons name={section.icon} size={18} color={section.iconColor} />
              </View>
              <Text style={[styles.sectionTitle, { color: section.iconColor }]}>{section.title}</Text>
            </View>

            {/* Items */}
            <View style={styles.card}>
              {section.items.map((item, ii) => (
                <TouchableOpacity
                  key={ii}
                  style={[styles.item, ii < section.items.length - 1 && styles.itemBorder]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemLeft}>
                    <Ionicons name={item.icon} size={22} color={C.textSec} />
                    <View style={styles.itemText}>
                      <Text style={styles.itemLabel}>{item.label}</Text>
                      <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={C.primary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Déconnexion */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out" size={20} color={C.white} />
          <Text style={styles.logoutText}>Déconnexion</Text>
        </TouchableOpacity>

        <Text style={styles.version}>NAJDA MTSPC v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.textPri,
  },
  headerPlaceholder: { width: 32 },
  section: { marginTop: 20 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: C.surface,
    marginHorizontal: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemText: {
    marginLeft: 12,
    flex: 1,
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: C.textPri,
  },
  itemSubtitle: {
    fontSize: 12,
    color: C.textSec,
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.error,
    marginHorizontal: 16,
    marginTop: 28,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    elevation: 2,
    shadowColor: C.error,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: C.white,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: C.textSec,
    marginTop: 16,
    marginBottom: 32,
  },
});
