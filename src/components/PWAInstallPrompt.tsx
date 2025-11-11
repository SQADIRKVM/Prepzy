import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAlert } from '../hooks/useAlert';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const { theme } = useTheme();
  const { showAlert } = useAlert();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Only show on web
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // Show iOS install instructions
      if (Platform.OS === 'web' && /iPad|iPhone|iPod/.test(navigator.userAgent)) {
        showAlert({
          title: 'Install on iOS',
          message: 'To install this app:\n\n1. Tap the Share button (square with arrow)\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add"',
          icon: 'information-circle',
          buttons: [{ text: 'Got it', style: 'default' }],
        });
      }
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowPrompt(false);
        setDeferredPrompt(null);
      }
    } catch (error) {
      console.error('Error installing PWA:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt || Platform.OS !== 'web') {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      <View style={styles.content}>
        <Ionicons name="download-outline" size={24} color={theme.colors.text.inverse} />
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: theme.colors.text.inverse }]}>
            Install Prepzy
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.text.inverse }]}>
            Add to home screen for quick access
          </Text>
        </View>
      </View>
      <View style={styles.buttons}>
        <Pressable
          onPress={handleDismiss}
          style={[styles.button, styles.dismissButton]}
        >
          <Text style={[styles.buttonText, { color: theme.colors.text.inverse }]}>
            Later
          </Text>
        </Pressable>
        <Pressable
          onPress={handleInstall}
          style={[styles.button, styles.installButton, { backgroundColor: theme.colors.text.inverse }]}
        >
          <Text style={[styles.buttonText, { color: theme.colors.primary }]}>
            Install
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.15)',
      },
      default: {
        elevation: 8,
      },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    opacity: 0.9,
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  dismissButton: {
    opacity: 0.8,
  },
  installButton: {
    // backgroundColor set inline
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

