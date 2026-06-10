import nativewindPreset from 'nativewind/preset';
import type { Config } from 'tailwindcss';
import { colors, radius, spacing } from './src/shared/theme/tokens';

export default {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [nativewindPreset],
  theme: {
    extend: {
      colors,
      borderRadius: radius,
      spacing,
      fontFamily: {
        sans: ['SpaceGrotesk_400Regular'],
      },
    },
  },
  plugins: [],
} satisfies Config;
