import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Switch
} from 'react-native';

import { useAuth } from '../../contexts/AuthContext';
import { useBiometrics } from '../hooks/useBiometrics';
import { COLORS, FONTS, SHADOWS, SIZES } from '../../theme';

const ProfileScreen = () => {
  const { user, logout, isBiometricEnabled, setBiometricEnabled } = useAuth();
  const { isAvailable, biometricType } = useBiometrics();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(!!state.isConnected);
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh or re-fetch data if needed
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleToggleBiometric = async (value: boolean) => {
    if (value && !isAvailable) {
      Alert.alert(
        'Biométrie indisponible',
        'Aucune empreinte ou Face ID n\'est enregistré sur cet appareil. Configurez-le dans les réglages du système.',
      );
      return;
    }
    await setBiometricEnabled(value);
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Déconnexion', 
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/(auth)/login');
            } catch (error) {
              console.error('❌ Erreur logout:', error);
            }
          }
        }
      ]
    );
  };

  const getRoleDisplayName = (roles: string[]) => {
    const roleMap: { [key: string]: string } = {
      'SAMPLER': 'Agent de Collecte',
      'ROLE_ADMIN': 'Administrateur',
      'TECHNICIAN': 'Technicien',
      'SUPERVISOR': 'Superviseur',
      'MANAGER': 'Gestionnaire',
      'DISTRIBUTEUR': 'Agent de Distribution',
      'ADMIN': 'Administrateur'
    };
    
    return roles.map(role => roleMap[role.toUpperCase()] || role).join(', ') || 'Agent Terrain';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement du profil...</Text>
      </View>
    );
  }

  const fullName = user?.username ? (user.username.includes('.') ? user.username.split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ') : user.username) : 'Utilisateur';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
      >
        {!isOnline && (
          <View style={styles.offlineBanner}>
            <Icon name="cloud-off-outline" size={20} color="#fff" />
            <Text style={styles.offlineText}>Mode hors ligne - Synchronisation en attente</Text>
          </View>
        )}
        
        {/* 🔷 1. En-tête / Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarPlaceholder}>
                <Icon name="account" size={80} color={COLORS.mediumGrey} />
            </View>
            <TouchableOpacity style={styles.editAvatarButton}>
              <Icon name="camera" size={16} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.userName}>{fullName}</Text>
          <View style={styles.roleContainer}>
            <Icon name="badge-account" size={16} color="#FF6B35" />
            <Text style={styles.userRole}>{getRoleDisplayName(user?.roles || [])}</Text>
          </View>
          <Text style={styles.userId}>ID: {user?.userId || 'N/A'}</Text>
          
          <View style={styles.connectionStatus}>
            <View style={[styles.statusIndicator, { backgroundColor: isOnline ? COLORS.success : COLORS.error }]} />
            <Text style={styles.statusText}>{isOnline ? 'En ligne' : 'Hors ligne'}</Text>
          </View>
        </View>
        
        {/* 🔷 2. Informations personnelles */}
        <Section title="Informations personnelles">
          <InfoRow 
            icon="email-outline" 
            label="Adresse e-mail" 
            value={user?.email || 'N/A'} 
          />
          <InfoRow 
            icon="phone-outline" 
            label="Numéro de téléphone" 
            value={'+212 6 -- -- -- --'} 
          />
        </Section>

        {/* 🔷 3. Sécurité & Biométrie */}
        <Section title="Sécurité">
          {isAvailable && (
            <View style={styles.biometricRow}>
              <View style={styles.infoIconContainer}>
                <Icon name={biometricType === 'faceid' ? 'face-recognition' : 'fingerprint'} size={24} color={COLORS.textSecondary} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>{biometricType === 'faceid' ? 'Face ID' : 'Empreinte digitale'}</Text>
                <Text style={styles.infoSubtitle}>Déverrouiller sans mot de passe</Text>
              </View>
              <Switch
                value={isBiometricEnabled}
                onValueChange={handleToggleBiometric}
                trackColor={{ false: COLORS.mediumGrey, true: COLORS.primary }}
                thumbColor={COLORS.white}
              />
            </View>
          )}
        </Section>

        {/* 🔷 4. Paramètres */}
        <Section title="Paramètres">
          <SettingsRow 
            icon="cog" 
            label="Paramètres généraux" 
            subtitle="Langue, notifications, affichage" 
            onPress={() => Alert.alert('Information', 'Paramètres bientôt disponibles')} 
          />
          <SettingsRow 
            icon="account-edit" 
            label="Modifier profil" 
            subtitle="Mettre à jour vos informations" 
            onPress={() => Alert.alert('Information', 'Modification disponible prochainement')} 
          />
        </Section>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Icon name="logout" size={20} color={COLORS.white} />
          <Text style={styles.logoutButtonText}>Déconnexion</Text>
        </TouchableOpacity>
        
      </ScrollView>
    </SafeAreaView>
  );
};

