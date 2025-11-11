import React, { useEffect, useRef } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SvgXml } from 'react-native-svg';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
}

// Logo colors based on the design
const LOGO_GREEN = '#4ADE80'; // Vibrant light green
const LOGO_BLACK = '#000000';
const BACKGROUND_BLACK = '#000000';

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const logoFadeAnim = useRef(new Animated.Value(0)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.8)).current;
  const [svgContent, setSvgContent] = React.useState<string | null>(null);

  useEffect(() => {
    // Load SVG content - simplified approach with better error handling
    const loadSvg = async () => {
      try {
        if (Platform.OS === 'web') {
          // For web, try to fetch from public assets
          try {
            const response = await fetch('/prepzy_icon.svg');
            if (response.ok) {
              const text = await response.text();
              // Validate SVG content before setting - must have opening and closing tags
              if (text && text.trim() && text.includes('<svg') && text.includes('</svg>')) {
                setSvgContent(text);
                return;
              }
            }
          } catch (e) {
            // Fall through to image
          }
        } else {
          // For native, try using Asset
          try {
            const asset = Asset.fromModule(require('../../assets/prepzy_icon.svg'));
            await asset.downloadAsync();
            if (asset.localUri) {
              const content = await FileSystem.readAsStringAsync(asset.localUri);
              // Validate SVG content before setting - must have opening and closing tags
              if (content && content.trim() && content.includes('<svg') && content.includes('</svg>')) {
                setSvgContent(content);
                return;
              }
            }
          } catch (e) {
            // Fall through to image
          }
        }
      } catch (error) {
        // Silently fallback to image - no error needed
        console.log('SVG loading failed, using fallback image');
      }
    };
    loadSvg();
  }, []);

  useEffect(() => {
    // Start animations sequence
    // 1. Fade in background
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: Platform.OS !== 'web',
    }).start();

    // 2. Scale up the rounded square container
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 40,
      friction: 7,
      useNativeDriver: Platform.OS !== 'web',
      delay: 200,
    }).start();

    // 3. Fade in and scale the logo symbol
    Animated.parallel([
      Animated.timing(logoFadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: Platform.OS !== 'web',
        delay: 400,
      }),
      Animated.spring(logoScaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 6,
        useNativeDriver: Platform.OS !== 'web',
        delay: 400,
      }),
    ]).start();

    // 4. Subtle rotation animation for logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    ).start();

    // Auto-hide after 2.5 seconds
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 500,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(logoFadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start(() => {
        onFinish();
      });
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  // Subtle rotation for logo (gentle sway)
  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-5deg', '5deg'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          backgroundColor: BACKGROUND_BLACK,
        },
      ]}
    >
      <View style={styles.content}>
        {/* Rounded Square Container with Green Background */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Green Rounded Square */}
          <View style={styles.greenSquare}>
            {/* Black Leaf/Ribbon Symbol - Try to use logo image, fallback to SVG */}
            <Animated.View
              style={[
                styles.logoSymbol,
                {
                  opacity: logoFadeAnim,
                  transform: [
                    { scale: logoScaleAnim },
                    { rotate },
                  ],
                },
              ]}
            >
              {/* Logo SVG - Prepzy logo */}
              {svgContent && svgContent.trim() && svgContent.includes('<svg') && svgContent.includes('</svg>') ? (
                <SvgXml xml={svgContent} width={100} height={100} />
              ) : (
                <Image
                  source={require('../../assets/icon.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              )}
            </Animated.View>
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  greenSquare: {
    width: 160,
    height: 160,
    borderRadius: 32, // Rounded corners
    backgroundColor: LOGO_GREEN,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: LOGO_GREEN,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  logoSymbol: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 100,
    height: 100,
  },
});

