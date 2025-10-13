# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Quality mode selector (Fast/Balanced/High Quality) for PDF generation
- Cancel button for long-running PDF generation operations
- Estimated time remaining display during PDF generation
- Configurable quality settings with optimized batch sizes per mode
- Translation keys for new quality modes and cancel functionality in all languages (en, pt, es, fr)

### Changed

- Reduced default pixelRatio from 2 to 1.5 for faster PDF generation (Balanced mode)
- Optimized batch sizes: Fast mode (50 cards), Balanced mode (30 cards), High Quality mode (20 cards)
- Improved quality settings: Fast (0.5), Balanced (0.7), High (0.95)
- Enhanced progress indicator to show estimated completion time

### Performance

- PDF generation is approximately 30-50% faster with default Balanced mode
- Fast mode provides even greater speed improvements (60%+ faster) with acceptable quality
- High Quality mode maintains previous quality standards for users requiring maximum fidelity

## [0.1.0] - 2025-10-12

### Added

- Initial release
- Random bingo card generation
- PDF export functionality
- Custom .bingoCards format export
- File upload for .bingoCards files
- Interactive bingo game mode
- Number drawing with animations
- Game state persistence in localStorage
- Winner validation (lines and full card)
- Audio effects and text-to-speech
- Responsive design with TailwindCSS

[Unreleased]: https://github.com/Cabeda/bingo-card-generator/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Cabeda/bingo-card-generator/releases/tag/v0.1.0
