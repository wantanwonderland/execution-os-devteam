---
name: react-native-dev
description: Tanjiro's React Native development skill. Best practices, performance profiling, navigation, styling, and upgrade patterns. Reverse-engineered from callstackincubator/agent-skills.
---

# React Native Development

## Project Setup

Prefer **Expo** (managed workflow) unless native module access is required.

```bash
npx create-expo-app@latest my-app --template tabs
cd my-app
npx expo start
```

### When to Use Bare React Native
- Custom native modules (C++/ObjC/Java/Kotlin)
- Brownfield integration (adding RN to existing native app)
- Specific native library requirements not supported by Expo

## Navigation (Expo Router)

```
app/
├── (tabs)/
│   ├── _layout.tsx          # Tab navigator
│   ├── index.tsx            # Home tab
│   ├── explore.tsx          # Explore tab
│   └── settings.tsx         # Settings tab
├── [id].tsx                 # Dynamic route
├── _layout.tsx              # Root layout (auth check)
├── +not-found.tsx           # 404 screen
└── modal.tsx                # Modal screen
```

## Styling (NativeWind / Tailwind for RN)

```tsx
import { View, Text } from 'react-native';

export function Card({ title, children }: CardProps) {
  return (
    <View className="bg-white rounded-xl p-4 shadow-md">
      <Text className="text-lg font-bold text-gray-900">{title}</Text>
      {children}
    </View>
  );
}
```

Fallback to `StyleSheet.create()` when NativeWind doesn't cover the case.

## Performance Patterns
(From callstack's react-native-best-practices)

### JS Performance
- Use `useCallback` for callbacks passed to `FlatList` renderItem
- Avoid anonymous functions in JSX of list items
- Use `InteractionManager.runAfterInteractions()` for heavy work after navigation

### List Performance
- `FlatList` with `getItemLayout` for fixed-height items
- `windowSize={5}` to limit off-screen rendering
- `removeClippedSubviews={true}` on Android
- `keyExtractor` must return string, not index

### Image Performance
- Use `expo-image` (not `Image` from react-native)
- Prefetch images: `Image.prefetch(uri)`
- Use appropriate resize modes: `cover` for backgrounds, `contain` for content

### Bundle Size
- Analyze with `npx expo-bundle-analyzer`
- Tree-shake unused imports
- Lazy-load heavy screens with `React.lazy()`
- Avoid importing entire libraries (lodash → lodash/debounce)

## Testing

```tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Card } from './Card';

test('renders card with title', () => {
  render(<Card title="Hello">Content</Card>);
  expect(screen.getByText('Hello')).toBeOnTheScreen();
  expect(screen.getByText('Content')).toBeOnTheScreen();
});
```

## Constraints

- Expo managed workflow unless native modules required
- NativeWind for styling (Tailwind consistency with web)
- Expo Router for navigation (file-based, consistent with Next.js)
- Test on both iOS and Android (minimum)
- Minimum target: iOS 15+, Android API 24+
- Touch targets minimum 44pt
