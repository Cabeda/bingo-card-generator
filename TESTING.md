# Testing Guide

This document describes the testing infrastructure and practices for the Bingo Card Generator project.

## Test Infrastructure

### Technologies Used

- **Jest**: Testing framework
- **ts-jest**: TypeScript support for Jest
- **@testing-library/react**: Component testing utilities
- **@testing-library/jest-dom**: Custom DOM matchers
- **jsdom**: Browser environment simulation

### Configuration

Tests are configured in `jest.config.js` with the following key settings:

- **Test Environment**: jsdom (simulates browser environment)
- **TypeScript Support**: ts-jest with React JSX transformation
- **CSS Modules**: Mocked with identity-obj-proxy
- **Coverage Thresholds**: 100% statements, branches, functions and lines

## Running Tests

### Offline recovery in a real browser

Run `bunx playwright install chromium firefox`, `bun run build`, then `bun run test:offline`.
Playwright starts the production server; a development server does not exercise offline caching.

The suite uses fresh persistent Chromium and Firefox profiles and real service workers. It checks the first
online visit followed by offline play, refresh, closing and reopening a tab, restarting the browser
with the same profile, and loading all 13 entry routes without first visiting them. Cache eviction
must remove the ready claim; reconnecting must repair the cache without losing game state.

Upgrade fixtures also install an old worker with a retired CSS file or an unsupported
message protocol, then verify that a new worker takes over without reloading or
resetting the running game. Healthy old caches keep the normal waiting lifecycle.

The `offline` CI job runs this suite and is required by the final `checks` job.
Failure traces are saved in `test-results/` and `playwright-report/`. These generated files are
excluded from source linting. This suite does not replace physical iPhone Safari verification.

### Basic Commands

```bash
# Run all tests
bun run test

# Run tests in watch mode (for development)
bun run test:watch

# Run tests with coverage report
bun run test:coverage --runInBand

# Run the dedicated critical game suite
bun run test:game

# Check production TypeScript
bun run typecheck
```

**Note:** The project uses Jest through Bun. The `bun run test` command is configured in
`package.json` to run `NODE_OPTIONS='--experimental-vm-modules' bunx jest`, which ensures
Jest can load the project's ES module dependencies.

### Native WebKit print pagination (macOS)

Start the app with `bun run dev`, then run `bun run test:print:webkit` in another
terminal. This check needs macOS and the Xcode command-line tools. Set
`PRINT_TEST_URL` if the server uses a different URL or port.

The check loads the real page in an isolated native WebKit view at a mobile
viewport size and prints A4 PDFs. It verifies page counts, card order, card
footers and preview/paper card alignment for every layout, partial sheets
and a 200-card deck. This exercises
WebKit pagination, but does not replace a check in iOS Safari's print dialog.

For a minimal reproduction, run `bun run test:print:webkit 4 4` (four cards,
four per sheet). The previous fixed sheet height made WebKit spill the final
footer onto an extra page. Jest/jsdom cannot detect this print-engine bug.

### Coverage Reports

Coverage reports are generated in the `coverage/` directory and include:

- HTML report: `coverage/lcov-report/index.html`
- Terminal summary when running with `--coverage`

Every coverage metric must reach **100%**: statements, branches, functions and
lines. A failed test or a lower percentage makes Jest exit unsuccessfully.

`collectCoverageFrom` includes all production TypeScript and TSX under `app/`,
plus `proxy.ts`, `next.config.ts` and the production worker, including files that no test imports.
Only test files and TypeScript declaration files are excluded. New untested
production files therefore count against the gate.

CSS is not instrumented by Jest, and jsdom does not perform browser print
pagination. The separate native WebKit check verifies physical A4 page counts,
card order, footers and preview/paper alignment. Neither code coverage nor a mocked DOM proves that
printed content fits.

## Test Structure

Tests are co-located with the code they test:

- `app/utils/utils.test.ts` - Tests for utility functions
- `app/components/*.test.tsx` - Tests for React components

### Test File Naming

- Unit tests: `*.test.ts`
- Component tests: `*.test.tsx`

## Writing Tests

### Test Pattern

Follow the Arrange-Act-Assert (AAA) pattern:

```typescript
describe('ComponentName', () => {
  it('should describe expected behavior', () => {
    // Arrange: Set up test data
    const input = 'test-input';
    
    // Act: Execute the function/interaction
    const result = functionName(input);
    
    // Assert: Verify the result
    expect(result).toBe('expected-output');
  });
});
```

