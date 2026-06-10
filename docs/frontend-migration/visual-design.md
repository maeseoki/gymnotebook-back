# Visual Design Documentation (Legacy Vite)

## Theme identity (`utils/theme.ts`)

- **Color mode:** dark by default.
- **Font:** `Space Grotesk Variable` for heading/body.
- **Primary palette:** gold/orange (`primary.200 #FBB021`, `primary.300 #F5A101`, darker amber shades).
- **Secondary palette:** blue (`secondary.300 #84aaf7`, `secondary.500 #357ef1`, darker navy shades).
- **Background usage:** mostly Chakra dark grays (`gray.900`, `gray.700`) with borders in `gray.700`/`whiteAlpha.300`.
- **Gradients:** primary/secondary linear gradients for prominent buttons.
- **Shadows:** soft glow and subtle top/bottom nav shadows.
- **Border radius:** frequent `lg`/`xl`; circular image/avatar treatments.

## Recurring UI patterns

- **Header:** sticky top-like section with gradient text title and route-name mapping.
- **Bottom nav:** fixed icon-only navigation bar with 4-5 icons.
- **Cards:** bordered, rounded, dark surfaces with compact headers.
- **Forms:** stacked controls, explicit labels, required markers via red asterisk text.
- **Buttons:** gradient primary CTAs + outlined destructive/secondary actions.
- **Icons:** strong use of `react-icons` for semantic hints (home, gym, profile, lightning, graph).
- **Feedback:** Chakra toasts, alert banners, dialogs.
- **Skeletons:** used in exercise list and exercise edit load states.

## Screen-by-screen visual hierarchy

### Login / Signup
- Central single-column auth card composition.
- Strong logo + title branding at top.
- CTA links as inline text buttons.

### Home
- One dominant alert card with icon and CTA.

### Workout active
- Vertical stack: title -> summary stats bar -> repeated exercise cards -> bottom actions.
- Exercise cards combine avatar, muscle metadata row, set table, centered “Añadir Serie” button.

### Exercises list
- Top CTA button and search field.
- Repeated full-width cards with circular image on left and text/meta on right.

### Exercise edit
- Centered circular dashed image picker.
- Long form stack below with selects and textarea.

### Profile (`/me`)
- Profile summary card with avatar + logout action.
- Informational alert + calendar below.

### Admin users
- Vertical list of compact user cards with right-aligned delete icon.

## Responsive/mobile behavior currently present

- Container constrained to `maxW='2xl'` with mobile-first paddings.
- Bottom nav fixed to screen bottom.
- Exercise cards switch layout based on small breakpoints.
- No explicit safe-area handling.

## Tables and calendar

- Set rendering uses HTML tables (web-centric).
- Calendar uses `react-calendar` + custom SCSS dark theme (`assets/scss/calendar.scss`) with highlighted workout-day color (`secondary.500`).

## Animations

- Auto animate on app container (`@formkit/auto-animate`).
- Confetti on successful workout completion (`canvas-confetti`).

## Screenshots

- No trusted runtime screenshots captured in this audit session.
- Legacy standalone build failed during audit (`../../utils/compressor` import path case mismatch), so runtime viewport inspection could not be completed without modifying legacy source.
- `docs/frontend-migration/screenshots/` currently contains no files.
