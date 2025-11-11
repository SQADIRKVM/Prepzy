import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

interface ModernCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'gradient' | 'glass';
  onPress?: () => void;
  style?: ViewStyle;
}

export default function ModernCard({
  children,
  variant = 'default',
  onPress,
  style,
}: ModernCardProps) {
  const { theme, isDark } = useTheme();

  const Container = onPress ? Pressable : View;

  if (variant === 'gradient') {
    return (
      <Container
        onPress={onPress}
        style={({ pressed }) => [
          styles.container,
          { opacity: onPress && pressed ? 0.9 : 1 },
          style,
        ]}
      >
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.card,
            {
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
            },
            theme.shadows.lg,
          ]}
        >
          {children}
        </LinearGradient>
      </Container>
    );
  }

  if (variant === 'glass') {
    return (
      <Container
        onPress={onPress}
        style={({ pressed }) => [
          styles.container,
          { opacity: onPress && pressed ? 0.9 : 1 },
          style,
        ]}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark
                ? 'rgba(30, 41, 59, 0.7)' // Semi-transparent dark
                : 'rgba(255, 255, 255, 0.7)', // Semi-transparent white
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              borderWidth: 1,
              borderColor: isDark
                ? 'rgba(148, 163, 184, 0.1)'
                : 'rgba(148, 163, 184, 0.2)',
            },
            theme.shadows.md,
          ]}
        >
          {children}
        </View>
      </Container>
    );
  }

  // Default variant
  return (
    <Container
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        { opacity: onPress && pressed ? 0.95 : 1 },
        style,
      ]}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.card,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
          },
          theme.shadows.md,
        ]}
      >
        {children}
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  card: {
    overflow: 'hidden',
  },
});
