import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    // Primary Colors - Professional Blue
    primary: '#2563EB',
    primaryDark: '#1D4ED8',
    primaryLight: '#DBEAFE',
    primaryContainer: '#DBEAFE',
    onPrimary: '#FFFFFF',
    onPrimaryContainer: '#1E40AF',
    
    // Secondary Colors
    secondary: '#6366F1',
    secondaryContainer: '#E0E7FF',
    onSecondary: '#FFFFFF',
    onSecondaryContainer: '#4338CA',
    
    // Status Colors
    tertiary: '#0D9488',
    tertiaryContainer: '#CCFBF1',
    error: '#DC2626',
    errorContainer: '#FEE2E2',
    onError: '#FFFFFF',
    onErrorContainer: '#991B1B',
    
    // Success Colors
    success: '#059669',
    successContainer: '#D1FAE5',
    onSuccess: '#FFFFFF',
    onSuccessContainer: '#047857',
    
    // Warning Colors  
    warning: '#D97706',
    warningContainer: '#FED7AA',
    onWarning: '#FFFFFF',
    onWarningContainer: '#92400E',
    
    // Info Colors
    info: '#7C3AED',
    infoContainer: '#EDE9FE',
    onInfo: '#FFFFFF',
    onInfoContainer: '#5B21B6',
    
    // Role Colors
    ownerGold: '#F59E0B',
    adminBlue: '#3B82F6',
    maintenanceTeal: '#0D9488',
    userIndigo: '#6366F1',
    
    // Neutral Colors
    charcoal: '#1F2937',
    slate: '#475569',
    lightGray: '#F1F5F9',
    borderGray: '#E2E8F0',
    
    surface: '#FFFFFF',
    surfaceVariant: '#F1F5F9',
    onSurface: '#1F2937',
    onSurfaceVariant: '#475569',
    
    background: '#F1F5F9',
    onBackground: '#1F2937',
    
    outline: '#E2E8F0',
    outlineVariant: '#CBD5E1',
    
    // Glass morphism colors
    glassLight: 'rgba(255, 255, 255, 0.95)',
    glassDark: 'rgba(255, 255, 255, 0.7)',
    glassBorder: 'rgba(255, 255, 255, 0.2)',
    
    // Shadow colors
    shadow: 'rgba(0, 0, 0, 0.05)',
    shadowMedium: 'rgba(0, 0, 0, 0.1)',
    shadowHeavy: 'rgba(0, 0, 0, 0.15)',
  },
  roundness: 12,
  
  // Enhanced spacing system
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
  },
  
  // Enhanced elevations
  elevation: {
    level0: 0,
    level1: 1,
    level2: 3,
    level3: 6,
    level4: 8,
    level5: 12,
    level6: 16,
    level7: 24,
  },
  
  // Typography system
  typography: {
    largeHeader: { fontSize: 28, fontWeight: '700' },
    header: { fontSize: 24, fontWeight: '700' },
    subheader: { fontSize: 20, fontWeight: '600' },
    bodyLarge: { fontSize: 18, fontWeight: '400' },
    body: { fontSize: 16, fontWeight: '400' },
    bodySmall: { fontSize: 14, fontWeight: '400' },
    caption: { fontSize: 12, fontWeight: '400' },
  },
  
  // Animation durations
  animation: {
    fast: 200,
    normal: 300,
    medium: 400,
    slow: 500,
    extraSlow: 800,
  },
};