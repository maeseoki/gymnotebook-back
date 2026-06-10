# Browser-Specific Dependencies and React Native Replacements

| Legacy dependency/API | Current usage | RN/Expo replacement | Preserve behavior? | Complexity |
|---|---|---|---|---|
| Chakra UI | Entire UI layer | Native primitives + chosen RN styling system | Yes (visual language) | High |
| Emotion | Chakra styling runtime | Not needed with RN styling approach | Indirectly | Medium |
| React DOM | Web rendering root | React Native renderer (Expo) | N/A | Low |
| React Router DOM | Browser route tree | Expo Router | Yes | Medium |
| React Dropzone | Exercise image selection | Expo ImagePicker / Camera modules | Yes | Medium |
| CompressorJS | Client image compression | Expo ImageManipulator | Yes | Medium |
| React Calendar | Profile calendar | RN calendar component/custom calendar | Yes | Medium |
| `localStorage` | token/workout persistence | SecureStore (refresh token) + AsyncStorage (active workout persisted draft in v1) | Yes | Medium |
| `URL.createObjectURL`/`revokeObjectURL` | local preview blobs | local file URI from image picker | Yes | Low |
| HTML forms/inputs | auth/edit/add-set forms | RN inputs + RHF controllers | Yes | Medium |
| HTML tables | set history/workout sets | `FlatList` + row `View` layouts | Yes | Medium |
| Canvas Confetti | finish workout celebration | optional RN confetti/reanimated approach | Optional preserve | Low-Medium |
| Framer Motion (dependency present) | currently not directly used | Reanimated-based patterns if needed | No direct behavior to preserve yet | Low |
| Auto Animate | app container transitions | Reanimated layout transitions | Optional preserve | Low-Medium |
| `window.atob` | JWT decode helper | RN-compatible decode utility | Yes | Low |
| `window.location.href` redirect | interceptor forced login redirect | router reset/navigation replacement | Yes | Low |
| `crypto.randomUUID` | workout UUID generation | Expo-compatible UUID source | Yes | Low |

Notes:
- Preserve product behavior where it matters, not browser-specific APIs.
- Do not store long-lived auth session state in AsyncStorage.
- Initial active-workout persistence is AsyncStorage-backed JSON with schema validation and migrations; SQLite is a future option only when requirements justify it.
