---
name: Clinical Precision
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3d4a3e'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6d7b6d'
  outline-variant: '#bccabb'
  surface-tint: '#006d33'
  primary: '#006b32'
  on-primary: '#ffffff'
  primary-container: '#008740'
  on-primary-container: '#f7fff3'
  inverse-primary: '#5adf82'
  secondary: '#4f54b4'
  on-secondary: '#ffffff'
  secondary-container: '#959aff'
  on-secondary-container: '#292b8d'
  tertiary: '#a93200'
  on-tertiary: '#ffffff'
  tertiary-container: '#d1430a'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#78fc9c'
  primary-fixed-dim: '#5adf82'
  on-primary-fixed: '#00210b'
  on-primary-fixed-variant: '#005225'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#04006d'
  on-secondary-fixed-variant: '#373a9b'
  tertiary-fixed: '#ffdbd0'
  tertiary-fixed-dim: '#ffb59e'
  on-tertiary-fixed: '#3a0b00'
  on-tertiary-fixed-variant: '#842500'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  display-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  title-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-margin: 24px
  gutter: 16px
---

## Brand & Style
The design system is engineered for high-stakes healthcare administration within the Bangladeshi medical ecosystem. It balances clinical authority with modern SaaS efficiency. The personality is reliable, systematic, and transparent, aimed at hospital administrators and senior medical staff who require high-density information without cognitive overload.

The style leverages **Corporate Modern** principles with a focus on **Tonal Layering**. It adopts a "soft-functional" aesthetic—utilizing subtle borders and generous white space to organize complex data sets. Every element is designed to evoke a sense of calm and precision, ensuring that critical medical data remains the primary focus.

## Colors
The palette is rooted in "Healthcare Green" (#00A651), symbolizing growth and safety. This is supported by a deep "Trust Blue" for secondary actions and an "Urgency Orange" for critical alerts.

- **Primary (Healthcare Green):** Used for main actions, active states, and brand presence.
- **Secondary (Deep Blue):** Used for secondary navigation elements and data visualization.
- **Neutral (Slate):** A sophisticated range of cool grays (Slate 50 to 900) provides the foundation for the high-density UI, ensuring text legibility and structural clarity.
- **Semantic Colors:** 
    - Success: #00A651
    - Warning: #FBBF24
    - Error: #EF4444
    - Info: #0EA5E9

## Typography
This design system utilizes **Inter** for its exceptional legibility at small sizes and its neutral, systematic feel. 

For high-density dashboard views, `body-md` is the standard for data entry and table content. `label-sm` is reserved for table headers and category tags. BDT currency formatting should always use the `Inter` font to ensure numerical alignment (tabular numbers) in financial reports and billing tables.

## Layout & Spacing
The layout follows a **Fluid Grid** system based on a 4px baseline. 

- **Desktop:** 12-column grid with 24px margins and 16px gutters.
- **Sidebar:** Fixed at 280px for standard state, collapsing to 80px icons-only.
- **Content Density:** High-density spacing is used for data tables (vertical cell padding of 8px) to maximize information visibility on a single screen. 
- **Adaptation:** On tablet devices, the sidebar transitions to a drawer, and margins reduce to 16px.

## Elevation & Depth
In line with Material Design 3, this design system uses **Tonal Layers** rather than heavy shadows to define hierarchy. 

- **Level 0 (Surface):** Used for the main background (Slate 50).
- **Level 1 (Card/Container):** Pure white (#FFFFFF) with a subtle 1px border (Slate 200). 
- **Level 2 (Dropdowns/Modals):** Pure white with a soft, ambient shadow (0px 4px 20px rgba(0, 0, 0, 0.05)) to suggest interaction.
- **Interactive States:** Buttons and clickable cards use a subtle "lift" on hover, achieved by darkening the border color rather than increasing shadow depth.

## Shapes
The shape language is **Rounded**, providing a modern and approachable feel to a clinical tool. 

Standard components like input fields and buttons use a 0.5rem (8px) corner radius. Large containers and dashboard cards use 1rem (16px) to create clear visual containment. Small elements like status badges and chips use a full pill-shape (100px) to distinguish them from interactive buttons.

## Components
- **Cards:** Use MD3-inspired elevated containers. Titles should be in `title-lg`, and the footer should be separated by a hairline Slate 100 divider for summary actions.
- **Tables:** Optimized for high density. Rows have a hover state (Slate 50). Currency columns (BDT) must be right-aligned with tabular figures.
- **Status Badges:** Use a "Light Surface" style. For example, a "Paid" status uses a light green background with dark green text.
- **Buttons:** 
  - *Primary:* Solid Healthcare Green with white text.
  - *Secondary:* Ghost style with Healthcare Green border and text.
- **Input Fields:** Outlined style with Slate 300 borders, shifting to Primary Green on focus.
- **Sidebar Navigation:** Use a vertical list with 12px vertical spacing. Active states use a "Trailing Pill" indicator in Primary Green.
- **Specialty Components:** Patient vitals sparklines, appointment calendar widgets, and "Quick Action" floating action buttons for emergency patient registration.