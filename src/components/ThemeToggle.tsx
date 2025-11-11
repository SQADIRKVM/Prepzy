import React, { useEffect, useRef } from 'react';
import { Pressable, View, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, isDark, toggleTheme } = useTheme();
  const animatedValue = useRef(new Animated.Value(isDark ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: isDark ? 1 : 0,
      useNativeDriver: true,
      friction: 6,
    }).start();
  }, [isDark]);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 28],
  });

  return (
    <Pressable
      onPress={toggleTheme}
      style={[
        styles.container,
        {
          backgroundColor: isDark ? theme.colors.primary : theme.colors.primaryLight,
          borderColor: isDark ? theme.colors.primaryDark : theme.colors.primary,
        },
      ]}
    >
      {/* Background icons */}
      <View style={styles.iconContainer}>
        <Ionicons
          name="sunny"
          size={16}
          color={isDark ? theme.colors.text.tertiary : theme.colors.text.inverse}
          style={styles.sunIcon}
        />
        <Ionicons
          name="moon"
          size={16}
          color={isDark ? theme.colors.text.inverse : theme.colors.text.tertiary}
          style={styles.moonIcon}
        />
      </View>

      {/* Animated toggle */}
      <Animated.View
        style={[
          styles.toggle,
          {
            transform: [{ translateX }],
            backgroundColor: theme.colors.surface,
          },
          theme.shadows.sm,
        ]}
      >
        <Ionicons
          name={isDark ? 'moon' : 'sunny'}
          size={18}
          color={isDark ? theme.colors.primary : theme.colors.accent}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 60,
    height: 32,
    borderRadius: 16,
    padding: 2,
    borderWidth: 2,
    justifyContent: 'center',
  },
  iconContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  sunIcon: {
    position: 'absolute',
    left: 6,
  },
  moonIcon: {
    position: 'absolute',
    right: 6,
  },
  toggle: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
