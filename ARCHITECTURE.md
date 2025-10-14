# Architecture Overview

This document provides a comprehensive overview of the Bingo Card Generator application architecture,
including the component hierarchy, data flow, state management, and key design decisions.

## Table of Contents

- [High-Level Architecture](#high-level-architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Component Hierarchy](#component-hierarchy)
- [Data Flow](#data-flow)
- [State Management](#state-management)
- [Core Algorithms](#core-algorithms)
- [File Formats](#file-formats)
- [Performance Considerations](#performance-considerations)
- [Progressive Web App (PWA) Features](#progressive-web-app-pwa-features)
- [Security Considerations](#security-considerations)
- [Future Enhancements](#future-enhancements)

## High-Level Architecture

The Bingo Card Generator is a client-side Next.js application that follows a **component-based
architecture** with **custom React hooks** for state management and business logic separation.
The application is split into two main features:

1. **Card Generation & Export** - Create and export bingo cards
2. **Game Management** - Host and manage live bingo games

The FileUpload component has been refactored following the **Single Responsibility Principle**,
splitting a 607-line monolithic component into focused, reusable modules:

- **Custom hooks** for state and business logic (useBingoCards, usePdfGeneration, useFileUpload)
- **Sub-components** for UI rendering (CardGenerator, PdfExporter, CardDisplay)
- **Main orchestrator** component (FileUpload/index.tsx) coordinating the hooks and sub-components

```text
┌─────────────────────────────────────────────────┐
│             User Interface (React)              │
├─────────────────────────────────────────────────┤
│  FileUpload Component  │  BingoGame Component   │
│  (Hooks + Sub-components)                       │
├─────────────────────────────────────────────────┤
│      Custom Hooks      │  Utility Functions     │
│   • useBingoCards      │  • Card Generation     │
│   • usePdfGeneration   │  • Card Parsing        │
│   • useFileUpload      │  • Validation          │
├─────────────────────────────────────────────────┤
│              Data Structures                    │
│         Card Interface  │  Game Interface       │
└─────────────────────────────────────────────────┘
```

## Technology Stack

### Core Technologies

- **Next.js 15**: React framework with App Router for routing and server-side rendering
- **React 19**: UI component library with hooks for state management
- **TypeScript**: Type-safe development with strict mode enabled
- **TailwindCSS**: Utility-first CSS framework for styling

### Key Libraries

- **jsPDF**: Generate PDF documents from bingo cards
- **html-to-image**: Convert DOM elements to images for PDF export
- **Framer Motion (motion)**: Smooth animations and transitions
- **Jest**: Testing framework with jsdom environment

### Development Tools

- **ESLint**: Code linting and style enforcement
- **TypeScript Compiler**: Type checking and compilation
- **Markdownlint**: Markdown file linting

## Project Structure

```text
bingo-card-generator/
├── app/
│   ├── components/          # React components
│   │   ├── FileUpload/     # Card generation and export (refactored)
│   │   │   ├── index.tsx   # Main orchestrator component
│   │   │   ├── CardGenerator.tsx    # Card generation controls
│   │   │   ├── PdfExporter.tsx      # PDF export UI
│   │   │   └── CardDisplay.tsx      # Card rendering
│   │   ├── BingoGame.tsx   # Live game management
│   │   ├── Ball.tsx        # Number ball component
│   │   ├── Navbar.tsx      # Navigation bar
│   │   └── ...             # Other UI components
│   ├── hooks/              # Custom React hooks
│   │   ├── useBingoCards.ts      # Card state management
│   │   ├── usePdfGeneration.ts   # PDF generation logic
│   │   └── useFileUpload.ts      # File upload handling
│   ├── utils/              # Utility functions and types
│   │   ├── utils.ts        # Core logic (generation, parsing)
│   │   ├── bingo.interface.ts  # TypeScript interfaces
│   │   └── utils.test.ts   # Unit tests
│   ├── game/               # Game page route
│   ├── page.tsx            # Home page (card generation)
│   └── layout.tsx          # Root layout
├── public/                 # Static assets
├── ARCHITECTURE.md         # This file
├── README.md               # User documentation
├── CONTRIBUTING.md         # Contribution guidelines
└── package.json            # Dependencies and scripts
```

## Component Hierarchy

### Home Page (Card Generation)

```text
page.tsx
└── FileUpload (index.tsx)
    ├── CardGenerator
    │   ├── Input Controls (cards count, event details)
    │   └── Generate Button → useBingoCards.generateCards()
    ├── PdfExporter
    │   ├── Export to .bingoCards → useBingoCards.exportBingoGame()
    │   └── Generate PDF → usePdfGeneration.generatePDF()
    ├── CardDisplay (multiple instances)
    │   └── Card Grid (visual preview)
    └── Custom Hooks:
        ├── useBingoCards (card state & operations)
        ├── usePdfGeneration (PDF logic & progress)
        └── useFileUpload (file handling)
```

### Game Page (Live Game)

```text
game/page.tsx
└── BingoGame
    ├── Numbers Grid (Ball components)
    ├── Sidebar
    │   ├── Recent Numbers
    │   ├── Game Controls
    │   │   ├── Start Game → handleStartGame()
    │   │   ├── Restart → handleRestartGame()
    │   │   └── Draw Number → handleDrawNumber()
    │   ├── Audio/TTS Settings
    │   └── Validation Panel
    │       ├── Check Line → checkLine()
    │       └── Check Bingo → checkBingo()
    └── Modals (validation results)
```

## Data Flow

### Card Generation Flow

```text
User Input (# of cards)
    ↓
CardGenerator component
    ↓
handleGenerateRandomCards()
    ↓
useBingoCards.generateCards(numCards, eventHeader)
    ↓
generateRandomBingoCards(n) [from utils]
    ↓
[for each card]
    generateBingoCard(cardNumber)
        ↓
    1. Generate 3 numbers per column
    2. Assign numbers ensuring 5 per row
    3. Sort numbers within columns
    4. Validate constraints
        ↓
    Return Card object
    ↓
Check for duplicates (hashCardNumbers)
    ↓
Store in hook state (setBingoCards)
    ↓
Render via CardDisplay components
```

### PDF Export Flow

```text
User clicks "Generate PDF" in PdfExporter
    ↓
handleGeneratePDF()
    ↓
usePdfGeneration.generatePDF(bingoCards, ...)
    ↓
[Batch Processing - configurable batch size by quality mode]
    Convert DOM elements to PNG images
    (htmlToImage.toPng with parallel processing)
    ↓
    Update progress (0-80%)
    ↓
[Assembly Phase]
    Create jsPDF document
    Add images to pages (1-3 per page)
    Add headers and footers
    ↓
    Update progress (80-100%)
    ↓
Save PDF file (download to user)
```

### Game Flow

```text
Upload .bingoCards file
    ↓
parseBingoCards(filename, content)
    ↓
Store in localStorage & state
    ↓
[Game Loop]
    User draws number
        ↓
    handleDrawNumber()
        ↓
    1. Select random undrawn number
    2. Animate ball
    3. Play audio/TTS
    4. Update drawnNumbers array
    5. Save to localStorage
        ↓
    [Validation]
        User enters card number
            ↓
        checkLine() or checkBingo()
            ↓
        Display validation result
```

## State Management

### Component-Level State (React Hooks)

#### FileUpload Component State

The FileUpload component has been refactored to use custom hooks for better separation of concerns:

##### Main Component State (index.tsx)

The FileUpload component has been refactored to use custom hooks for better separation of concerns:

```typescript
const [numCards, setNumCards] = useState<number>(10);           // Configuration
const [bingoPercard, setBingoPercard] = useState<CardsPerPage>(2); // Cards per PDF page
const [eventHeader, setEventHeader] = useState<string>(...);    // Event name
const [locationFooter, setLocationFooter] = useState<string>(...); // Location
```

##### useBingoCards Hook State

```typescript
const [bingoCards, setBingoCards] = useState<Game | null>(null); // Generated cards
const [isGenerating, setIsGenerating] = useState<boolean>(false); // Loading state
```

##### usePdfGeneration Hook State

```typescript
const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false); // PDF loading
const [progress, setProgress] = useState<number>(0);            // PDF progress
const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number>(0);
const [qualityMode, setQualityMode] = useState<QualityMode>('balanced');
const cancelPdfRef = useRef<boolean>(false);                    // Cancellation flag
const cardRefs = useRef<(HTMLDivElement | null)[]>([]);        // DOM references
```

##### useFileUpload Hook State

```typescript
const [file, setFile] = useState<File | null>(null);           // Uploaded file
```

#### BingoGame Component State

```typescript
const [bingoGame, setBingoGame] = useState<Game | null>(null);  // Current game
const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);  // Drawn numbers
const [modalMessage, setModalMessage] = useState("");            // Modal content
const [isModalOpen, setIsModalOpen] = useState(false);          // Modal visibility
const [validCard, setValidCard] = useState<Card | null>(null);  // Card being validated
const [animatingNumber, setAnimatingNumber] = useState<number | null>(null);
const [audioEnabled, setAudioEnabled] = useState(true);         // Settings
const [ttsEnabled, setTtsEnabled] = useState(false);
```

### Persistent State (localStorage)

Game state is persisted across page refreshes using localStorage:

```typescript
// Saved data
localStorage.setItem("bingoGame", JSON.stringify(game));
localStorage.setItem("drawnNumbers", JSON.stringify(drawnNumbers));

// Loaded on mount
useEffect(() => {
  const storedGame = localStorage.getItem("bingoGame");
  const storedNumbers = localStorage.getItem("drawnNumbers");
  if (storedGame) setBingoGame(JSON.parse(storedGame));
  if (storedNumbers) setDrawnNumbers(JSON.parse(storedNumbers));
}, []);
```

### State Flow Diagram

```text
┌──────────────┐
│ User Actions │
└──────┬───────┘
       ↓
┌──────────────┐     ┌─────────────┐
│ Event        │────→│ Update      │
│ Handlers     │     │ State       │
└──────────────┘     └──────┬──────┘
                            ↓
                     ┌─────────────┐
                     │ localStorage│ (if applicable)
                     └──────┬──────┘
                            ↓
                     ┌─────────────┐
                     │ Re-render   │
                     │ Components  │
                     └─────────────┘
```

## Core Algorithms

### Bingo Card Generation Algorithm

**Objective**: Generate a valid 3×9 bingo card following all rules.

**Constraints**:

- 3 rows × 9 columns = 27 cells
- Exactly 5 numbers per row, 4 empty cells per row
- At least 1 number per column
- Numbers sorted in ascending order within columns
- All numbers unique
- Column ranges: 0→[1-9], 1-7→[10-79], 8→[80-89]

**Algorithm Steps**:

1. **Initialize Grid**: Create 3×9 array filled with null
2. **Generate Column Numbers**: For each column (0-8):
   - Determine min/max range based on column index
   - Generate 3 random unique numbers in range
   - Sort numbers in ascending order
   - Randomly skip one row to get 2 numbers per column
3. **Balance Rows**: Adjust to ensure exactly 5 numbers per row:
   - **If row has > 5 numbers**: Remove excess (avoid emptying columns)
   - **If row has < 5 numbers**: Add numbers from available columns
4. **Re-sort Columns**: After adjustments, re-sort each column
5. **Return Card**: Flatten 2D array to 1D array of 27 elements

**Time Complexity**: O(27) per card (constant time)
**Space Complexity**: O(27) per card

### Duplicate Detection (Hash-Based)

```typescript
function hashCardNumbers(numbers: (number | null)[]): string {
  return numbers.join(',');  // Fast string hash
}

// Usage in generateRandomBingoCards
const cardHashes = new Set<string>();
do {
  card = generateBingoCard(i);
  hash = hashCardNumbers(card.numbers);
} while (cardHashes.has(hash) && attempts < 100);
```

**Performance**: O(n) string creation, O(1) Set lookup
**Collision Rate**: Extremely low (cards are highly unique)

### Line and Bingo Validation

```typescript
// Check if any row is complete
function checkLine(numbers: (number | null)[], drawnNumbers: number[]): boolean {
  const lines = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8],     // Row 1
    [9, 10, 11, 12, 13, 14, 15, 16, 17],  // Row 2
    [18, 19, 20, 21, 22, 23, 24, 25, 26]  // Row 3
  ];
  return lines.some(line =>
    line.every(idx => numbers[idx] === null || drawnNumbers.includes(numbers[idx]!))
  );
}

// Check if all numbers are marked
function checkBingo(numbers: (number | null)[], drawnNumbers: number[]): boolean {
  return numbers.every(num => num === null || drawnNumbers.includes(num));
}
```

**Time Complexity**:

- `checkLine`: O(27) worst case
- `checkBingo`: O(27) always

## File Formats

### .bingoCards Format

**Purpose**: Persistent storage and exchange of bingo card sets

**Structure**:

```text
|CardNo.1;num1;num2;num3;...;num27|CardNo.2;num1;num2;...
```

**Details**:

- Cards separated by pipe (`|`) characters
- Each card starts with `CardNo.{number}`
- Numbers separated by semicolons (`;`)
- Empty cells represented by empty strings (`;;`)
- Total of 27 numbers per card (including nulls)

**Example**:

```text
|CardNo.1;1;;3;;5;6;;8;9;10;;12;;14;15;;17;18;19;;21;;23;24;;26;27|CardNo.2;2;11;;23;...
```

**Parsing**: See `parseBingoCards()` in `utils.ts`
**Export**: See `exportBingoGame()` in `FileUpload.tsx`

### PDF Format

**Structure**:

- A4 page size, portrait orientation
- 1-3 cards per page (configurable)
- Event header at top
- Location footer at bottom
- Cards rendered as PNG images

**Generation Process**:

1. Convert each card DOM element to PNG (html-to-image)
2. Batch process images in parallel (100 at a time)
3. Assemble images into PDF pages (jsPDF)
4. Add text headers/footers
5. Save as downloadable file

## Performance Considerations

### Card Generation

- **Current**: ~1000 cards in < 1 second
- **Optimization**: Hash-based duplicate detection (O(1) lookup)
- **Memory**: ~1KB per card in memory

### PDF Generation

- **Current**: ~1000 cards in ~5-10 seconds
- **Optimizations**:
  - Parallel batch processing (100 cards per batch)
  - Reduced image quality (0.7) for speed
  - Fast PDF compression mode
  - Progress tracking for UX feedback
- **Memory**: Images are generated and added sequentially to avoid memory overflow

### Game State

- **localStorage**: Persists game state (~10KB typical)
- **Animations**: Throttled to prevent overlapping draws
- **Re-renders**: Optimized with `useCallback` and `useMemo` where needed

## Progressive Web App (PWA) Features

The application implements comprehensive PWA functionality for an enhanced offline-first experience.

### Service Worker Configuration

The service worker is configured using `next-pwa` with multiple caching strategies:

```typescript
// next.config.ts
runtimeCaching: [
  // API calls - NetworkFirst with timeout
  { 
    urlPattern: /^https?.*\/api\/.*/i,
    handler: 'NetworkFirst',
    networkTimeoutSeconds: 10,
    maxAgeSeconds: 5 * 60  // 5 minutes
  },
  // Images - CacheFirst for performance
  {
    urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
    handler: 'CacheFirst',
    maxAgeSeconds: 30 * 24 * 60 * 60  // 30 days
  },
  // Static resources - CacheFirst
  {
    urlPattern: /\.(?:js|css|woff|woff2|ttf|otf)$/i,
    handler: 'CacheFirst',
    maxAgeSeconds: 7 * 24 * 60 * 60  // 7 days
  }
]
```

### Background Sync

**Hook**: `useBackgroundSync`

Enables deferred actions until network connection is stable:

```typescript
const { isSupported, registerSync, isSyncing } = useBackgroundSync();

// Register a background sync
await registerSync('sync-game-state');
```

**Use Cases**:

- Syncing game state when connection is restored
- Uploading analytics data in the background
- Retrying failed operations automatically

### Service Worker Lifecycle

**Component**: `PWARegister`

Manages service worker registration and updates:

```typescript
// Automatic update detection
registration.addEventListener('updatefound', () => {
  // Show update notification to user
});

// Check for updates when page becomes visible
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    registration.update();
  }
});
```

### Manifest Configuration

The Web App Manifest (`public/manifest.json`) defines:

- **App Identity**: Name, short name, description
- **Display Mode**: Standalone for app-like experience
- **Theme Colors**: Brand colors for native UI integration
- **Icons**: Multiple sizes for different devices (192x192, 384x384, 512x512)
- **Shortcuts**: Quick actions for generating cards or playing game
- **Categories**: Games, entertainment, utilities

### Caching Strategy

The application uses a tiered caching approach:

1. **Precaching**: Critical assets cached during service worker installation
2. **Runtime Caching**: Dynamic content cached based on usage patterns
3. **Cache Expiration**: Automatic cleanup of old cache entries
4. **Network Timeout**: Fallback to cache if network is slow (10s timeout)

### Offline Functionality

All core features work offline after initial load:

- ✅ Card generation (client-side algorithm)
- ✅ PDF export (client-side rendering)
- ✅ Game playing (localStorage-based state)
- ✅ Card validation
- ✅ File import/export
- ⚠️ Internationalization (requires initial load for translations)

### Browser Support

PWA features are progressively enhanced:

- **Service Worker**: Modern browsers (Chrome, Firefox, Safari, Edge)
- **Background Sync**: Chrome, Edge (not Safari)
- **App Installation**: All modern browsers with PWA support

The application gracefully degrades on browsers without PWA support, maintaining core functionality.

## Security Considerations

### Input Validation

- **File Upload**: Validate `.bingoCards` extension before parsing
- **Card Numbers**: Integer parsing with bounds checking
- **User Input**: Sanitized before display (React auto-escaping)

### Data Storage

- **localStorage**: Only stores non-sensitive game data
- **No Secrets**: No API keys or credentials in client code
- **CSP**: Content Security Policy configured in Next.js

### Dependencies

- **Regular Updates**: Dependencies updated for security patches
- **CodeQL**: Automated security scanning in CI/CD
- **Vulnerability Checks**: `npm audit` in development

## Future Enhancements

### Planned Features

1. **TypeDoc Integration**: Auto-generate HTML documentation from JSDoc
2. **Component Documentation**: Storybook for component showcase
3. **Themes**: Dark mode and custom color themes
4. **Internationalization**: Multi-language support
5. **Mobile Optimization**: Enhanced mobile game experience
6. **Online Multiplayer**: Real-time game synchronization
7. **Statistics**: Game analytics and card usage tracking
8. **Custom Card Templates**: User-defined card layouts

### Technical Improvements

1. **Web Workers**: Offload PDF generation to background thread
2. **Service Workers**: ✅ **IMPLEMENTED** - Enhanced offline functionality with background sync
   - Multiple caching strategies (CacheFirst, NetworkFirst)
   - Background sync for deferred operations
   - Automatic service worker updates
   - Automatic service worker updates
3. **WebRTC**: Peer-to-peer game hosting
4. **IndexedDB**: Replace localStorage for larger datasets
5. **Virtual Scrolling**: Optimize rendering of large card lists
6. **Tree-Shaking**: Further reduce bundle size

---

## Contributing to Architecture

When proposing architectural changes:

1. **Document the Change**: Update this file with new patterns
2. **Discuss Trade-offs**: Consider performance, maintainability, and complexity
3. **Update Diagrams**: Keep visual representations current
4. **Test Impact**: Verify performance benchmarks
5. **Review Security**: Consider security implications

For questions or discussions, see [CONTRIBUTING.md](./CONTRIBUTING.md).

---

**Last Updated**: 2024-10-12  
**Version**: 1.0.0
