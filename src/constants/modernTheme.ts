// Helper function to lighten a color
const lightenColor = (color: string, percent: number): string => {
  const num = parseInt(color.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + Math.round((255 - (num >> 16)) * percent));
  const g = Math.min(255, ((num >> 8) & 0x00FF) + Math.round((255 - ((num >> 8) & 0x00FF)) * percent));
  const b = Math.min(255, (num & 0x0000FF) + Math.round((255 - (num & 0x0000FF)) * percent));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};

// Helper function to darken a color
const darkenColor = (color: string, percent: number): string => {
  const num = parseInt(color.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - Math.round((num >> 16) * percent));
  const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(((num >> 8) & 0x00FF) * percent));
  const b = Math.max(0, (num & 0x0000FF) - Math.round((num & 0x0000FF) * percent));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};

// Helper function to adjust color brightness for dark mode
const adjustForDarkMode = (color: string, isDark: boolean): string => {
  if (!isDark) return color;
  // For dark mode, make colors lighter for better visibility
  return lightenColor(color, 0.3);
};

// Create a custom theme with custom primary and secondary colors
export const createCustomTheme = (
  baseTheme: Theme, 
  primaryColor: string, 
  secondaryColor: string | null,
  isDark: boolean
): Theme => {
  const adjustedPrimary = adjustForDarkMode(primaryColor, isDark);
  const primaryDark = darkenColor(adjustedPrimary, 0.15);
  const primaryLight = lightenColor(adjustedPrimary, 0.2);
  
  // Use custom secondary if provided, otherwise generate from primary
  let secondary: string;
  let secondaryDark: string;
  let secondaryLight: string;
  
  if (secondaryColor) {
    const adjustedSecondary = adjustForDarkMode(secondaryColor, isDark);
    secondary = adjustedSecondary;
    secondaryDark = darkenColor(adjustedSecondary, 0.2);
    secondaryLight = lightenColor(adjustedSecondary, 0.3);
  } else {
    // Generate secondary colors based on primary
    secondary = lightenColor(adjustedPrimary, 0.1);
    secondaryDark = darkenColor(secondary, 0.2);
    secondaryLight = lightenColor(secondary, 0.3);
  }
  
  // Generate accent color
  const accent = lightenColor(adjustedPrimary, 0.15);

  // Create tinted background using secondary color (very subtle)
  // For light mode: very light tint, for dark mode: slightly darker tint
  const getTintedBackground = () => {
    if (!secondaryColor) return baseTheme.colors.background;
    
    const adjustedSecondary = adjustForDarkMode(secondaryColor, isDark);
    if (isDark) {
      // For dark mode, blend secondary with dark background (10% opacity)
      return blendColors(baseTheme.colors.background, adjustedSecondary, 0.1);
    } else {
      // For light mode, blend secondary with light background (5% opacity)
      return blendColors(baseTheme.colors.background, adjustedSecondary, 0.05);
    }
  };

  // Create tinted card/surface using secondary color (very subtle)
  const getTintedCard = () => {
    if (!secondaryColor) return baseTheme.colors.card;
    
    const adjustedSecondary = adjustForDarkMode(secondaryColor, isDark);
    if (isDark) {
      return blendColors(baseTheme.colors.card, adjustedSecondary, 0.08);
    } else {
      return blendColors(baseTheme.colors.card, adjustedSecondary, 0.03);
    }
  };

  return {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: adjustedPrimary,
      primaryDark,
      primaryLight,
      secondary,
      secondaryDark,
      secondaryLight,
      accent,
      background: getTintedBackground(),
      card: getTintedCard(),
      surface: getTintedCard(),
    },
  };
};