const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.infoCard}>{children}</View>
  </View>
);

const InfoRow = ({ label, value, icon, statusColor, onPress }: { label: string, value?: string, icon: any, statusColor?: string, onPress?: () => void }) => {
  if (!value || value === 'N/A') return null;
  return (
    <TouchableOpacity style={styles.infoRow} onPress={onPress} disabled={!onPress}>
      <Icon name={icon} size={24} color={COLORS.textSecondary} style={styles.infoIcon} />
      <View style={styles.infoTextContainer}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, statusColor ? { color: statusColor } : {}]}>{value}</Text>
      </View>
      {onPress && <Icon name="chevron-right" size={20} color={COLORS.textSecondary} />}
    </TouchableOpacity>
  );
};

const SettingsRow = ({ icon, label, subtitle, onPress }: { icon: any, label: string, subtitle: string, onPress: () => void }) => (
  <TouchableOpacity style={styles.settingsRow} onPress={onPress}>
    <Icon name={icon} size={24} color={COLORS.textSecondary} style={styles.infoIcon} />
    <View style={styles.settingsTextContainer}>
      <Text style={styles.settingsLabel}>{label}</Text>
      <Text style={styles.settingsSubtitle}>{subtitle}</Text>
    </View>
    <Icon name="chevron-right" size={20} color={COLORS.textSecondary} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    ...FONTS.body1,
    marginTop: SIZES.md,
    color: COLORS.textSecondary,
  },
  header: {
    alignItems: 'center',
    paddingVertical: SIZES.xl,
    paddingHorizontal: SIZES.lg,
    backgroundColor: COLORS.white,
    marginHorizontal: SIZES.md,
    marginTop: SIZES.md,
    borderRadius: SIZES.lg,
    ...SHADOWS.md,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.lg,
    position: 'relative',
    ...SHADOWS.md,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E1E2E1',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  userName: {
    ...FONTS.h2,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SIZES.xs,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.xs,
  },
  userRole: {
    ...FONTS.body1,
    color: '#FF6B35',
    fontWeight: '600',
    marginLeft: SIZES.xs,
  },
  userId: {
    ...FONTS.body2,
    color: COLORS.textSecondary,
    marginBottom: SIZES.md,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.md,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    ...SHADOWS.sm,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: SIZES.sm,
  },
  statusText: {
    ...FONTS.body2,
    color: COLORS.textSecondary,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error,
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.md,
  },
  offlineText: {
    ...FONTS.body2,
    color: '#fff',
    marginLeft: SIZES.sm,
  },
  section: {
    marginHorizontal: SIZES.md,
    marginTop: SIZES.lg,
  },
  sectionTitle: {
    ...FONTS.body2,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SIZES.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.lg,
    paddingVertical: SIZES.sm,
    ...SHADOWS.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoIcon: {
    marginRight: SIZES.sm,
  },
  infoIconContainer: {
    marginRight: SIZES.sm,
    width: 24,
    alignItems: 'center',
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    ...FONTS.body2,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  infoSubtitle: {
    ...FONTS.body2,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  infoValue: {
    ...FONTS.body1,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  biometricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingsTextContainer: {
    flex: 1,
  },
  settingsLabel: {
    ...FONTS.body1,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  settingsSubtitle: {
    ...FONTS.body2,
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.error,
    marginHorizontal: SIZES.md,
    marginVertical: SIZES.lg,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.lg,
    ...SHADOWS.md,
  },
  logoutButtonText: {
    ...FONTS.h3,
    color: COLORS.white,
    marginLeft: SIZES.sm,
  },
});

export default ProfileScreen;
