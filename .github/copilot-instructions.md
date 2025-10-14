# GitHub Copilot – Bingo Card Generator Project Instructions

## Project Overview

This is a Next.js application for generating and managing bingo cards. The application allows users to:

- Generate random bingo cards with specific rules
- Export cards to PDF and custom `.bingoCards` format
- Upload and parse `.bingoCards` files
- Play bingo games with generated cards

## Technology Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript (strict mode enabled)
- **Styling**: TailwindCSS with custom CSS
- **Testing**: Jest with ts-jest and jsdom
- **PDF Generation**: jsPDF with html-to-image
- **Linting**: ESLint with Next.js and TypeScript configurations

## Build, Test, and Lint Commands

```bash
bun run dev      # Start development server on http://localhost:3000
bun run build    # Build the production application
bun run start    # Start the production server
bun run lint     # Run ESLint checks
bun run test     # Run Jest tests (configured to use bunx jest with proper Node options)
```

**Note:** The `bun run test` command is configured in `package.json` to run
`NODE_OPTIONS='--experimental-vm-modules' bunx jest`, ensuring Jest works correctly with Bun.

## Commit Message Guidelines

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.
All commits should follow this format:

```text
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Commit Types

- **feat**: A new feature for the user
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that don't affect the meaning of the code (white-space, formatting, etc.)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **build**: Changes that affect the build system or external dependencies
- **ci**: Changes to CI configuration files and scripts
- **chore**: Other changes that don't modify src or test files
- **revert**: Reverts a previous commit

### Examples

```bash
feat: add PDF export progress indicator
fix: prevent duplicate numbers in bingo cards
docs: update README with installation instructions
refactor: extract PDF generation logic into custom hook
test: add unit tests for card validation
ci: add GitHub Actions workflow for testing
```

### Scope (Optional)

You can add a scope to provide additional context:

```bash
feat(game): add sound effects for ball drawing
fix(upload): handle empty .bingoCards files gracefully
test(utils): add tests for generateBingoCard function
```

### Breaking Changes

For breaking changes, add `!` after the type/scope and include a `BREAKING CHANGE:` footer:

```bash
feat!: change card number format to UUID

BREAKING CHANGE: Card numbers are now UUIDs instead of sequential numbers.
This will break existing .bingoCards files.
```

## Code Style and Formatting

### TypeScript

- Use TypeScript strict mode (already configured in `tsconfig.json`)
- Explicitly type all function parameters and return values
- Use interfaces for data structures (see `app/utils/bingo.interface.ts`)
- Avoid using `any` type; prefer specific types or `unknown`
- Use TypeScript path aliases: `@/*` maps to the project root

### React/Next.js

- Use functional components with hooks
- Use `'use client'` directive for client-side components
- Place components in `app/components/` directory
- Export components as named exports (e.g., `export function ComponentName()`)
- Use React hooks (`useState`, `useRef`, etc.) for state management
- Follow Next.js App Router conventions for routing and layouts

### Naming Conventions

- **Files**: Use PascalCase for component files (e.g., `FileUpload.tsx`, `Navbar.tsx`)
- **Components**: Use PascalCase (e.g., `FileUpload`, `Navbar`)
- **Functions**: Use camelCase (e.g., `generateBingoCard`, `parseBingoCards`)
- **Interfaces**: Use PascalCase (e.g., `Card`, `Game`)
- **Variables**: Use camelCase (e.g., `bingoCards`, `eventHeader`)
- **Constants**: Use UPPER_SNAKE_CASE for true constants

### Code Organization

- Keep utility functions in `app/utils/`
- Keep interfaces/types in `app/utils/bingo.interface.ts` or co-located with components
- Keep page components in their respective directories under `app/`
- Keep shared components in `app/components/`

## Testing Guidelines

### Testing Framework

- Use Jest with jsdom environment for component and utility tests
- Test files should be co-located with the code they test (e.g., `utils.test.ts` next to `utils.ts`)
- Use descriptive test names that explain what is being tested

### Test Structure

```typescript
describe('functionName', () => {
  it('should describe expected behavior', () => {
    // Arrange
    // Act
    // Assert
  });
});
```

### What to Test

- **Utility functions**: Test all edge cases and expected outputs
- **Component logic**: Test user interactions and state changes
- **Data parsing**: Test valid and invalid inputs
- **Bingo card generation**: Validate card structure, number ranges, and uniqueness

### Running Tests

- Run all tests with `bun run test`
- Tests should pass before committing code
- Write tests for new functionality before implementing features (TDD approach encouraged)

## Bingo Card Rules and Validation

Bingo cards in this application follow specific rules:

- Each card has 3 rows and 9 columns (27 cells total)
- Each row must have exactly 5 numbers and 4 empty cells
- Each column must have at least 1 number (no completely empty columns)
- Numbers in each column are sorted in ascending order
- Column ranges:
  - Column 0: 1-9
  - Columns 1-7: (col *10) to (col* 10 + 9)
  - Column 8: 80-89
- All numbers on a card must be unique

## Security and Best Practices

### Security

- Never commit API keys, secrets, or sensitive data
- Validate all user inputs before processing
- Sanitize file names and content when handling file uploads
- Use secure defaults for cookies if implementing authentication

### Performance

- Minimize re-renders by using appropriate React hooks
- Use `useRef` for values that don't trigger re-renders
- Optimize PDF generation by processing cards in batches
- Show progress indicators for long-running operations (PDF generation)

### Error Handling

- Provide user-friendly error messages
- Use `alert()` sparingly; prefer inline error messages
- Handle file upload errors gracefully
- Validate bingo card structure before operations

## Dependencies

### Adding New Dependencies

- Prefer packages already in use when possible
- Check package popularity and maintenance status
- Update `package.json` and run `bun install`
- Avoid dependencies with known security vulnerabilities

### Current Key Dependencies

- `next`: React framework
- `react`: UI library
- `jspdf`: PDF generation
- `html-to-image`: Convert DOM to images for PDF
- `tailwindcss`: Utility-first CSS framework
- `jest`: Testing framework
- `typescript`: Type safety

## Documentation

### Code Comments

- Add comments for complex logic or non-obvious code
- Use JSDoc comments for exported functions and interfaces
- Explain "why" rather than "what" in comments
- Keep comments up-to-date with code changes

### Example JSDoc

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

## Common Patterns in This Project

### State Management

- Use `useState` for component-local state
- Pass state down through props when needed
- Use `useRef` for DOM references and non-render-triggering values

### File Handling

- Files use `.bingoCards` extension
- Format: `|CardNo.{number};{numbers separated by semicolons}`
- Parse with `parseBingoCards` utility function
- Export with blob creation and temporary anchor element

### PDF Generation

- Use `jsPDF` with A4 page size in portrait orientation
- Convert React components to images with `html-to-image`
- Process multiple cards per page based on `bingoPercard` setting
- Show progress during PDF generation

### Styling

- Use TailwindCSS utility classes where possible
- Use custom CSS classes for complex styles
- CSS modules for component-specific styles (e.g., `Navbar.module.css`)
- Global styles in `app/globals.css`

## Issues and Limitations

### Known Issues

- Some tests in `utils.test.ts` may fail due to randomness in card generation
- ESLint warning for unused `rowIndex` variable in `utils.ts` (line 33)

### When Making Changes

- Fix linting errors before committing
- Ensure existing tests pass or update them if behavior changes
- Add new tests for new functionality
- Update this documentation if you add new patterns or conventions

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Documentation](https://react.dev)