// Helper function to blend two colors
const blendColors = (color1: string, color2: string, ratio: number): string => {
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');
  
  const r1 = parseInt(hex1.slice(0, 2), 16);
  const g1 = parseInt(hex1.slice(2, 4), 16);
  const b1 = parseInt(hex1.slice(4, 6), 16);
  
  const r2 = parseInt(hex2.slice(0, 2), 16);
  const g2 = parseInt(hex2.slice(2, 4), 16);
  const b2 = parseInt(hex2.slice(4, 6), 16);
  
  const r = Math.round(r1 * (1 - ratio) + r2 * ratio);
  const g = Math.round(g1 * (1 - ratio) + g2 * ratio);
  const b = Math.round(b1 * (1 - ratio) + b2 * ratio);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

// Modern Theme System with Dark Mode Support

export interface Theme {
  colors: {
    primary: string;
    primaryDark: string;
    primaryLight: string;
    secondary: string;
    secondaryDark: string;
    secondaryLight: string;
    accent: string;
    background: string;
    surface: string;
    card: string;
    border: string;
    divider: string;
    text: {
      primary: string;
      secondary: string;
      tertiary: string;
      inverse: string;
    };
    status: {
      success: string;
      warning: string;
      error: string;
      info: string;
    };
    subjects: {
      [key: string]: string;
    };
  };
  spacing: typeof Spacing;
  typography: typeof Typography;
  borderRadius: typeof BorderRadius;
  shadows: typeof Shadows;
}

// Spacing System
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// Typography System
export const Typography = {
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
    display: 48,
  },
  weights: {
    regular: '400' as '400',
    medium: '500' as '500',
    semibold: '600' as '600',
    bold: '700' as '700',
    extrabold: '800' as '800',
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

// Border Radius System
export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

// Shadow System
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// Light Theme (Modern Green Gradient)
export const LightTheme: Theme = {
  colors: {
    primary: '#19e65e',        // Vibrant Green
    primaryDark: '#15c44f',    // Deep Green
    primaryLight: '#3ef07b',   // Light Green
    secondary: '#10B981',      // Emerald
    secondaryDark: '#059669',  // Deep Emerald
    secondaryLight: '#34D399', // Light Emerald
    accent: '#14B8A6',         // Teal
    background: '#F8FAFC',     // Slate 50
    surface: '#FFFFFF',        // White
    card: '#FFFFFF',           // White
    border: '#E2E8F0',         // Slate 200
    divider: '#F1F5F9',        // Slate 100
    text: {
      primary: '#0F172A',      // Slate 900
      secondary: '#475569',    // Slate 600
      tertiary: '#94A3B8',     // Slate 400
      inverse: '#FFFFFF',      // White
    },
    status: {
      success: '#10B981',      // Emerald 500
      warning: '#F59E0B',      // Amber 500
      error: '#EF4444',        // Red 500
      info: '#3B82F6',         // Blue 500
    },
    subjects: {
      'Mathematics': '#F59E0B',      // Amber
      'Science': '#10B981',          // Emerald
      'English': '#EF4444',          // Red
      'History': '#8B5CF6',          // Purple
      'Computer Science': '#3B82F6', // Blue
      'Physics': '#06B6D4',          // Cyan
      'Chemistry': '#84CC16',        // Lime
      'Biology': '#22C55E',          // Green
      'Economics': '#F97316',        // Orange
      'Psychology': '#EC4899',       // Pink
      'Engineering': '#6366F1',      // Indigo
      'Business': '#14B8A6',         // Teal
      'Arts': '#A855F7',             // Purple
      'Other': '#64748B',            // Slate
    },
  },
  spacing: Spacing,
  typography: Typography,
  borderRadius: BorderRadius,
  shadows: Shadows,
};

// Dark Theme (Modern Dark with Vibrant Green Accents)
export const DarkTheme: Theme = {
  colors: {
    primary: '#3ef07b',        // Light Green (for visibility on dark)
    primaryDark: '#19e65e',    // Vibrant Green
    primaryLight: '#5ff599',   // Very Light Green
    secondary: '#34D399',      // Light Emerald
    secondaryDark: '#10B981',  // Emerald
    secondaryLight: '#6EE7B7', // Very Light Emerald
    accent: '#2DD4BF',         // Light Teal
    background: '#112116',     // Dark Green-tinted Background
    surface: '#1C1C1E',        // Dark Card Surface
    card: '#1C1C1E',           // Dark Card
    border: '#2E2E31',         // Dark Border
    divider: '#1C1C1E',        // Dark Divider
    text: {
      primary: '#F1F5F9',      // Slate 100
      secondary: '#CBD5E1',    // Slate 300
      tertiary: '#64748B',     // Slate 500
      inverse: '#0F172A',      // Slate 900
    },
    status: {
      success: '#34D399',      // Emerald 400
      warning: '#FBBF24',      // Amber 400
      error: '#F87171',        // Red 400
      info: '#60A5FA',         // Blue 400
    },
    subjects: {
      'Mathematics': '#FBBF24',      // Amber
      'Science': '#34D399',          // Emerald
      'English': '#F87171',          // Red
      'History': '#A78BFA',          // Purple
      'Computer Science': '#60A5FA', // Blue
      'Physics': '#22D3EE',          // Cyan
      'Chemistry': '#A3E635',        // Lime
      'Biology': '#4ADE80',          // Green
      'Economics': '#FB923C',        // Orange
      'Psychology': '#F472B6',       // Pink
      'Engineering': '#818CF8',      // Indigo
      'Business': '#2DD4BF',         // Teal
      'Arts': '#C084FC',             // Purple
      'Other': '#94A3B8',            // Slate
    },
  },
  spacing: Spacing,
  typography: Typography,
  borderRadius: BorderRadius,
  shadows: Shadows,
};
