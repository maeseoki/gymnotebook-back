# Browser-Specific Dependencies and React Native Replacements

| Legacy dependency/API | Current usage | RN/Expo replacement | Preserve behavior? | Complexity |
|---|---|---|---|---|
| Chakra UI | Entire UI layer | NativeWind + RN primitives, or React Native Reusables/internal design system | Yes (visual language) | High |
| Emotion | Chakra styling runtime | Not needed with RN styling solution | Indirectly | Medium |
| React DOM | Web rendering root | React Native renderer (Expo) | N/A | Low |
| React Router DOM | Browser route tree | Expo Router | Yes | Medium |
| React Dropzone | Exercise image selection | Expo ImagePicker / Camera | Yes | Medium |
| CompressorJS | Client image compression | Expo ImageManipulator | Yes | Medium |
| React Calendar | Profile calendar | RN calendar component/custom calendar | Yes | Medium |
| `localStorage` | token/workout persistence | SecureStore + SQLite/AsyncStorage | Yes | Medium |
| `URL.createObjectURL`/`revokeObjectURL` | local preview blobs | local file URI from ImagePicker | Yes | Low |
| HTML forms/inputs | auth/edit/add-set forms | RN inputs + RHF controllers | Yes | Medium |
| HTML tables | set history/workout sets | `FlatList` + row `View` layouts | Yes | Medium |
| Canvas Confetti | finish workout celebration | RN confetti animation library/Reanimated particles | Optional preserve | Low-Medium |
| Framer Motion (dependency present) | currently not directly used | Reanimated | No direct behavior to preserve yet | Low |
| Auto Animate | app container transitions | Reanimated layout transitions | Optional preserve | Low-Medium |
| `window.atob` | JWT decode helper | lightweight JWT decode util compatible with RN runtime | Yes | Low |
| `window.location.href` redirect | interceptor forced login redirect | navigation reset (`router.replace('/login')`) | Yes | Low |
| `crypto.randomUUID` | workout uuid generation | `expo-crypto` or native UUID package | Yes | Low |

Notes:
- Preserve behavior where it matters (image selection/compression, bottom navigation, workout continuity), not exact UI library APIs.
- Avoid introducing web-only assumptions in shared logic (e.g., direct DOM/global window references).
