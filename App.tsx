import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, Platform, View } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import AppNavigator from './src/navigation/AppNavigator';
import { useStore } from './src/store';
import { ThemeProvider } from './src/context/ThemeContext';
import SplashScreenComponent from './src/components/SplashScreen';
import PWAInstallPrompt from './src/components/PWAInstallPrompt';
import {
  requestNotificationPermissions,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
} from './src/services/notificationService';

// Keep the native splash screen visible while we load
SplashScreen.preventAutoHideAsync();

export default function App() {
  const { loadData } = useStore();
  const [isAppReady, setIsAppReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    async function prepare() {
      try {
        // Load icon fonts for web
        await Font.loadAsync({
          ...Ionicons.font,
          ...MaterialIcons.font,
          ...MaterialCommunityIcons.font,
        });

        // Load persisted data
        await loadData();

        // Request notification permissions
        requestNotificationPermissions();

        // Listen for notifications received while app is foregrounded
        notificationListener.current = addNotificationReceivedListener((notification) => {
          console.log('Notification received:', notification);
        });

        // Listen for user tapping on a notification
        responseListener.current = addNotificationResponseReceivedListener((response) => {
          console.log('Notification response:', response);
          const examId = response.notification.request.content.data?.examId;
          if (examId) {
            // TODO: Navigate to ExamDetail screen with examId
            // This would require access to navigation ref
            console.log('Navigate to exam:', examId);
          }
        });

        // Mark app as ready
        setIsAppReady(true);
      } catch (e) {
        console.warn(e);
        setIsAppReady(true);
      } finally {
        // Hide native splash screen
        await SplashScreen.hideAsync();
      }
    }

    prepare();

    // Cleanup listeners on unmount
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  // Use regular View for web, GestureHandlerRootView for mobile
  const RootContainer = Platform.OS === 'web' ? View : GestureHandlerRootView;

  if (!isAppReady || showSplash) {
    return (
      <RootContainer style={styles.container}>
        <ThemeProvider>
          <SplashScreenComponent onFinish={handleSplashFinish} />
        </ThemeProvider>
      </RootContainer>
    );
  }

  return (
    <RootContainer style={styles.container}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </RootContainer>
  );
}

function AppContent() {
  return (
    <PaperProvider>
      <StatusBar style="auto" />
      <AppNavigator />
      <PWAInstallPrompt />
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
