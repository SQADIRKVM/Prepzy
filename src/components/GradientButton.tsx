import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export default function GradientButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  style,
  textStyle,
  icon,
}: GradientButtonProps) {
  const { theme } = useTheme();

  const gradientColors = {
    primary: [theme.colors.primaryLight, theme.colors.primary, theme.colors.primaryDark],
    secondary: [theme.colors.secondaryLight, theme.colors.secondary, theme.colors.secondaryDark],
    accent: [theme.colors.accent, theme.colors.primary],
  };

  const sizes = {
    sm: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      fontSize: theme.typography.sizes.sm,
    },
    md: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      fontSize: theme.typography.sizes.base,
    },
    lg: {
      paddingVertical: theme.spacing.lg,
      paddingHorizontal: theme.spacing.xl,
      fontSize: theme.typography.sizes.lg,
    },
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.container,
        { opacity: pressed ? 0.8 : disabled ? 0.5 : 1 },
        style,
      ]}
    >
      <LinearGradient
        colors={gradientColors[variant]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradient,
          {
            paddingVertical: sizes[size].paddingVertical,
            paddingHorizontal: sizes[size].paddingHorizontal,
            borderRadius: theme.borderRadius.md,
          },
          theme.shadows.md,
        ]}
      >
        {icon && <>{icon}</>}
        <Text
          style={[
            styles.text,
            {
              fontSize: sizes[size].fontSize,
              fontWeight: theme.typography.weights.semibold,
              color: theme.colors.text.inverse,
              marginLeft: icon ? theme.spacing.sm : 0,
            },
            textStyle,
          ]}
        >
          {title}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    textAlign: 'center',
  },
});
