import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    // Primary Colors - Professional Blue
    primary: '#2563EB',
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
    
    // Success (custom)
    success: '#059669',
    successContainer: '#D1FAE5',
    onSuccess: '#FFFFFF',
    onSuccessContainer: '#047857',
    
    // Warning (custom)
    warning: '#D97706',
    warningContainer: '#FED7AA',
    onWarning: '#FFFFFF',
    onWarningContainer: '#92400E',
    
    // Info (custom)
    info: '#7C3AED',
    infoContainer: '#EDE9FE',
    onInfo: '#FFFFFF',
    onInfoContainer: '#5B21B6',
    
    // Role Colors (custom)
    owner: '#F59E0B',
    admin: '#3B82F6',
    maintenance: '#0D9488',
    user: '#6366F1',
    
    // Neutrals
    surface: '#FFFFFF',
    surfaceVariant: '#F1F5F9',
    onSurface: '#1F2937',
    onSurfaceVariant: '#475569',
    
    background: '#F1F5F9',
    onBackground: '#1F2937',
    
    outline: '#E2E8F0',
    outlineVariant: '#CBD5E1',
    
    // Custom additions
    charcoal: '#1F2937',
    slate: '#475569',
    lightGray: '#F1F5F9',
    borderGray: '#E2E8F0',
    shadow: 'rgba(0, 0, 0, 0.05)',
  },
  roundness: 12,
  
  // Custom spacing system
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  // Custom elevations
  elevation: {
    level0: 0,
    level1: 1,
    level2: 3,
    level3: 6,
    level4: 8,
    level5: 12,
  },
};