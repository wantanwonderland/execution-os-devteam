---
name: react-patterns
description: Conan's React component patterns skill. Component architecture, state management, performance, hooks, and testing patterns. Reverse-engineered from jezweb and shinpr.
---

# React Patterns

## Component Architecture

### File Organization
```
src/
├── components/          # Shared/reusable components
│   ├── ui/              # Base primitives (Button, Input, Card)
│   └── features/        # Feature-specific composites
├── hooks/               # Custom hooks
├── lib/                 # Utilities, API client, config
├── types/               # Shared TypeScript types
└── app/ or pages/       # Route components
```

### Component Rules
1. **Functional components only** — no class components
2. **Single responsibility** — one component does one thing
3. **Props interface** — always typed, always documented with JSDoc
4. **Default exports for pages**, named exports for components
5. **Co-locate tests** — `Component.test.tsx` next to `Component.tsx`

### Component Template

```tsx
interface ComponentProps {
  /** Main content to display */
  children: React.ReactNode;
  /** Visual variant */
  variant?: 'default' | 'primary' | 'danger';
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Click handler */
  onClick?: () => void;
}

export function Component({
  children,
  variant = 'default',
  disabled = false,
  onClick
}: ComponentProps) {
  return (
    <div
      className={cn('base-styles', variants[variant], disabled && 'opacity-50')}
      onClick={disabled ? undefined : onClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
    >
      {children}
    </div>
  );
}
```

## State Management

| Need | Solution | When |
|------|----------|------|
| Local UI state | `useState` | Toggle, form input, modal open |
| Derived state | `useMemo` | Computed from props/state |
| Complex local state | `useReducer` | Multi-field forms, state machines |
| Shared app state | Zustand | Auth, theme, user preferences |
| Server state | TanStack Query | API data, caching, pagination |
| URL state | URL params | Filters, search, pagination |
| Form state | React Hook Form + Zod | Complex forms with validation |

### Zustand Pattern

```tsx
import { create } from 'zustand';

interface AuthStore {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}

export const useAuth = create<AuthStore>((set) => ({
  user: null,
  login: (user) => set({ user }),
  logout: () => set({ user: null }),
}));
```

## Performance Patterns

1. **Memoize expensive renders**: `React.memo()` for pure components receiving complex props
2. **Stable callbacks**: `useCallback` for functions passed to memoized children
3. **Lazy loading**: `React.lazy()` + `Suspense` for route-level code splitting
4. **Virtual lists**: `@tanstack/react-virtual` for lists >100 items
5. **Image optimization**: `next/image` (Next.js) or `loading="lazy"` + `srcSet`
6. **Avoid**: premature optimization, memoizing everything, deep prop drilling

## Testing Patterns

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Component } from './Component';

describe('Component', () => {
  it('renders children', () => {
    render(<Component>Hello</Component>);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('handles click when not disabled', () => {
    const onClick = vi.fn();
    render(<Component onClick={onClick}>Click me</Component>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not fire click when disabled', () => {
    const onClick = vi.fn();
    render(<Component onClick={onClick} disabled>Click me</Component>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});
```

## Constraints

- Functional components only
- TypeScript strict mode
- All props typed with interfaces (not `type`)
- Test user-visible behavior, not implementation details
- Query by role/label/text, never by class/id/test-id as first choice
