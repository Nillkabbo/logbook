---
name: Layered Calm
colors:
  surface: '#f9f9fa'
  surface-dim: '#dadadb'
  surface-bright: '#f9f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f4'
  surface-container: '#eeeeef'
  surface-container-high: '#e8e8e9'
  surface-container-highest: '#e2e2e3'
  on-surface: '#1a1c1d'
  on-surface-variant: '#47464b'
  inverse-surface: '#2f3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#77767b'
  outline-variant: '#c8c5cb'
  surface-tint: '#5f5e61'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1b1b1e'
  on-primary-container: '#858387'
  inverse-primary: '#c8c5ca'
  secondary: '#006c4a'
  on-secondary: '#ffffff'
  secondary-container: '#82f5c1'
  on-secondary-container: '#00714e'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1d1b16'
  on-tertiary-container: '#88837c'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e4e1e6'
  primary-fixed-dim: '#c8c5ca'
  on-primary-fixed: '#1b1b1e'
  on-primary-fixed-variant: '#47464a'
  secondary-fixed: '#85f8c4'
  secondary-fixed-dim: '#68dba9'
  on-secondary-fixed: '#002114'
  on-secondary-fixed-variant: '#005137'
  tertiary-fixed: '#e8e2d9'
  tertiary-fixed-dim: '#cbc6bd'
  on-tertiary-fixed: '#1d1b16'
  on-tertiary-fixed-variant: '#494640'
  background: '#f9f9fa'
  on-background: '#1a1c1d'
  surface-variant: '#e2e2e3'
  surface-canvas: '#F4F4F5'
  surface-card: '#FFFFFF'
  surface-inset: '#E4E4E7'
  text-primary: '#18181B'
  text-secondary: rgba(24,24,27,0.6)
  accent-emerald: '#059669'
  accent-emerald-soft: rgba(5,150,105,0.1)
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
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
  numeric-data:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 20px
  margin-mobile: 16px
  margin-desktop: 48px
---

## Brand & Style

The design system is centered on the concept of "Layered Calm," a philosophy that prioritizes mental clarity and focused productivity. It is tailored for high-utility logging, tracking, and personal data management where the interface should disappear in favor of the content.

The aesthetic leans heavily into **Modern Minimalism** with a **Tonal Layered** approach. It avoids visual noise by eschewing borders and high-contrast separators, relying instead on soft elevation and subtle shifts in background values. The emotional response is one of organized tranquility—professional yet approachable, precise but not cold. It utilizes a "Zinc" monochromatic foundation to ensure a neutral, timeless feel, accented only by a purposeful emerald green for active states and achievements.

## Colors

The palette is strictly anchored in the Zinc gray scale to maintain a clean, neutral environment. 

- **Canvas & Surfaces:** The primary background is a soft off-white (`#F4F4F5`). Interactive surfaces and main content containers use pure white to pop forward, while secondary background elements or deep insets use a slightly darker Zinc (`#E4E4E7`).
- **Typography:** Contrast is managed through opacity rather than hue shifts. Primary text is a deep near-black, while secondary information uses a 60% alpha to create clear hierarchy without introducing new colors.
- **Accents:** Emerald is the sole chromatic actor. It is reserved exclusively for "working states," indicating progress, active toggles, and completed actions. Blue-grays are strictly prohibited to maintain the warmth of the Zinc tones.

## Typography

This design system uses a single-typeface system for maximum cohesion. **Inter** provides a highly legible, systematic feel that scales perfectly from small labels to large display text.

A critical requirement of the system is the use of **tabular numerals** (`tnum`) for all times, dates, and numerical data. This ensures that columns of numbers align vertically, supporting the "orderly" brand narrative. Use tighter letter-spacing on headlines to maintain a modern, "tucked" appearance, while keeping body text at default tracking for optimal readability.

## Layout & Spacing

The layout follows a **fluid grid** logic with significant generous margins to reinforce the "calm" aesthetic. 

- **The 8px Grid:** All spacing between elements must be a multiple of 4px, with 8px and 16px being the standard increments for most internal component padding.
- **Margins & Gutters:** On desktop, use a 12-column grid with 20px gutters and wide 48px outer margins to allow the content to breathe. On mobile, transition to a 4-column grid with 16px margins.
- **Information Density:** Content should be grouped within large white cards. Use `spacing-lg` (24px) for the internal padding of cards to create a luxurious sense of space.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** and soft, ambient lighting rather than heavy shadows or borders.

1.  **Level 0 (Canvas):** `#F4F4F5` - The base of the entire application.
2.  **Level 1 (Inlays):** `#E4E4E7` - Used for search bars, progress tracks, or "wells" where content is nested into the canvas. These should appear slightly recessed.
3.  **Level 2 (Cards):** `#FFFFFF` - The primary content container. It uses a soft ambient shadow: `0 8px 24px rgba(24,24,27,0.06)`. This shadow should feel like a gentle lift rather than a harsh drop.
4.  **Level 3 (Popovers/Modals):** Pure white with a more pronounced shadow (`0 12px 32px rgba(24,24,27,0.1)`) to indicate immediate priority.

No borders are used to define depth; the contrast between surface colors and the subtle shadow is sufficient.

## Shapes

The shape language is "Rounded-Organic." High corner radii are used to soften the technical nature of a log-based interface.

- **Main Cards:** 24px (`rounded-xl` / 1.5rem). This large radius is a signature element of the design system.
- **Buttons & Inputs:** 12px.
- **Chips & Progress Bars:** Fully rounded (pill-shaped) to distinguish them as interactive or status-based elements.
- **Progress Bars:** Exactly 10px tall with fully rounded end-caps.

## Components

- **Buttons:** Use a solid `#18181B` for primary actions with white text. Secondary actions should use the `#E4E4E7` inset color with primary text. No borders.
- **Chips:** Background of `rgba(5,150,105,0.1)` with `#059669` text. These are borderless and used for tags or status indicators.
- **Progress Bars:** 10px height. The track uses `#E4E4E7` (Inset) and the fill uses `#059669` (Emerald).
- **Cards:** White background, 24px corner radius, and the specific `0 8px 24px rgba(24,24,27,0.06)` shadow. Never use borders on cards.
- **Input Fields:** Use the Inset color (`#E4E4E7`) as the background. When focused, the background remains the same but a subtle 2px emerald ring can appear (or a thicker emerald left-edge accent).
- **Lists:** Items should be separated by whitespace or a very faint `1px` line using the Canvas color (`#F4F4F5`), never a dark gray.