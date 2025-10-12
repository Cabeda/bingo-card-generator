# Contributing to Bingo Card Generator

Thank you for your interest in contributing to the Bingo Card Generator! We welcome contributions from the community
and are grateful for your support.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Enhancements](#suggesting-enhancements)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By
participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:

   ```bash
   git clone https://github.com/YOUR-USERNAME/bingo-card-generator.git
   cd bingo-card-generator
   ```

3. **Add upstream remote**:

   ```bash
   git remote add upstream https://github.com/Cabeda/bingo-card-generator.git
   ```

4. **Install dependencies**:

   ```bash
   bun install
   ```

## Development Setup

### Prerequisites

- Node.js 18.x or higher
- bun
- Git
- A code editor (VS Code recommended)

### Running the Development Server

```bash
bun run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### Running Tests

```bash
bun test           # Run all tests
bun test --watch   # Run tests in watch mode
bun test --coverage  # Run tests with coverage report
```

### Linting

```bash
bun run lint           # Check for linting errors
bun run lint:fix       # Automatically fix linting errors
```

### Building

```bash
bun run build          # Build for production
bun run start          # Start production server
```

## How to Contribute

### Reporting Bugs

Before creating a bug report:

1. Check the [existing issues](https://github.com/Cabeda/bingo-card-generator/issues) to avoid duplicates
2. Ensure the bug is reproducible in the latest version

When creating a bug report, include:

- A clear and descriptive title
- Steps to reproduce the behavior
- Expected behavior
- Actual behavior
- Screenshots (if applicable)
- Your environment (OS, browser, Node.js version)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- Use a clear and descriptive title
- Provide a detailed description of the proposed feature
- Explain why this enhancement would be useful
- Include examples or mockups if applicable

### Making Code Changes

1. **Create a new branch** from `main`:

   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes** following the [coding standards](#coding-standards)

3. **Write or update tests** for your changes

4. **Run tests and linting**:

   ```bash
   bun test
   bun run lint
   ```

5. **Commit your changes** with clear, descriptive messages:

   ```bash
   git commit -m "feat: add new feature description"
   # or
   git commit -m "fix: resolve specific bug"
   ```

6. **Push to your fork**:

   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request** on GitHub

## Coding Standards

### TypeScript

- **Use TypeScript strict mode** (already enabled in `tsconfig.json`)
- **Type everything explicitly**: Function parameters, return values, and variables
- **Avoid `any` type**: Use specific types or `unknown` if necessary
- **Use interfaces** for data structures (see `app/utils/bingo.interface.ts`)
- **Leverage TypeScript path aliases**: `@/*` maps to the project root

### React/Next.js

- **Use functional components** with React hooks
- **Add `'use client'` directive** for client-side components
- **Place components** in `app/components/` directory
- **Export components** as named exports: `export function ComponentName()`
- **Use appropriate hooks**: `useState`, `useRef`, `useEffect`, etc.
- **Follow Next.js App Router conventions** for routing and layouts

### Naming Conventions

- **Files**: PascalCase for component files (e.g., `FileUpload.tsx`, `Navbar.tsx`)
- **Components**: PascalCase (e.g., `FileUpload`, `Navbar`)
- **Functions**: camelCase (e.g., `generateBingoCard`, `parseBingoCards`)
- **Interfaces/Types**: PascalCase (e.g., `Card`, `Game`)
- **Variables**: camelCase (e.g., `bingoCards`, `eventHeader`)
- **Constants**: UPPER_SNAKE_CASE for true constants

### Code Organization

- **Utility functions**: Keep in `app/utils/`
- **Interfaces/types**: Keep in `app/utils/bingo.interface.ts` or co-located with components
- **Page components**: Place in respective directories under `app/`
- **Shared components**: Place in `app/components/`

### Code Style

- **Comments**: Add comments for complex logic or non-obvious code
- **JSDoc**: Use JSDoc comments for exported functions and interfaces
- **Imports**: Organize imports logically (React, third-party, local)
- **Line length**: Keep lines under 100 characters when reasonable
- **Formatting**: Let ESLint and Prettier handle formatting

Example JSDoc:

```typescript
/**
 * Generates a bingo card with the specified card number.
 * @param cardNumber - The unique identifier for the card
 * @returns A Card object with numbers arranged according to bingo rules
 */
export function generateBingoCard(cardNumber: string): Card {
  // implementation
}
```

## Testing Guidelines

### Test Structure

Use the Arrange-Act-Assert pattern:

```typescript
describe('functionName', () => {
  it('should describe expected behavior', () => {
    // Arrange: Set up test data
    const input = 'test-input';
    
    // Act: Execute the function
    const result = functionName(input);
    
    // Assert: Verify the result
    expect(result).toBe('expected-output');
  });
});
```

### What to Test

- **Utility functions**: Test all edge cases and expected outputs
- **Component logic**: Test user interactions and state changes
- **Data parsing**: Test valid and invalid inputs
- **Bingo card generation**: Validate card structure, number ranges, and uniqueness
- **Error handling**: Test error cases and edge conditions

### Test Co-location

Place test files next to the code they test:

- `utils.ts` → `utils.test.ts`
- Component tests should be in the same directory as the component

### Test Coverage

- Aim for at least 80% code coverage for new features
- Coverage threshold enforced at 70% (enforced by Codecov)
- All bug fixes should include tests that would have caught the bug
- Test edge cases and error conditions
- Coverage reports are automatically generated on every push and PR
- View coverage reports at [Codecov](https://codecov.io/gh/Cabeda/bingo-card-generator)

## Pull Request Process

### Before Submitting

1. **Update documentation** if you've changed functionality
2. **Add or update tests** for your changes
3. **Run all tests** and ensure they pass: `npm run test`
4. **Run linting** and fix any issues: `npm run lint:fix`
5. **Build the project** to ensure no build errors: `npm run build`
6. **Update the README** if you've added features or changed usage

### PR Guidelines

- **Title**: Use a clear, descriptive title
- **Description**: Include:
  - What changes were made and why
  - Link to related issues (e.g., "Fixes #123")
  - Screenshots for UI changes
  - Breaking changes (if any)
- **Size**: Keep PRs focused and reasonably sized
- **Commits**: Use clear, descriptive commit messages
- **Draft PRs**: Use draft PRs for work-in-progress

### Commit Message Format

Follow conventional commits format:

```text
type(scope): brief description

Longer description if needed

Closes #123
```

Types:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring without changing functionality
- `test`: Adding or updating tests
- `chore`: Maintenance tasks, dependency updates

Examples:

```text
feat(card-generation): add support for custom card sizes
fix(game): resolve issue with number drawing validation
docs(readme): update installation instructions
test(utils): add tests for edge cases in parseBingoCards
```

### Review Process

1. Maintainers will review your PR
2. Address any requested changes
3. Once approved, a maintainer will merge your PR
4. Your contribution will be included in the next release!

### After Your PR is Merged

1. Delete your feature branch (GitHub can do this automatically)
2. Update your local main branch:

   ```bash
   git checkout main
   git pull upstream main
   ```

3. Celebrate! 🎉 You've contributed to open source!

## Bingo Card Rules Reference

When working on card generation or validation, remember these rules:

- Each card has 3 rows and 9 columns (27 cells total)
- Each row must have exactly 5 numbers and 4 empty cells
- Each column must have at least 1 number (no completely empty columns)
- Numbers in each column are sorted in ascending order
- Column ranges:
  - Column 0: 1-9
  - Columns 1-7: (col × 10) to (col × 10 + 9)
  - Column 8: 80-89
- All numbers on a card must be unique

## Questions?

- Open an [issue](https://github.com/Cabeda/bingo-card-generator/issues) for questions
- Start a [discussion](https://github.com/Cabeda/bingo-card-generator/discussions) for general topics
- Check existing issues and discussions first

## License

By contributing to Bingo Card Generator, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing! Every contribution, no matter how small, is valuable and appreciated. 🙏
