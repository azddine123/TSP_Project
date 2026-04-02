/**
 * usePushNotifications — Hook React pour les notifications push FCM
 * =================================================================
 *
 * Gère 3 canaux d'alertes terrain :
 *  1. Notifications Push FCM (expo-notifications) — en background / foreground
 *  2. Écoute WebSocket via alertService — alertes temps réel en cours de tournée
 *  3. Historique local des alertes reçues (état React)
 *
 * Usage :
 *   const { alertes, pushToken, clearAlertes } = usePushNotifications(tourneeId);
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AlerteTerrain } from '../types/app';
import { alertService } from '../services/alertService';

// Configuration du comportement des notifications en foreground
// Wrapped in try-catch : expo-notifications push tokens sont supprimés
// d'Expo Go depuis le SDK 53 (development build requis pour les push distants)
try {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });
} catch (e) {
    console.warn('[Push] setNotificationHandler non disponible dans Expo Go SDK 53+ :', e);
}

interface UsePushNotificationsReturn {
    alertes: AlerteTerrain[];
    pushToken: string | null;
    hasNewAlertes: boolean;
    clearAlertes: () => void;
    markAsSeen: () => void;
}

export function usePushNotifications(tourneeId: string | null): UsePushNotificationsReturn {
    const [alertes, setAlertes] = useState<AlerteTerrain[]>([]);
    const [pushToken, setPushToken] = useState<string | null>(null);
    const [hasNewAlertes, setHasNewAlertes] = useState(false);

    // Références vers les listeners expo-notifications (nettoyage propre)
    const notifListener = useRef<Notifications.EventSubscription | null>(null);
    const responseListener = useRef<Notifications.EventSubscription | null>(null);

    // ── Enregistrement du token FCM ───────────────────────────────────────────

    useEffect(() => {
        _registerForPushNotifications().then(setPushToken);

        // Listener : notification reçue en FOREGROUND
        notifListener.current = Notifications.addNotificationReceivedListener((notification) => {
            const data = notification.request.content.data as Partial<AlerteTerrain>;
            if (data?.id) {
                _addAlerte(data as AlerteTerrain);
            }
        });

        // Listener : utilisateur a tapé sur la notification
        responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
            const data = response.notification.request.content.data as Partial<AlerteTerrain>;
            console.log('[Push] Notification tappée :', data?.type);
        });

        return () => {
            notifListener.current?.remove();
            responseListener.current?.remove();
        };
    }, []);

    // ── Écoute WebSocket des alertes temps réel ───────────────────────────────

    useEffect(() => {
        if (!tourneeId) return;

        // S'abonner au canal d'alertes WebSocket du alertService
        alertService.subscribe((alerte) => {
            _addAlerte(alerte);
            // Afficher aussi une notification locale pour les alertes critiques
            if (alerte.type === 'route_bloquee' || alerte.type === 'replique_sismique') {
                Notifications.scheduleNotificationAsync({
                    content: {
                        title: _getTitre(alerte.type),
                        body: alerte.message,
                        sound: true,
                        data: alerte,
                    },
                    trigger: null, // Immédiat
                });
            }
        });

        return () => {
            alertService.unsubscribe();
        };
    }, [tourneeId]);

    // ── Helpers internes ──────────────────────────────────────────────────────

    const _addAlerte = (alerte: AlerteTerrain) => {
        setAlertes((prev) => {
            // Éviter les doublons
            if (prev.some((a) => a.id === alerte.id)) return prev;
            return [alerte, ...prev]; // Plus récent en premier
        });
        setHasNewAlertes(true);
    };

    const clearAlertes = useCallback(() => {
        setAlertes([]);
        setHasNewAlertes(false);
    }, []);

    const markAsSeen = useCallback(() => {
        setHasNewAlertes(false);
    }, []);

    return { alertes, pushToken, hasNewAlertes, clearAlertes, markAsSeen };
}

// ── Utilitaires ───────────────────────────────────────────────────────────────

async function _registerForPushNotifications(): Promise<string | null> {
    // Les notifications push ne fonctionnent pas sur simulateur iOS
    if (Platform.OS === 'ios') {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            Alert.alert(
                'Notifications désactivées',
                'Activez les notifications pour recevoir les alertes terrain (routes bloquées, répliques...).',
            );
            return null;
        }
    }

    // Sur Android, configurer le canal de notification
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('alertes-terrain', {
            name: 'Alertes Terrain',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            sound: 'default',
            description: 'Alertes critiques : routes bloquées, répliques sismiques.',
        });
    }

    try {
        const tokenData = await Notifications.getExpoPushTokenAsync();
        console.log('[Push] Token FCM enregistré :', tokenData.data);
        return tokenData.data;
    } catch (err) {
        console.warn('[Push] Impossible d\'obtenir le token FCM :', err);
        return null;
    }
}

function _getTitre(type: AlerteTerrain['type']): string {
    switch (type) {
        case 'route_bloquee': return '🚧 Route bloquée !';
        case 'replique_sismique': return '⚠️ Réplique sismique détectée';
        case 'meteo': return '🌩️ Alerte météo';
        case 'recalcul': return '🔄 Itinéraire recalculé';
        default: return 'ℹ️ Information';
    }
}
