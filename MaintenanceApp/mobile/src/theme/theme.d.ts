import { MD3Colors } from 'react-native-paper';

declare module 'react-native-paper' {
  interface MD3Colors {
    // Status Colors
    success: string;
    successContainer: string;
    onSuccess: string;
    onSuccessContainer: string;
    warning: string;
    warningContainer: string;
    onWarning: string;
    onWarningContainer: string;
    info: string;
    infoContainer: string;
    onInfo: string;
    onInfoContainer: string;

    // Role Colors
    ownerGold: string;
    adminBlue: string;
    maintenanceTeal: string;
    userIndigo: string;

    // Neutral Colors
    charcoal: string;
    slate: string;
    lightGray: string;
    borderGray: string;

    // Glass morphism colors
    glassLight: string;
    glassDark: string;
    glassBorder: string;

    // Shadow colors
    shadow: string;
    shadowMedium: string;
    shadowHeavy: string;
  }

  interface MD3Theme {
    animation: {
      fast: number;
      normal: number;
      slow: number;
      extraSlow: number;
    };
    spacing: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
      xxl: number;
      xxxl: number;
    };
    typography: {
      largeHeader: { fontSize: number; fontWeight: string };
      header: { fontSize: number; fontWeight: string };
      subheader: { fontSize: number; fontWeight: string };
      bodyLarge: { fontSize: number; fontWeight: string };
      body: { fontSize: number; fontWeight: string };
      bodySmall: { fontSize: number; fontWeight: string };
      caption: { fontSize: number; fontWeight: string };
    };
    elevation: {
      level0: number;
      level1: number;
      level2: number;
      level3: number;
      level4: number;
      level5: number;
      level6: number;
      level7: number;
    };
  }
}
