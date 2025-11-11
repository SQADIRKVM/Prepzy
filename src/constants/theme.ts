export const Colors = {
  // Primary palette - muted pastels for calm
  lavender: '#E6E6FA',
  lavenderLight: '#F5F5FF',
  lavenderDark: '#B8B8DC',

  sage: '#C8D5B9',
  sageLight: '#E8F0DD',
  sageDark: '#A8B899',

  sand: '#F5E6D3',
  sandLight: '#FFF8EF',
  sandDark: '#E0D1BE',

  peach: '#FFD4C4',
  peachLight: '#FFE9E0',
  peachDark: '#FFB8A0',

  sky: '#B4D4E1',
  skyLight: '#D9EBF3',
  skyDark: '#8FB4C1',

  // Subject category colors
  subjects: {
    Mathematics: '#E6E6FA',
    Science: '#B4D4E1',
    English: '#FFD4C4',
    History: '#F5E6D3',
    'Computer Science': '#C8D5B9',
    Physics: '#B4D4E1',
    Chemistry: '#E6E6FA',
    Biology: '#C8D5B9',
    Economics: '#F5E6D3',
    Psychology: '#FFD4C4',
    Engineering: '#8FB4C1',
    Business: '#F5E6D3',
    Arts: '#FFD4C4',
    Other: '#E8E8E8',
  },

  // Neutrals
  white: '#FFFFFF',
  background: '#FAFAFA',
  surface: '#FFFFFF',
  border: '#E8E8E8',
  divider: '#F0F0F0',

  // Text
  text: {
    primary: '#2D2D2D',
    secondary: '#6B6B6B',
    tertiary: '#9B9B9B',
    inverse: '#FFFFFF',
  },

  // Semantic
  success: '#A8D5BA',
  warning: '#FFD4A3',
  error: '#FFB4A0',
  info: '#B4D4E1',
};

export const Typography = {
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    display: 40,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.8,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
};
