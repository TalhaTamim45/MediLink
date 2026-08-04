---
name: Clinical Efficiency System
colors:
  surface: '#fbf9f9'
  surface-dim: '#dbdad9'
  surface-bright: '#fbf9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f3'
  surface-container: '#efeded'
  surface-container-high: '#e9e8e7'
  surface-container-highest: '#e3e2e2'
  on-surface: '#1b1c1c'
  on-surface-variant: '#40493d'
  inverse-surface: '#303031'
  inverse-on-surface: '#f2f0f0'
  outline: '#707a6c'
  outline-variant: '#bfcaba'
  surface-tint: '#1b6d24'
  primary: '#0d631b'
  on-primary: '#ffffff'
  primary-container: '#2e7d32'
  on-primary-container: '#cbffc2'
  inverse-primary: '#88d982'
  secondary: '#286b33'
  on-secondary: '#ffffff'
  secondary-container: '#abf4ac'
  on-secondary-container: '#2e7238'
  tertiary: '#1f6223'
  on-tertiary: '#ffffff'
  tertiary-container: '#3a7b39'
  on-tertiary-container: '#c8ffbf'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#a3f69c'
  primary-fixed-dim: '#88d982'
  on-primary-fixed: '#002204'
  on-primary-fixed-variant: '#005312'
  secondary-fixed: '#abf4ac'
  secondary-fixed-dim: '#90d792'
  on-secondary-fixed: '#002107'
  on-secondary-fixed-variant: '#07521d'
  tertiary-fixed: '#acf4a4'
  tertiary-fixed-dim: '#91d78a'
  on-tertiary-fixed: '#002203'
  on-tertiary-fixed-variant: '#0c5216'
  background: '#fbf9f9'
  on-background: '#1b1c1c'
  surface-variant: '#e3e2e2'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 57px
    fontWeight: '400'
    lineHeight: 64px
    letterSpacing: -0.25px
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: 0px
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: 0px
  title-lg:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '500'
    lineHeight: 28px
    letterSpacing: 0px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0.5px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0.25px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.1px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
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
  container-max: 1440px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style

The design system is engineered for pharmacy owners who require high-density information management without sacrificing clarity. The brand personality is **authoritative, precise, and dependable**, reflecting the critical nature of pharmaceutical care. 

The visual style follows a **Modern Corporate** aesthetic heavily influenced by **Material Design 3 (M3)** principles. It prioritizes functional efficiency through a structured layout, purposeful use of whitespace, and a clinical color palette that reduces cognitive load during high-stakes tasks like inventory management and prescription verification. The emotional response is one of calm control and professional reliability.

## Colors

The palette is rooted in the "Healthcare Green" spectrum to evoke growth, safety, and health.

*   **Primary (#2E7D32):** Used for key action buttons, active states, and primary branding elements. It provides high contrast against white backgrounds for accessibility.
*   **Secondary (Sage - #81C784):** Used for tonal accents, subtle highlights, and categorizing non-critical information.
*   **Tertiary (#1B5E20):** Reserved for deep emphasis and dark-mode text elements to ensure legibility.
*   **Neutral Grays:** A scale of cool-toned grays manages the UI scaffolding, borders, and secondary text. 

The default state is **Light Mode**, utilizing a "Surface" color of #FAFAFA to maintain a sterile, clinical feel. Semantic colors (Red for alerts, Amber for warnings) must follow M3 tonal palettes to remain harmonious with the green primary.

## Typography

This design system utilizes **Inter** for all roles to maximize legibility across varying screen densities. Inter’s tall x-height and geometric clarity make it ideal for reading complex medical names and numerical dosages.

*   **Headlines:** Used for page titles and major section headers. Medium to semi-bold weights provide a clear hierarchy.
*   **Body Text:** Optimized for long-form data reading. Use `body-md` for standard data entries and `body-lg` for primary instructions.
*   **Labels:** Specifically for form headers, table headers, and small button text. These use a slightly heavier weight to distinguish them from data.

## Layout & Spacing

The layout employs a **Fluid Grid** system based on an 8px square rhythm. 

*   **Desktop:** 12-column grid with 24px gutters. Content is housed in "Surface" containers that can span multiple columns. Max-width is capped at 1440px to prevent excessive line lengths on ultra-wide monitors.
*   **Tablet:** 8-column grid with 16px gutters and margins.
*   **Mobile:** 4-column grid with 16px margins. 

Internal component spacing (padding) should prioritize the `md` (16px) unit for touch targets and `sm` (8px) for related grouping to maintain a high-density but organized feel.

## Elevation & Depth

In alignment with Material 3, depth is expressed through **Tonal Elevation** supplemented by subtle **Ambient Shadows**. 

*   **Level 0 (Flat):** The main background surface.
*   **Level 1 (Card):** Used for the primary content containers. 1px stroke in a light neutral gray OR a very soft shadow (Y: 2px, Blur: 4px, 5% opacity).
*   **Level 2 (Dropdowns/Modals):** More pronounced shadows to indicate temporary interaction layers.
*   **Interactive States:** On hover, cards may transition from Level 1 to Level 2 to provide tactile feedback.

Avoid heavy, dark shadows; keep depth cues "clinical" and airy.

## Shapes

The shape language is **Soft and Approachable**. 

*   **Standard Components:** Buttons, input fields, and small chips use a 12px (`rounded-md/lg` equivalent) corner radius.
*   **Containers:** Large cards and modals use a 16px (`rounded-xl`) corner radius.
*   **System Elements:** Checkboxes use a smaller 4px radius to maintain their structural integrity within dense grids.

This roundedness balances the "clinical" nature of the app with a modern, user-friendly touch.

## Components

*   **Buttons:** Primary buttons use a solid #2E7D32 fill with white text. Secondary buttons use a tonal Sage background with dark green text. All buttons have a 12px radius and a height of 48px for easy interaction.
*   **Cards:** The fundamental building block. Use a white background, 16px radius, and a Level 1 elevation. Padding inside cards should be 24px (lg) for general layout and 16px (md) for data-heavy views.
*   **Input Fields:** Outlined style with a 12px radius. The border color is a neutral gray, turning Primary Green on focus. Labels sit on the border (M3 style).
*   **Chips:** Used for "In Stock," "Low Stock," or "Out of Stock" indicators. These are pill-shaped (fully rounded) and use tonal background colors (e.g., light red background with dark red text for "Out of Stock").
*   **Lists/Tables:** Rows should have a minimum height of 56px. Use subtle horizontal dividers (1px, neutral-light) rather than vertical lines to maintain a clean aesthetic.
*   **Inventory Alerts:** High-contrast banners or "snackbars" that appear at the top of the viewport for urgent notifications, using the primary or error colors.