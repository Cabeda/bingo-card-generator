# Bingo Card Generator

![Test & Build](https://github.com/Cabeda/bingo-card-generator/actions/workflows/test.yml/badge.svg?branch=main)
![Lint Auto-Fix](https://github.com/Cabeda/bingo-card-generator/workflows/Lint%20Auto-Fix/badge.svg)
![CodeQL](https://github.com/Cabeda/bingo-card-generator/workflows/CodeQL%20Security%20Scanning/badge.svg)

A modern web application for generating, managing, and playing bingo games. Built with Next.js, TypeScript, and TailwindCSS.

## ✨ Features

### 🌍 Internationalization

- **Multi-language Support**: Available in English, Portuguese, Spanish, and French
- **Language Selector**: Easy-to-use dropdown in the navigation bar
- **Persistent Preference**: Language selection is saved in localStorage
- **Localized TTS**: Text-to-speech announces numbers in the selected language

### 🎴 Card Generation

- **Generate Random Bingo Cards**: Create multiple bingo cards with configurable quantities
- **Customizable Events**: Add custom headers/event names to your cards
- **Export Options**:
  - Export cards to PDF format with customizable cards-per-page layout
  - Export to custom `.bingoCards` format for later use

### 📤 Import & Upload

- **File Upload**: Upload previously saved `.bingoCards` files
- **Parse and Display**: Automatically parse and display uploaded bingo cards

### 🎮 Play Mode

- **Interactive Game**: Play bingo games with generated or uploaded cards
- **Number Drawing**: Randomly draw numbers from 1-89
- **Game State Persistence**: Game progress is saved in browser localStorage
- **Line & Bingo Validation**: Check if cards have winning lines or full bingo
- **Visual Feedback**: See drawn numbers highlighted on cards
- **Game Controls**: Start new games, draw numbers, restart, and validate winners

### 🎯 Bingo Card Rules

Cards follow traditional bingo rules:

- 3 rows × 9 columns (27 cells total)
- Each row has exactly 5 numbers and 4 empty cells
- Each column has at least 1 number
- Numbers are sorted in ascending order within columns
- Column number ranges:
  - Column 0: 1-9
  - Columns 1-7: (col × 10) to (col × 10 + 9)
  - Column 8: 80-89
- All numbers on a card are unique

### 📱 Progressive Web App (PWA)

- **Offline Support**: Works offline after initial visit
- **Installable**: Can be installed on mobile and desktop devices
- **App-like Experience**: Runs in standalone mode when installed
- **Service Worker**: Automatically caches assets for faster loading
- **Fast Performance**: Instant loading on repeat visits

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh) 1.0 or higher

### Installation

1. Clone the repository:

```bash
git clone https://github.com/Cabeda/bingo-card-generator.git
cd bingo-card-generator
```

1. Install dependencies:

```bash
bun install
```

1. Run the development server:

```bash
bun run dev
```

1. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
bun run build
bun run start
```

## 🛠️ Technology Stack

- **Framework**: [Next.js 15](https://nextjs.org) with App Router
- **Language**: [TypeScript](https://www.typescriptlang.org/) (strict mode)
- **Styling**: [TailwindCSS](https://tailwindcss.com/) with custom CSS modules
- **PDF Generation**: [jsPDF](https://github.com/parallax/jsPDF) with [html-to-image](https://github.com/bubkoo/html-to-image)
- **PWA**: [next-pwa](https://github.com/shadowwalker/next-pwa) for Progressive Web App support
- **Testing**: [Jest](https://jestjs.io/) with ts-jest and jsdom
- **Linting**: [ESLint](https://eslint.org/) with Next.js configuration
- **Bundle Analysis**: [@next/bundle-analyzer](https://www.npmjs.com/package/@next/bundle-analyzer)

## 📁 Project Structure

```text
bingo-card-generator/
├── app/
│   ├── components/       # React components
│   │   ├── BingoGame.tsx    # Game playing interface
│   │   ├── FileUpload.tsx   # Card generation & upload
│   │   ├── Navbar.tsx       # Navigation bar
│   │   └── Ball.tsx         # Number ball component
│   ├── game/            # Game page
│   ├── utils/           # Utility functions and interfaces
│   │   ├── utils.ts         # Card generation & parsing logic
│   │   ├── utils.test.ts    # Unit tests
│   │   └── bingo.interface.ts # TypeScript interfaces
│   ├── globals.css      # Global styles
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Home page
├── public/              # Static assets
├── .github/             # GitHub configuration
│   └── copilot-instructions.md # AI coding assistant instructions
├── jest.config.js       # Jest configuration
├── next.config.mjs      # Next.js configuration
├── tailwind.config.ts   # TailwindCSS configuration
└── tsconfig.json        # TypeScript configuration
```

## 🧪 Development

### Available Scripts

```bash
bun run dev            # Start development server
bun run build          # Build for production
bun run build:analyze  # Build with bundle size analysis
bun run start          # Start production server
bun run lint           # Run ESLint
bun run lint:fix       # Fix ESLint issues automatically
bun run test           # Run Jest tests
```

### Bundle Size Analysis

The project includes `@next/bundle-analyzer` for monitoring bundle sizes:

```bash
bun run build:analyze  # or npm run build:analyze
```

This generates interactive HTML reports in `.next/analyze/`:

- `client.html` - Client-side bundle analysis
- `nodejs.html` - Server-side bundle analysis
- `edge.html` - Edge runtime bundle analysis

Open these files in your browser to visualize bundle composition and identify optimization opportunities.

### Testing

Tests are written using Jest and located alongside the code they test:

```bash
bun run test          # Run all tests
bun run test:watch    # Run tests in watch mode
bun run test:coverage # Run tests with coverage report
bun run test:i18n     # Run internationalization tests
```

**Internationalization Testing:**

The project includes specialized tests for translation completeness and visual consistency:

```bash
bun run validate:i18n  # Quick validation of translation files
bun run test:i18n      # Comprehensive i18n test suite
```

See [TESTING.md](./TESTING.md) for detailed testing documentation, including i18n testing strategies.

> **Note:** Tests use Jest through Bun. The `bun run test` command runs Jest with the proper
> configuration (`NODE_OPTIONS='--experimental-vm-modules' bunx jest`).

### Code Style

- TypeScript strict mode is enabled
- Follow existing code patterns and naming conventions
- Use functional components with React hooks
- See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines

### Pre-commit Hooks

The project uses [Husky](https://typicode.github.io/husky/) for Git hooks:

- **Pre-commit**: Automatically runs linting and tests before each commit
- **Commit message**: Validates commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) format

Hooks are automatically installed when running `bun install`. See [CONTRIBUTING.md](./CONTRIBUTING.md) for more details.

## 📖 Usage

### Generating Bingo Cards

1. Open the application in your browser
2. Enter the number of cards to generate
3. Set cards per page for PDF export (1-3)
4. Add an optional event header/name
5. Click "Gerar cartões de Bingo" (Generate Bingo Cards)
6. Export to PDF or `.bingoCards` format

### Playing Bingo

1. Navigate to the "Jogo" (Game) page
2. Click "Começar Jogo" (Start Game) and upload a `.bingoCards` file
3. Click "Tirar Número" (Draw Number) to randomly draw numbers
4. Use "Verificar Linha" (Check Line) to validate a line win
5. Use "Verificar Bingo" to validate a full bingo win
6. Click "Reiniciar Jogo" (Restart Game) to start over with the same cards

### File Format

The `.bingoCards` format structure:

```text
|CardNo.1;number1;number2;...;number27|CardNo.2;number1;...
```

Each card entry:

- Starts with `|CardNo.{number}`
- Followed by 27 numbers (or `null` for empty cells) separated by `;`
- Numbers represent a 3×9 grid (row-major order)

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details on:

- How to set up your development environment
- Our code style and standards
- How to submit pull requests
- Testing requirements
- **Using conventional commits** for automatic CHANGELOG generation

### 🌍 Adding Translations

To add a new language or update existing translations, see [docs/I18N.md](./docs/I18N.md) for detailed instructions.

## 📚 Documentation

### For Developers

- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: Comprehensive architecture overview
  - Component hierarchy and data flow
  - State management patterns
  - Core algorithms and performance considerations
  - File formats and security considerations
- **[CONTRIBUTING.md](./CONTRIBUTING.md)**: Contribution guidelines and coding standards
- **[RELEASES.md](./docs/RELEASES.md)**: Release management and automated CHANGELOG generation
  - Conventional commits guide
  - Version bumping rules
  - Release process documentation
- **[CI_CACHING.md](./docs/CI_CACHING.md)**: CI/CD build caching strategy
  - Bun dependencies caching
  - Next.js build cache optimization
  - Coverage reports caching
  - Performance monitoring and troubleshooting
- **[SECURITY_HEADERS.md](./docs/SECURITY_HEADERS.md)**: Security headers configuration
  - Content Security Policy (CSP) implementation
  - Additional security headers (X-Frame-Options, etc.)
  - Testing and compliance information
- **API Documentation**: All functions and interfaces include JSDoc comments
  - Type definitions in `app/utils/bingo.interface.ts`
  - Core utilities in `app/utils/utils.ts`
  - Component documentation in respective files

### For Users

- **README.md** (this file): Getting started and usage guide
- **In-app Help**: Tooltips and interface guidance

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🔒 Security

If you discover a security vulnerability, please see [SECURITY.md](./SECURITY.md) for information on how to report it responsibly.

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/Cabeda/bingo-card-generator/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Cabeda/bingo-card-generator/discussions)

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org)
- PDF generation powered by [jsPDF](https://github.com/parallax/jsPDF)
- Styled with [TailwindCSS](https://tailwindcss.com)

---

Made with ❤️ by the Bingo Card Generator team
