# Use Case: Start a New Expo React Native Project

Build a cross-platform mobile app with Expo, TypeScript, NativeWind (Tailwind), and Expo Router.

---

## Setup

```bash
# Create your project
mkdir my-mobile-app && cd my-mobile-app
git init

# Start Claude Code and install the plugin
claude
/plugin marketplace add wantanwonderland/execution-os-devteam
/plugin install execution-os-devteam
```

---

## Step 1: Scaffold

```
/new expo
```

Conan scaffolds:
```bash
npx create-expo-app@latest my-mobile-app --template tabs
cd my-mobile-app
npm install nativewind tailwindcss zustand
npm install expo-image @react-native-async-storage/async-storage
```

**What you get:**
```
my-mobile-app/
├── app/                    # Expo Router (file-based routing)
│   ├── (tabs)/
│   │   ├── _layout.tsx     # Tab navigator
│   │   ├── index.tsx       # Home tab
│   │   └── explore.tsx     # Explore tab
│   ├── _layout.tsx         # Root layout (auth check)
│   └── +not-found.tsx      # 404 screen
├── components/             # Shared components
├── hooks/                  # Custom hooks
├── stores/                 # Zustand stores
├── services/               # API client
├── constants/              # Theme, config
├── assets/                 # Images, fonts
├── tailwind.config.js
└── app.config.ts
```

---

## Step 2: Design the App

```
/design Food delivery app. Users browse restaurants, order food, track delivery. Should feel warm, appetizing, and fast.
```

**Rohan** designs:
> **Tone**: Warm organic — rounded shapes, food photography emphasis, earthy accents
> **Typography**: Poppins (display) + Inter (body)
> **Colors**: Warm orange primary (#F97316), forest green accent (#059669), cream background
> **Memorable detail**: Animated delivery truck that moves across the order tracking bar

```
/design component RestaurantCard — shows restaurant image, name, rating, delivery time, distance, cuisine tags
```

Rohan creates the component using NativeWind classes with all states.

---

## Step 3: Set Up Navigation

```
Tell Conan to set up the app navigation:
- Auth flow: Login, Register, Forgot Password (stack)
- Main tabs: Home (restaurants), Search, Orders, Profile
- Restaurant detail screen (modal)
- Checkout flow (stack): Cart → Address → Payment → Confirmation
- Order tracking screen with real-time updates
```

Conan creates the Expo Router file structure:

```
app/
├── (auth)/
│   ├── _layout.tsx           # Auth stack
│   ├── login.tsx
│   ├── register.tsx
│   └── forgot-password.tsx
├── (tabs)/
│   ├── _layout.tsx           # Tab navigator
│   ├── index.tsx             # Home (restaurants)
│   ├── search.tsx
│   ├── orders.tsx
│   └── profile.tsx
├── restaurant/
│   └── [id].tsx              # Restaurant detail
├── checkout/
│   ├── _layout.tsx           # Checkout stack
│   ├── cart.tsx
│   ├── address.tsx
│   ├── payment.tsx
│   └── confirmation.tsx
├── tracking/
│   └── [orderId].tsx         # Order tracking
└── _layout.tsx               # Root (auth gate)
```

---

## Step 4: Build Features

```
Tell Conan to build the restaurant listing feature:
- Fetch restaurants from API with pagination
- Pull-to-refresh
- Skeleton loading state
- Filter by cuisine, rating, delivery time
- Sort by distance, rating, popularity
- Cache results with TanStack Query
```

Conan builds:
- `services/api.ts` — API client with TanStack Query hooks
- `stores/filterStore.ts` — Zustand store for filter/sort state
- `components/RestaurantList.tsx` — FlatList with skeleton loading
- `components/FilterBar.tsx` — Horizontal scroll filter chips
- Tests for each component

---

## Step 5: Test

```
# Unit tests for components and hooks
/test unit src/

# Visual regression across device sizes
/test visual

# Accessibility audit
/test a11y
```

**Killua** reports:
- Unit: 32/32 passed
- Visual: Screenshots captured for iPhone SE, iPhone 15, iPad
- A11y: 2 issues — missing labels on filter icons, insufficient contrast on muted text

---

## Step 6: Performance Check

```
Tell Killua to analyze React Native performance:
- Check for unnecessary re-renders in restaurant list
- Analyze FlatList configuration (windowSize, getItemLayout)
- Check image loading strategy (expo-image vs Image)
- Measure bundle size
```

Killua uses `react-native-dev` skill:
- Flags missing `keyExtractor` on one FlatList
- Recommends `windowSize={5}` and `removeClippedSubviews`
- Confirms expo-image is being used correctly
- Bundle size: 2.8MB (within target)

---

## Step 7: Ship

```
# Build for testing
Tell Shikamaru to set up EAS Build for:
- iOS TestFlight deployment
- Android internal testing track
- Preview builds for PR review
```

Shikamaru generates the `eas.json` config and GitHub Actions workflow.

---

## Agent Collaboration on Expo

| Task | Agent(s) | How |
|------|---------|-----|
| Scaffold Expo project | Conan | `/new expo` |
| App design + theming | Rohan | `/design` |
| Navigation structure | Conan | natural language request |
| API integration | Conan | natural language request |
| Component development | Conan + Rohan | natural language + `/design component` |
| Unit tests | Killua | `/test unit` |
| Visual regression | Killua | `/test visual` |
| Performance audit | Killua | natural language request |
| Accessibility | Killua | `/test a11y` |
| Code review | Diablo | `/pr-queue` |
| Security scan | Itachi | `/security` |
| Build + deploy | Shikamaru | `/deploy` |
