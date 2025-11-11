import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  buttons?: AlertButton[];
  onDismiss?: () => void;
}

export default function CustomAlert({
  visible,
  title,
  message,
  icon = 'information-circle',
  iconColor,
  buttons = [{ text: 'OK', style: 'default' }],
  onDismiss,
}: CustomAlertProps) {
  const { theme, isDark } = useTheme();

  const handleButtonPress = (button: AlertButton) => {
    if (button.onPress) {
      button.onPress();
    }
    if (onDismiss) {
      onDismiss();
    }
  };

  const getButtonStyle = (style?: string) => {
    switch (style) {
      case 'destructive':
        return {
          backgroundColor: theme.colors.status.error,
          color: theme.colors.text.inverse,
        };
      case 'cancel':
        return {
          backgroundColor: theme.colors.background,
          color: theme.colors.text.secondary,
        };
      default:
        return {
          backgroundColor: theme.colors.primary,
          color: theme.colors.text.inverse,
        };
    }
  };

  const getIconColor = () => {
    if (iconColor) return iconColor;
    if (icon === 'warning' || icon === 'alert-circle') return theme.colors.status.warning;
    if (icon === 'checkmark-circle') return theme.colors.primary; // Use theme primary instead of hardcoded success
    if (icon === 'close-circle') return theme.colors.status.error;
    return theme.colors.primary;
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.7)' }]}>
        <View style={[styles.alertContainer, { backgroundColor: theme.colors.card }]}>
          {/* Icon */}
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${getIconColor()}20` },
            ]}
          >
            <Ionicons name={icon} size={36} color={getIconColor()} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: theme.colors.text.primary }]}>
            {title}
          </Text>

          {/* Message */}
          {message && (
            <Text style={[styles.message, { color: theme.colors.text.secondary }]}>
              {message}
            </Text>
          )}

          {/* Buttons */}
          <View style={styles.buttonsContainer}>
            {buttons.map((button, index) => {
              const buttonStyle = getButtonStyle(button.style);
              return (
                <Pressable
                  key={index}
                  style={[
                    styles.button,
                    { backgroundColor: buttonStyle.backgroundColor },
                  ]}
                  onPress={() => handleButtonPress(button)}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      { color: buttonStyle.color },
                    ]}
                  >
                    {button.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
