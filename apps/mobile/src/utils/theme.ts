import { MD3DarkTheme, configureFonts } from 'react-native-paper';

// Custom color palette for SmokeRing
const colors = {
  // Primary - Smoky orange/amber
  primary: '#FF6B35',
  primaryContainer: '#3D1F0D',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#FFD8C8',

  // Secondary - Deep charcoal
  secondary: '#8B7355',
  secondaryContainer: '#2A2118',
  onSecondary: '#FFFFFF',
  onSecondaryContainer: '#E8D5C4',

  // Tertiary - Flame accent
  tertiary: '#FFB347',
  tertiaryContainer: '#3D2E0D',
  onTertiary: '#1A1A1A',
  onTertiaryContainer: '#FFE4B5',

  // Background - Deep dark
  background: '#0D0D0D',
  onBackground: '#E6E1E5',

  // Surface - Slightly lighter dark
  surface: '#1A1A1A',
  surfaceVariant: '#252525',
  onSurface: '#E6E1E5',
  onSurfaceVariant: '#C4C4C4',

  // Error
  error: '#F44336',
  errorContainer: '#3D0D0D',
  onError: '#FFFFFF',
  onErrorContainer: '#FFCDD2',

  // Success (for confidence indicators)
  success: '#22C55E',
  successContainer: '#0D3D1F',

  // Warning (for medium confidence)
  warning: '#EAB308',
  warningContainer: '#3D2E0D',

  // Outline
  outline: '#3D3D3D',
  outlineVariant: '#2D2D2D',

  // Inverse
  inverseSurface: '#E6E1E5',
  inverseOnSurface: '#1A1A1A',
  inversePrimary: '#B84D1E',

  // Shadow
  shadow: '#000000',
  scrim: '#000000',

  // Surface tones
  surfaceDisabled: 'rgba(230, 225, 229, 0.12)',
  onSurfaceDisabled: 'rgba(230, 225, 229, 0.38)',
  backdrop: 'rgba(0, 0, 0, 0.5)',
};

// Configure fonts
const fontConfig = {
  fontFamily: 'System',
};

export const theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...colors,
  },
  fonts: configureFonts({ config: fontConfig }),
  roundness: 12,
};

// Confidence colors
export const confidenceColors = {
  high: colors.success,
  medium: colors.warning,
  low: colors.error,
};

// Get confidence color based on percentage
export function getConfidenceColor(confidence: number): string {
  if (confidence >= 70) return confidenceColors.high;
  if (confidence >= 40) return confidenceColors.medium;
  return confidenceColors.low;
}

// Common spacing values
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Touch target sizes (for greasy hands!)
export const touchTargets = {
  minimum: 48,
  comfortable: 56,
  large: 64,
};