### Component Testing Example

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('should render with initial state', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should handle user interaction', () => {
    render(<MyComponent />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(screen.getByText('Clicked')).toBeInTheDocument();
  });
});
```

## Mocking

### Common Mocks

#### Next.js Components

```typescript
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});
```

#### Motion/React Animations

```typescript
jest.mock('motion/react', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>{children}</div>
    ),
  },
}));
```

#### localStorage

```typescript
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });
```

## Reviewing Coverage

Use the generated report for current per-file results rather than a manually
maintained percentage list. Run the full suite to measure repository-wide
coverage; running a single test still includes every configured production file
and can fail the global gate even when that test passes. The focused
`bun run test:i18n` command disables coverage; the full suite retains the 100% gate.

The dedicated game configuration also enforces complete coverage for its
explicit production scope. It complements the full suite rather than replacing it.

## Internationalization Testing

The project includes comprehensive internationalization (i18n)
testing to ensure translation quality and UI consistency across
all supported locales.

### Translation Coverage Tests

**Location:** `app/utils/i18n.test.ts`

These tests verify:

- **Key Consistency**: All translation keys exist in all supported
  locales (en, es, fr, pt)
- **No Extra Keys**: Non-English locales don't have keys missing
  from English
- **No Empty Values**: All translation values contain actual text
- **Placeholder Consistency**: Translation placeholders like `{count}`
  match across locales
- **Structure Validation**: All locales have the same nested structure
- **Locale Configuration**: Message files match the locales defined
  in `routing.ts`

**Running Translation Coverage Tests:**

```bash
npm test -- app/utils/i18n.test.ts
# or run both i18n test suites
npm run test:i18n
```

**Quick Validation Script:**

For a quick check without running full tests:

```bash
npm run validate:i18n
```

This script provides a summary of missing or extra translation keys across all locales.

**Note:** These tests will fail if translations are incomplete.
This is intentional to catch missing translations during development.

### Visual Regression Tests

**Location:** `app/components/I18nVisualTest.test.tsx`

These tests verify:

- **Text Length**: Translations don't cause overflow or
  truncation issues
- **Layout Consistency**: UI components maintain proper spacing
  across locales
- **RTL Support Readiness**: Components use flex classes compatible
  with right-to-left languages
- **Special Characters**: Proper rendering of accents, emojis,
  and special characters
- **Responsive Sizing**: Text scales appropriately across different
  screen sizes
- **Accessibility**: ARIA labels and semantic HTML work correctly
  with translations
- **Dynamic Content**: Variable substitution in translations
  renders correctly

**Running Visual Regression Tests:**

```bash
npm test -- app/components/I18nVisualTest.test.tsx
```

### Best Practices for I18n Testing

#### Do's ✅

- Run translation coverage tests after adding new translation keys
- Test UI components with the longest expected translations
- Verify placeholder variables match across all locales
- Check for proper rendering of special characters (é, ñ, ã, etc.)
- Test with actual translation content, not placeholder text

#### Don'ts ❌

- Don't skip translation coverage tests when they fail
- Don't add English-only keys without updating other locales
- Don't assume all languages have similar text length
- Don't use hardcoded strings in components (always use translation keys)

## Best Practices

### Do's ✅

- Write tests before fixing bugs (TDD approach encouraged)
- Test user interactions, not implementation details
- Use meaningful test descriptions
- Keep tests focused and atomic
- Mock external dependencies
- Test edge cases and error conditions

### Don'ts ❌

- Don't test implementation details
- Don't write tests that depend on other tests
- Don't skip error case testing
- Don't test third-party library functionality
- Don't over-mock; test real behavior when possible

## Continuous Integration

`.github/workflows/test.yml` runs on pushes to `main` and pull requests targeting
`main` (opened, synchronized or reopened).

- The Ubuntu test job installs the frozen lockfile, runs lint, typechecking,
  the full suite with the 100% production coverage gate, the critical game suite
  and a production build. Coverage reports are uploaded even when tests fail.
- The `macos-15` native print job installs the frozen lockfile, builds the app,
  starts the production server and waits for `/en` with a bounded readiness
  check. It then runs `bun run test:print:webkit`; any failure fails the job.
  Server and print-check logs are uploaded on failure.
- The offline job checks recovery in real Chromium and Firefox browsers. Browser installation
  has a five-minute step timeout within the job's twenty-minute limit.
- The workflows job installs pinned actionlint and runs `bun run lint:workflows`.
  To run it locally, install actionlint v1.7.12 and ShellCheck and place both
  on `PATH`; actionlint otherwise skips shell diagnostics when ShellCheck is absent.
- The final `checks` job requires workflow validation, tests, native print and
  offline recovery to succeed. No test or coverage failure may continue as success.

Native macOS WebKit exercises Apple's print pagination at a mobile viewport.
It does not reproduce the iOS Safari print dialog or replace a physical-device
check. The active default-branch ruleset requires pull requests and a successful
GitHub Actions `checks` status against an up-to-date branch, with no bypass actors.
Repository rules are managed in GitHub separately from workflow configuration.

## Troubleshooting

### Common Issues

**"Cannot find module" errors:**

- Ensure `moduleNameMapper` in `jest.config.js` includes the missing extension
- Check that the import path is correct

**"ReferenceError: localStorage is not defined":**

- Add localStorage mock in test setup or individual test file

**"React does not recognize the prop on a DOM element":**

- Mock the component library properly (e.g., motion/react props)

**Tests timing out:**

- Check for unresolved promises
- Ensure async operations are properly awaited
- Increase timeout in jest.config.js if needed

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
