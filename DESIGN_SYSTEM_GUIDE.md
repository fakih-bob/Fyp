# Maintenance Management System - Design System Guide

## 🎨 Color Palette

### Primary Colors
- **Primary Blue**: `#2563EB` 
  - Usage: Main buttons, navigation highlights, primary actions
  - RGB: rgb(37, 99, 235)
  
- **Primary Dark**: `#1D4ED8`
  - Usage: Hover states, pressed buttons, emphasis
  - RGB: rgb(29, 78, 216)
  
- **Primary Light**: `#DBEAFE`
  - Usage: Background highlights, subtle accents
  - RGB: rgb(219, 234, 254)

### Status Colors
- **Success Green**: `#059669`
  - Usage: Completed tasks, success messages, positive actions
  - RGB: rgb(5, 150, 105)
  
- **Warning Orange**: `#D97706`
  - Usage: Pending items, warnings, in-progress status
  - RGB: rgb(217, 119, 6)
  
- **Error Red**: `#DC2626`
  - Usage: Errors, delete actions, urgent items
  - RGB: rgb(220, 38, 38)
  
- **Info Purple**: `#7C3AED`
  - Usage: Information messages, notifications
  - RGB: rgb(124, 58, 237)

### Role-Based Colors
- **Owner Gold**: `#F59E0B`
  - Usage: Owner dashboard highlights, owner-specific features
  - RGB: rgb(245, 158, 11)
  
- **Admin Blue**: `#3B82F6`
  - Usage: Department admin features, admin actions
  - RGB: rgb(59, 130, 246)
  
- **Maintenance Teal**: `#0D9488`
  - Usage: Maintenance staff elements, work-in-progress items
  - RGB: rgb(13, 148, 136)
  
- **User Indigo**: `#6366F1`
  - Usage: Regular user elements, user requests
  - RGB: rgb(99, 102, 241)

### Neutral Colors
- **Charcoal**: `#1F2937`
  - Usage: Primary text, headers, important content
  - RGB: rgb(31, 41, 55)
  
- **Slate**: `#475569`
  - Usage: Secondary text, descriptions, body content
  - RGB: rgb(71, 85, 105)
  
- **Light Gray**: `#F1F5F9`
  - Usage: Background, card backgrounds, subtle areas
  - RGB: rgb(241, 245, 249)
  
- **Border Gray**: `#E2E8F0`
  - Usage: Borders, dividers, separators
  - RGB: rgb(226, 232, 240)
  
- **White**: `#FFFFFF`
  - Usage: Card backgrounds, input fields, clean areas
  - RGB: rgb(255, 255, 255)

## 📏 Typography Scale

### Font Sizes & Weights
- **Large Header**: 28px, Bold (700)
- **Header**: 24px, Bold (700)
- **Subheader**: 20px, Semi-bold (600)
- **Body Large**: 18px, Regular (400)
- **Body**: 16px, Regular (400)
- **Body Small**: 14px, Regular (400)
- **Caption**: 12px, Regular (400)

### Text Color Usage
- **Primary Text**: Charcoal `#1F2937`
- **Secondary Text**: Slate `#475569`
- **Muted Text**: Gray `#6B7280`
- **Error Text**: Error Red `#DC2626`
- **Success Text**: Success Green `#059669`

## 🎯 Status Mapping

### Maintenance Request Status
- **New**: Primary Blue `#3B82F6`
- **Pending**: Warning Orange `#D97706`
- **In Progress**: Maintenance Teal `#0D9488`
- **Completed**: Success Green `#059669`
- **Declined/Cancelled**: Error Red `#DC2626`

### Priority Levels
- **High Priority**: Error Red `#DC2626`
- **Medium Priority**: Warning Orange `#D97706`
- **Low Priority**: Slate `#6B7280`

### User Role Indicators
- **Owner**: Gold `#F59E0B`
- **Department Admin**: Admin Blue `#3B82F6`
- **Maintenance Staff**: Teal `#0D9488`
- **Regular User**: Indigo `#6366F1`

## 📐 Component Specifications

### Buttons
- **Primary Button**: Primary Blue background, White text, 12px border radius
- **Secondary Button**: White background, Primary Blue border and text, 12px border radius
- **Danger Button**: Error Red background, White text, 12px border radius
- **Button Height**: 48px minimum
- **Button Padding**: 16px horizontal, 12px vertical

