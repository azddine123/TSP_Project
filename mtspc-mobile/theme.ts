export const COLORS = {
    primary: '#00796B', // Teal shade
    primaryDark: '#004D40', // Darker shade
    white: '#FFFFFF',
    black: '#000000',
    grey: '#616161',
    mediumGrey: '#D1D5DB', // gray-300
    lightGrey: '#EEEEEE', // For borders
    veryLightGrey: '#F9FAFB', // gray-50
    border: '#EEEEEE',
    textPrimary: '#212121', // Dark text for titles
    textSecondary: '#757575', // Lighter text for subtitles/icons
    textPlaceholder: '#9E9E9E', // Placeholder text
  
    red: '#EF4444', // red-500
    iconRed: '#DC2626', // More specific red for icons like logout?
    green: '#22C55E', // green-500
    yellow: '#EAB308', // yellow-500
  
    // Custom/Semantic Colors
    background: '#F5F5F5', // Light grey background
    surface: '#FFFFFF', // For cards, inputs, etc.
    lightGreen: '#F0FDF4', // Tailwind green-50
    darkGreen: '#166534',  // Tailwind green-800
    lightBlue: '#EFF6FF',   // Tailwind blue-50
    darkGray: '#374151',    // Tailwind gray-700

    profileCardBg: '#EBF5FF', // Light blue similar to image
    profileIcon: '#6B7280', // Default icon color (grey)
  
    // Status colors
    error: '#D32F2F',
    success: '#388E3C',
    warning: '#FBC02D',
    errorLight: '#FFEBEE', // Light red background
    warningLight: '#FFF8E1', // Light yellow background
  };
  
  export const SIZES = {
    base: 8,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  
    // Font sizes
    fontXs: 12,
    fontSm: 14,
    fontMd: 16,
    fontLg: 18,
    fontXl: 24,
    fontXXl: 32,
    fontTitle: 32,
  };
  
  export const FONTS: { [key: string]: any } = {
    h1: { fontSize: SIZES.fontXXl, fontWeight: 'bold', color: COLORS.textPrimary },
    h2: { fontSize: SIZES.fontXl, fontWeight: 'bold', color: COLORS.textPrimary },
    h3: { fontSize: SIZES.fontLg, fontWeight: '600', color: COLORS.textPrimary },
    body1: { fontSize: SIZES.fontMd, color: COLORS.textPrimary },
    body2: { fontSize: SIZES.fontSm, color: COLORS.textSecondary },
    caption: { fontSize: SIZES.fontXs, color: COLORS.textSecondary },
  };
  
  export const SHADOWS = {
      sm: {
          shadowColor: "#000",
          shadowOffset: {
              width: 0,
              height: 1,
          },
          shadowOpacity: 0.18,
          shadowRadius: 1.00,
          elevation: 1,
      },
      md: {
          shadowColor: "#000",
          shadowOffset: {
              width: 0,
              height: 3,
          },
          shadowOpacity: 0.27,
          shadowRadius: 4.65,
          elevation: 6,
      },
  };

export default {
  COLORS,
  SIZES,
  FONTS,
  SHADOWS
};
