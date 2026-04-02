import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth }        from '../../contexts/AuthContext';
import { useBiometrics }  from '../../hooks/useBiometrics';

export default function ProfileScreen() {
  const { user, logout, isBiometricEnabled, setBiometricEnabled } = useAuth();
  const { isAvailable, biometricType } = useBiometrics();

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
      'Voulez-vous vous déconnecter ? Les missions non synchronisées seront conservées.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Déconnexion', style: 'destructive', onPress: logout },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Ionicons name="person" size={40} color="#fff" />
      </View>

      <Text style={styles.name}>{user?.username}</Text>
      <Text style={styles.email}>{user?.email}</Text>

      <View style={styles.roleBadge}>
        <Text style={styles.roleText}>
          {user?.roles[0] || 'DISTRIBUTEUR'}
        </Text>
      </View>

      {/* Toggle biométrie */}
      {isAvailable && (
        <View style={styles.biometricRow}>
          <View style={styles.biometricInfo}>
            <Text style={styles.biometricRowLabel}>
              {biometricType === 'faceid' ? '👤 Face ID' : '🫆 Empreinte digitale'}
            </Text>
            <Text style={styles.biometricRowDesc}>
              Déverrouiller l'app sans mot de passe
            </Text>
          </View>
          <Switch
            value={isBiometricEnabled}
            onValueChange={handleToggleBiometric}
            trackColor={{ false: '#ccc', true: '#1565C0' }}
            thumbColor="#fff"
          />
        </View>
      )}

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out" size={20} color="#E53935" />
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#F4F6F9' },
  avatar:            { width: 80, height: 80, borderRadius: 40, backgroundColor: '#1565C0', alignItems: 'center', justifyContent: 'center' },
  name:              { fontSize: 22, fontWeight: '700', color: '#1A237E' },
  email:             { fontSize: 14, color: '#666' },
  roleBadge:         { backgroundColor: '#E3F2FD', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  roleText:          { color: '#1565C0', fontWeight: '700', fontSize: 13 },
  biometricRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '85%', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginTop: 8, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  biometricInfo:     { flex: 1 },
  biometricRowLabel: { fontSize: 15, fontWeight: '600', color: '#1A237E' },
  biometricRowDesc:  { fontSize: 12, color: '#888', marginTop: 2 },
  logoutBtn:         { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, padding: 12 },
  logoutText:        { color: '#E53935', fontSize: 16, fontWeight: '600' },
});