### Cards
- **Background**: White `#FFFFFF`
- **Border Radius**: 12px
- **Shadow**: rgba(0, 0, 0, 0.05) with 4px blur
- **Padding**: 16px
- **Margin**: 12px between cards

### Input Fields
- **Border**: Border Gray `#E2E8F0`
- **Border Radius**: 8px
- **Height**: 48px
- **Padding**: 16px horizontal
- **Focus Border**: Primary Blue `#2563EB`
- **Error Border**: Error Red `#DC2626`

### Navigation
- **Active Tab**: Primary Blue `#2563EB`
- **Inactive Tab**: Slate `#475569`
- **Background**: White `#FFFFFF`
- **Border**: Border Gray `#E2E8F0`

## 📱 Screen-Specific Guidelines

### Login/Register Screens
- Background: Light Gray `#F1F5F9`
- Card: White with 12px border radius
- Primary button: Primary Blue
- Links: Primary Blue

### Dashboard Screens
- Background: Light Gray `#F1F5F9`
- Role-specific accent color for headers
- Status indicators using status color mapping
- Cards with white background and subtle shadows

### Profile Screen
- White background
- Primary Blue for edit actions
- Error Red for destructive actions
- Success Green for save confirmations

### List Screens
- Light Gray background
- White cards with proper spacing
- Status chips with appropriate colors
- Search bars with focus states

## 🎨 Implementation Guidelines

### React Native Paper Theme
```javascript
const theme = {
  colors: {
    primary: '#2563EB',
    primaryContainer: '#DBEAFE',
    secondary: '#6366F1',
    error: '#DC2626',
    warning: '#D97706',
    success: '#059669',
    info: '#7C3AED',
    surface: '#FFFFFF',
    background: '#F1F5F9',
    onSurface: '#1F2937',
    onBackground: '#475569',
    outline: '#E2E8F0'
  }
}
```

### CSS Variables (if using web)
```css
:root {
  --primary-blue: #2563EB;
  --primary-dark: #1D4ED8;
  --primary-light: #DBEAFE;
  --success-green: #059669;
  --warning-orange: #D97706;
  --error-red: #DC2626;
  --info-purple: #7C3AED;
  --charcoal: #1F2937;
  --slate: #475569;
  --light-gray: #F1F5F9;
  --border-gray: #E2E8F0;
  --white: #FFFFFF;
}
```

## 🔄 Usage Examples

### Status Badges
- Use colored chips/badges for status indication
- Round corners (6px border radius)
- Appropriate text color for contrast
- 8px horizontal padding, 4px vertical padding

### Role Indicators
- Subtle background colors using role-based colors at 10% opacity
- Border or accent strip in full role color
- Clear typography hierarchy

### Interactive States
- **Hover**: Darken color by 10%
- **Pressed**: Darken color by 20%
- **Disabled**: 40% opacity
- **Loading**: Primary color with opacity animation

## ✅ Accessibility Guidelines

### Color Contrast
- All text meets WCAG AA standards (4.5:1 ratio minimum)
- Important UI elements meet AAA standards (7:1 ratio)
- Never rely on color alone for critical information

### Focus States
- Clear focus indicators using Primary Blue
- Minimum 2px focus ring
- High contrast focus states

### Color Blindness Considerations
- Status is indicated by both color and text/icons
- Sufficient contrast between different states
- Alternative indicators beyond color

---

## 📋 Quick Reference

### Most Used Colors
1. Primary Blue `#2563EB` - Main actions, navigation
2. White `#FFFFFF` - Card backgrounds
3. Light Gray `#F1F5F9` - Page backgrounds
4. Charcoal `#1F2937` - Primary text
5. Success Green `#059669` - Positive actions
6. Error Red `#DC2626` - Negative actions

### Color Combinations
- **Primary Text on White**: `#1F2937` on `#FFFFFF`
- **Secondary Text on White**: `#475569` on `#FFFFFF`
- **Primary Button**: `#FFFFFF` text on `#2563EB` background
- **Success Message**: `#059669` text on light success background
- **Error Message**: `#DC2626` text on light error background

This design system ensures consistency, accessibility, and professional appearance across your entire maintenance management application.
