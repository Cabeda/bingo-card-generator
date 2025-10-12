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
- **Coverage Thresholds**: Configured to ensure minimum test coverage

## Running Tests

### Basic Commands

```bash
# Run all tests
bun run test

# Run tests in watch mode (for development)
bun run test:watch

# Run tests with coverage report
bun run test:coverage
```

**Note:** The project uses Jest through Bun. The `bun run test` command is configured in
`package.json` to run `NODE_OPTIONS='--experimental-vm-modules' bunx jest`, which ensures
Jest runs correctly with Bun's runtime.

### Coverage Reports

Coverage reports are generated in the `coverage/` directory and include:

- HTML report: `coverage/lcov-report/index.html`
- Terminal summary when running with `--coverage`

Current coverage thresholds:

- Statements: 47%
- Branches: 40%
- Functions: 42%
- Lines: 46%

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

## Test Coverage by Component

### Fully Tested (100%)

- ✅ Navbar component
- ✅ ViewTransition component
- ✅ utils.ts (98%)

### Partially Tested

- ⚠️ Ball component (56%)
- ⚠️ FileUpload component (39%)
- ⚠️ BingoGame component (23%)

### Areas for Improvement

**BingoGame Component:**

- Draw number functionality
- Card validation logic
- Win condition checking
- TTS and audio features
- Modal interactions

**FileUpload Component:**

- PDF generation flow
- File upload and parsing
- Progress tracking
- Error handling

**Ball Component:**

- Animation state management
- User interaction with drawn balls

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

Tests are run automatically on:

- Every pull request
- Every commit to main branch
- Before production deployments

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
