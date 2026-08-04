---
name: MediLink
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#3e4946'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f1f1f1'
  outline: '#6d7a76'
  outline-variant: '#bdc9c5'
  surface-tint: '#006b5f'
  primary: '#006a5e'
  on-primary: '#ffffff'
  primary-container: '#008577'
  on-primary-container: '#ffffff'
  inverse-primary: '#73d8c7'
  secondary: '#40627b'
  on-secondary: '#ffffff'
  secondary-container: '#bee1fe'
  on-secondary-container: '#43647d'
  tertiary: '#4c55ae'
  on-tertiary: '#ffffff'
  tertiary-container: '#656ec9'
  on-tertiary-container: '#ffffff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#90f4e3'
  primary-fixed-dim: '#73d8c7'
  on-primary-fixed: '#00201c'
  on-primary-fixed-variant: '#005047'
  secondary-fixed: '#c9e6ff'
  secondary-fixed-dim: '#a8cbe7'
  on-secondary-fixed: '#001e2f'
  on-secondary-fixed-variant: '#274a62'
  tertiary-fixed: '#e0e0ff'
  tertiary-fixed-dim: '#bdc2ff'
  on-tertiary-fixed: '#000767'
  on-tertiary-fixed-variant: '#343d96'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 57px
    fontWeight: '700'
    lineHeight: 64px
    letterSpacing: -0.25px
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  title-lg:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  title-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0.15px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: 0.5px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0.25px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.1px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.5px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  gutter: 16px
  margin-mobile: 16px
  margin-tablet: 32px
  touch-target: 48px
---

## Brand & Style

The design system is engineered to bridge the gap between clinical precision and human-centric care. Designed specifically for the healthcare landscape in Bangladesh, it prioritizes trust, accessibility, and modern professionalism. The aesthetic follows **Corporate / Modern** principles with a distinct focus on the **Material 3 (M3)** specification, ensuring a native feel on Android devices while elevating the experience for an elderly-friendly demographic.

The brand personality is authoritative yet approachable. By utilizing generous whitespace and a "less is more" philosophy, the UI reduces cognitive load—essential for users managing health records or emergency orders. The visual language conveys reliability through structured layouts, high-contrast readability, and a sophisticated color story that differentiates it from typical low-cost medical apps.

## Colors

This design system utilizes a palette rooted in medical tradition but modernized for digital screens. 
- **Primary (Medical Green):** Used for key actions, brand representation, and active states. It symbolizes health and vitality.
- **Secondary (Soft Blue):** Primarily used for container backgrounds and low-emphasis accents to provide a calming effect.
- **Tertiary (Dark Navy):** Applied to typography and high-contrast iconography to ensure maximum legibility for elderly users.
- **Surface & Background:** A clean white background is paired with Very Light Grey (`#F5F5F5`) for card containers to create subtle depth without relying on heavy shadows.
- **Semantic Colors:** Success (Green), Warning (Orange), and Danger (Red) follow standard medical conventions for immediate recognition of status and health alerts.

## Typography

The typography system uses **Inter** to ensure maximum legibility across all screen densities. 
- **Scale:** Font sizes are bumped up by roughly 10-15% compared to standard Material 3 defaults to accommodate elderly users and visual impairment.
- **Weight:** Headings use Bold (700) or Semi-Bold (600) to create a clear information hierarchy.
- **Readability:** Body text is set at a minimum of 16px (Body-md) for standard interaction and 18px (Body-lg) for long-form medical information.
- **Accessibility:** High contrast is maintained by using the Dark Navy tertiary color for all primary text content.

## Layout & Spacing

The layout is built on a **8-point grid system**, ensuring consistent vertical and horizontal rhythm. 
- **Grid:** A 4-column grid is used for mobile, transitioning to 8 columns for tablets.
- **Margins:** 16px side margins are standard for mobile. For medical data lists (pharmacy/medicine lists), a 12px margin is permissible to maximize horizontal space for price and quantity.
- **Touch Targets:** All interactive elements (buttons, checkboxes, chips) must adhere to a minimum touch target of 48x48dp, even if the visual element is smaller.
- **Safe Areas:** Adhere strictly to Android system bars (Status and Navigation) to ensure content never overlaps with system UI.

## Elevation & Depth

In alignment with Material 3, this design system uses **Tonal Layers** as the primary method for indicating depth, supplemented by soft, ambient shadows for interactive elements.
- **Surface Levels:** Lower surfaces (Background) are pure white. Containers (Cards) use Surface Level 1 (`#F5F5F5`).
- **Shadows:** Elevation 1 is used for standard cards (Medicine/Order). Elevation 2 is reserved for interactive elements like the Floating Action Button (FAB) or active Search Bars.
- **Overlay:** Bottom sheets and Dialogs use a 32% black scrim to pull focus, with a Surface Level 3 tonal tint.
- **Focus:** No heavy borders; instead, use a 2dp stroke in the Primary Medical Green for focused input states.

## Shapes

The shape language is "Rounded," utilizing Material 3's modern geometry to appear friendly and non-threatening.
- **Standard Components:** Buttons, Input Fields, and Cards use a **12px to 16px corner radius**.
- **Large Components:** Bottom Sheets and Dialogs use **28px top-corner radius** to create a distinct "sheet" appearance.
- **Small Components:** Chips and Badges use a **8px radius** or full-pill shape depending on the content length.
- **Full Pill:** Used exclusively for Search Bars and the Floating Action Button to distinguish them as high-priority global actions.

## Components

### Buttons & Interaction
- **Primary Button:** High-emphasis, Medical Green background, 16px corner radius, minimum height 56px for accessibility.
- **Secondary/Outlined:** For "Cancel" or "View History." 2dp stroke in Primary color.
- **FAB:** Large-size (96dp) for "Emergency" or "Book Appointment" actions on the home screen.
- **Stepper:** Large +/- buttons with a 16px numeric display for easy medicine quantity adjustment.

### Input Fields
- **Text/Phone:** Outlined style with floating labels. Phone inputs must include the "+880" prefix as a non-editable prefix.
- **OTP:** Four or six individual 56x56px boxes with high-contrast borders and numeric-only keyboard triggers.
- **Search:** Full-pill shaped with a trailing "Filter" icon button for pharmacy searches.

### Healthcare-Specific Cards
- **Medicine Card:** Features an image thumbnail (80x80px), title in Title-md, price in Medical Green, and an "Add" button.
- **Prescription Card:** Includes a "Verified" badge, doctor's name, and a "View PDF" secondary button.
- **Order Status:** Uses a vertical timeline with icons (Ordered, Processing, Out for Delivery, Delivered) using the semantic color palette.

### Navigation & Feedback
- **Bottom Navigation:** M3 standard with active state pill indicators. Icons: Home, Orders, Pharmacy, Profile.
- **Snackbars:** Dark Navy background with white text, positioned 16px from the bottom or above the FAB.
- **Badges:** Success (Green) for "Paid" or "Delivered"; Warning (Orange) for "Pending"; Danger (Red) for "Cancelled."