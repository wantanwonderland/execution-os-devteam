# Use Case: Start a New Flutter Project

Build a cross-platform mobile app with Flutter, Dart, Material 3, and Riverpod state management.

---

## Setup

```bash
# Create your project
mkdir my-flutter-app && cd my-flutter-app
git init

# Start Claude Code and install the plugin
claude
/plugin marketplace add wantanwonderland/execution-os-devteam
/plugin install execution-os-devteam
```

---

## Step 1: Scaffold

```
/new flutter
```

Conan scaffolds:
```bash
flutter create my_flutter_app
cd my_flutter_app
flutter pub add flutter_riverpod go_router dio freezed_annotation json_annotation
flutter pub add --dev build_runner freezed json_serializable
```

**What you get:**
```
my_flutter_app/
├── lib/
│   ├── main.dart
│   ├── app/
│   │   ├── router.dart         # GoRouter config
│   │   └── theme.dart          # Material 3 theme
│   ├── features/
│   │   ├── auth/               # Login, register
│   │   ├── home/               # Home screen
│   │   └── settings/           # Settings
│   ├── shared/
│   │   ├── widgets/            # Reusable widgets
│   │   ├── models/             # Freezed data classes
│   │   └── services/           # API client (Dio)
│   └── providers/              # Riverpod providers
├── test/                       # Unit + widget tests
├── integration_test/           # Integration tests
├── ios/
├── android/
├── pubspec.yaml
└── analysis_options.yaml
```

---

## Step 2: Design

```
/design Health & wellness app. Users track habits, set goals, view streaks. Should feel calm, motivating, and personal.
```

**Rohan** creates Material 3 theme:
> **Tone**: Soft/organic — rounded shapes, pastel gradients, gentle animations
> **Colors**: Sage green primary, lavender accent, warm white background
> **Typography**: Outfit (headings) + Plus Jakarta Sans (body)

---

## Step 3: Build Features

```
Tell Conan to build a habit tracking feature:
- Create/edit/delete habits with name, icon, frequency (daily/weekly)
- Daily check-in screen with swipe-to-complete
- Streak counter with animation on milestone (7, 30, 100 days)
- Weekly/monthly stats chart
- Local storage with Hive for offline-first
```

---

## Step 4: Test & Ship

```
/test unit lib/
/security
/deploy
```

---

## Agent Collaboration on Flutter

| Task | Agent(s) | How |
|------|---------|-----|
| Scaffold Flutter project | Conan | `/new flutter` |
| Material 3 theming | Rohan | `/design` |
| Feature development | Conan | natural language request |
| Widget tests | Killua | `/test unit` |
| Code review | Diablo | `/pr-queue` |
| Security | Itachi | `/security` |
| Build + deploy | Shikamaru | `/deploy` |
