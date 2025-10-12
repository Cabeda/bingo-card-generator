# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Performance optimizations for PDF generation
- Progress indicator with estimated time remaining
- Console logging for PDF generation timing

### Changed

- Removed motion animations for faster rendering
- Increased batch size from 5 to 10 cards
- Reduced image quality from 1.0 to 0.95

### Fixed

- Cards not rendering in PDF when generating large numbers
- PDF generation hanging on completion

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
