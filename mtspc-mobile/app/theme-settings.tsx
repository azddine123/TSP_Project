/**
 * THEME SETTINGS SCREEN — MTSPC Mobile
 * ======================================
 * Inspiré de LabCollect ThemeSettingsScreen.
 * Mode d'affichage + taille de police, persistés via AsyncStorage.
 */
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const C = {
  primary:  '#1565C0',
  bg:       '#F5F5F5',
  surface:  '#fff',
  border:   '#E0E0E0',
  textPri:  '#212121',
  textSec:  '#757575',
  white:    '#fff',
  selected: '#E3F2FD',
};

type ThemeMode = 'light' | 'dark' | 'auto';
type FontSize  = 'small' | 'medium' | 'large';

const STORAGE_KEY_THEME = 'najda_theme_mode';
const STORAGE_KEY_FONT  = 'najda_font_size';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface Option {
  id:          string;
  title:       string;
  description: string;
  icon:        IconName;
}

const themeModeOptions: Option[] = [
  { id: 'light', title: 'Mode clair',    description: 'Thème clair par défaut',        icon: 'sunny' },
  { id: 'dark',  title: 'Mode sombre',   description: 'Économise la batterie',          icon: 'moon' },
  { id: 'auto',  title: 'Automatique',   description: 'Suit les paramètres système',    icon: 'contrast' },
];

const fontSizeOptions: Option[] = [
  { id: 'small',  title: 'Petite',   description: 'Texte compact',    icon: 'text' },
  { id: 'medium', title: 'Moyenne',  description: 'Taille par défaut', icon: 'text' },
  { id: 'large',  title: 'Grande',   description: 'Texte agrandi',    icon: 'text' },
];

export default function ThemeSettingsScreen() {
  const router = useRouter();
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [fontSize,  setFontSize]  = useState<FontSize>('medium');

  useEffect(() => {
    AsyncStorage.multiGet([STORAGE_KEY_THEME, STORAGE_KEY_FONT]).then(([[, tm], [, fs]]) => {
      if (tm) setThemeMode(tm as ThemeMode);
      if (fs) setFontSize(fs as FontSize);
    });
  }, []);

  const selectTheme = async (mode: ThemeMode) => {
    setThemeMode(mode);
    await AsyncStorage.setItem(STORAGE_KEY_THEME, mode);
  };

  const selectFont = async (size: FontSize) => {
    setFontSize(size);
    await AsyncStorage.setItem(STORAGE_KEY_FONT, size);
  };

  const handleReset = () => {
    Alert.alert(
      'Réinitialiser',
      'Remettre les paramètres d\'affichage par défaut ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser',
          style: 'destructive',
          onPress: async () => {
            setThemeMode('light');
            setFontSize('medium');
            await AsyncStorage.multiRemove([STORAGE_KEY_THEME, STORAGE_KEY_FONT]);
          },
        },
      ]
    );
  };

  const renderOptions = <T extends string>(
    options: Option[],
    selected: T,
    onSelect: (v: T) => void,
    title: string
  ) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>
        {options.map((opt, i) => (
          <TouchableOpacity
            key={opt.id}
            style={[
              styles.optionRow,
              i < options.length - 1 && styles.itemBorder,
              selected === opt.id && styles.optionRowSelected,
            ]}
            onPress={() => onSelect(opt.id as T)}
            activeOpacity={0.7}
          >
            <View style={styles.optionLeft}>
              <View style={[styles.optionIconWrap, selected === opt.id && styles.optionIconWrapSelected]}>
                <Ionicons
                  name={opt.icon}
                  size={20}
                  color={selected === opt.id ? C.primary : C.textSec}
                />
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionLabel, selected === opt.id && styles.optionLabelSelected]}>
                  {opt.title}
                </Text>
                <Text style={styles.optionDesc}>{opt.description}</Text>
              </View>
            </View>
            {selected === opt.id && (
              <Ionicons name="checkmark-circle" size={20} color={C.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={C.textPri} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Personnalisation</Text>
        <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
          <Ionicons name="refresh" size={20} color={C.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Mode d'affichage */}
        {renderOptions(themeModeOptions, themeMode, selectTheme, "Mode d'affichage")}

        {/* Taille de police */}
        {renderOptions(fontSizeOptions, fontSize, selectFont, 'Taille de police')}

        {/* Aperçu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aperçu</Text>
          <View style={[styles.previewCard, themeMode === 'dark' && styles.previewCardDark]}>
            <View style={styles.previewHeader}>
              <View style={styles.previewAvatar}>
                <Ionicons name="person" size={24} color={C.white} />
              </View>
              <View>
                <Text style={[
                  styles.previewTitle,
                  themeMode === 'dark' && { color: '#fff' },
                  fontSize === 'small' && { fontSize: 13 },
                  fontSize === 'large' && { fontSize: 19 },
                ]}>
                  NAJDA — MTSPC
                </Text>
                <Text style={[
                  styles.previewSub,
                  themeMode === 'dark' && { color: '#aaa' },
                  fontSize === 'small' && { fontSize: 10 },
                  fontSize === 'large' && { fontSize: 14 },
                ]}>
                  Mode: {themeMode} · Police: {fontSize}
                </Text>
              </View>
            </View>
            <View style={styles.previewBtn}>
              <Text style={styles.previewBtnText}>Exemple de bouton</Text>
            </View>
          </View>
        </View>

        {/* Info */}
        <View style={[styles.infoCard]}>
          <Ionicons name="information-circle" size={20} color={C.primary} />
          <Text style={styles.infoText}>
            Les changements de thème s'appliquent au prochain redémarrage de l'application.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
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
  backBtn:  { padding: 4 },
  resetBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.textPri },
  content: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.textSec,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionRowSelected: { backgroundColor: C.selected },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  optionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  optionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.bg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionIconWrapSelected: { backgroundColor: '#BBDEFB' },
  optionText: { flex: 1 },
  optionLabel: { fontSize: 15, fontWeight: '500', color: C.textPri },
  optionLabelSelected: { color: C.primary, fontWeight: '700' },
  optionDesc: { fontSize: 12, color: C.textSec, marginTop: 2 },
  previewCard: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  previewCardDark: { backgroundColor: '#1E1E1E' },
  previewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  previewAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewTitle: { fontSize: 16, fontWeight: '700', color: C.textPri },
  previewSub:   { fontSize: 12, color: C.textSec, marginTop: 2 },
  previewBtn: {
    backgroundColor: C.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  previewBtnText: { fontSize: 14, fontWeight: '600', color: C.white },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
    padding: 14,
    gap: 10,
    marginBottom: 8,
  },
  infoText: { fontSize: 13, color: '#1565C0', flex: 1, lineHeight: 19 },
});
