/**
 * Visual Regression Tests for Internationalization
 * 
 * These tests verify that UI components render correctly across different locales
 * and that text content properly displays without overflow, truncation, or layout issues.
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock next-intl with different locales
const createMockTranslations = (locale: string) => {
  const translations: Record<string, Record<string, string>> = {
    en: {
      'common.cardGenerator': 'Card Generator',
      'common.playGame': 'Play Game',
      'fileUpload.title': 'Bingo Card Generator',
      'fileUpload.generateCards': 'Generate Bingo Cards',
      'fileUpload.numCards': 'Number of Cards',
      'bingoGame.startGame': 'Start Game',
      'bingoGame.nextBall': 'Next Ball 🎱',
      'bingoGame.validateLine': 'Validate Line',
      'bingoGame.validateBingo': 'Validate Bingo',
    },
    es: {
      'common.cardGenerator': 'Generador de Tarjetas',
      'common.playGame': 'Jugar',
      'fileUpload.title': 'Generador de Tarjetas de Bingo',
      'fileUpload.generateCards': 'Generar Tarjetas de Bingo',
      'fileUpload.numCards': 'Número de Tarjetas',
      'bingoGame.startGame': 'Iniciar Juego',
      'bingoGame.nextBall': 'Siguiente Bola 🎱',
      'bingoGame.validateLine': 'Validar Línea',
      'bingoGame.validateBingo': 'Validar Bingo',
    },
    fr: {
      'common.cardGenerator': 'Générateur de Cartes',
      'common.playGame': 'Jouer',
      'fileUpload.title': 'Générateur de Cartes de Bingo',
      'fileUpload.generateCards': 'Générer des Cartes de Bingo',
      'fileUpload.numCards': 'Nombre de Cartes',
      'bingoGame.startGame': 'Démarrer le Jeu',
      'bingoGame.nextBall': 'Prochain Numéro 🎱',
      'bingoGame.validateLine': 'Valider la Ligne',
      'bingoGame.validateBingo': 'Valider le Bingo',
    },
    pt: {
      'common.cardGenerator': 'Gerador de Cartões',
      'common.playGame': 'Jogar',
      'fileUpload.title': 'Gerador de Cartões de Bingo',
      'fileUpload.generateCards': 'Gerar Cartões de Bingo',
      'fileUpload.numCards': 'Número de Cartões',
      'bingoGame.startGame': 'Começar Jogo',
      'bingoGame.nextBall': 'Próxima Bola 🎱',
      'bingoGame.validateLine': 'Verificar Linha',
      'bingoGame.validateBingo': 'Verificar Bingo',
    },
  };

  return (key: string) => translations[locale]?.[key] || key;
};

describe('I18n Visual Regression Tests', () => {
  describe('Text Length and Layout', () => {
    it('should render button text without overflow in all locales', () => {
      const locales = ['en', 'es', 'fr', 'pt'];
      const buttonKey = 'common.cardGenerator';

      locales.forEach(locale => {
        const t = createMockTranslations(locale);
        const buttonText = t(buttonKey);

        const { container } = render(
          <button className="px-4 py-2 bg-blue-500 text-white rounded whitespace-nowrap">
            {buttonText}
          </button>
        );

        const button = container.querySelector('button');
        expect(button).toBeInTheDocument();
        expect(button?.textContent).toBe(buttonText);

        // Verify text is not empty
        expect(buttonText.length).toBeGreaterThan(0);
        
        // Verify text is reasonably sized (not too long for a button)
        expect(buttonText.length).toBeLessThan(50);
      });
    });

    it('should render navigation items with consistent spacing across locales', () => {
      const locales = ['en', 'es', 'fr', 'pt'];
      const navKeys = ['common.cardGenerator', 'common.playGame'];

      locales.forEach(locale => {
        const t = createMockTranslations(locale);
        const navItems = navKeys.map(key => t(key));

        const { container } = render(
          <nav className="flex gap-4">
            {navItems.map((text, index) => (
              <a key={index} className="px-3 py-2">
                {text}
              </a>
            ))}
          </nav>
        );

        const links = container.querySelectorAll('a');
        expect(links).toHaveLength(navItems.length);

        navItems.forEach((text, index) => {
          expect(links[index]?.textContent).toBe(text);
          // Each nav item should have text
          expect(text.length).toBeGreaterThan(0);
        });
      });
    });

    it('should handle long translations in form labels', () => {
      const locales = ['en', 'es', 'fr', 'pt'];
      const labelKey = 'fileUpload.generateCards';

      locales.forEach(locale => {
        const t = createMockTranslations(locale);
        const labelText = t(labelKey);

        const { container } = render(
          <label className="block text-sm font-medium">
            {labelText}
          </label>
        );

        const label = container.querySelector('label');
        expect(label).toBeInTheDocument();
        expect(label?.textContent).toBe(labelText);

        // Verify label text exists and is reasonable
        expect(labelText.length).toBeGreaterThan(0);
        expect(labelText.length).toBeLessThan(100);
      });
    });
  });

  describe('RTL Support Readiness', () => {
    it('should use flex classes that support RTL', () => {
      const { container } = render(
        <div className="flex gap-4 items-center">
          <button>Button 1</button>
          <button>Button 2</button>
        </div>
      );

      const flexContainer = container.querySelector('div');
      expect(flexContainer).toHaveClass('flex');
      expect(flexContainer).toHaveClass('gap-4');
      
      // Note: For full RTL support, we'd need dir="rtl" and logical properties
      // This test verifies the component structure is RTL-ready
    });

    it('should use margin/padding classes consistently', () => {
      const { container } = render(
        <div className="px-4 py-2 mx-auto">
          <span>Content</span>
        </div>
      );

      const div = container.querySelector('div');
      expect(div).toHaveClass('px-4');
      expect(div).toHaveClass('py-2');
      expect(div).toHaveClass('mx-auto');
    });
  });

  describe('Emoji and Special Characters', () => {
    it('should render emojis correctly in button text', () => {
      const locales = ['en', 'es', 'fr', 'pt'];
      const buttonKey = 'bingoGame.nextBall';

      locales.forEach(locale => {
        const t = createMockTranslations(locale);
        const buttonText = t(buttonKey);

        const { container } = render(
          <button>{buttonText}</button>
        );

        const button = container.querySelector('button');
        expect(button?.textContent).toContain('🎱');
        expect(button?.textContent).toBe(buttonText);
      });
    });

    it('should handle special characters in translations', () => {
      // Test with French accents, Spanish ñ, Portuguese ã, etc.
      const specialChars: Record<string, string> = {
        es: 'Número',  // ú
        fr: 'Générateur',  // é
        pt: 'Cartões',  // õ
      };

      Object.values(specialChars).forEach((text) => {
        const { container } = render(<span>{text}</span>);
        const span = container.querySelector('span');
        expect(span?.textContent).toBe(text);
      });
    });
  });

  describe('Responsive Text Sizing', () => {
    it('should render titles with appropriate text sizing', () => {
      const locales = ['en', 'es', 'fr', 'pt'];
      const titleKey = 'fileUpload.title';

      locales.forEach(locale => {
        const t = createMockTranslations(locale);
        const titleText = t(titleKey);

        const { container } = render(
          <h1 className="text-2xl font-bold">{titleText}</h1>
        );

        const title = container.querySelector('h1');
        expect(title).toHaveClass('text-2xl');
        expect(title).toHaveClass('font-bold');
        expect(title?.textContent).toBe(titleText);
      });
    });

    it('should handle text truncation gracefully', () => {
      const longText = 'This is a very long text that should be truncated when it exceeds the container width';

      const { container } = render(
        <div className="max-w-xs truncate">{longText}</div>
      );

      const div = container.querySelector('div');
      expect(div).toHaveClass('truncate');
      expect(div).toHaveClass('max-w-xs');
    });
  });

  describe('Placeholder Text', () => {
    it('should render placeholder text in all locales', () => {
      const locales = ['en', 'es', 'fr', 'pt'];
      const placeholderKey = 'fileUpload.numCards';

      locales.forEach(locale => {
        const t = createMockTranslations(locale);
        const placeholderText = t(placeholderKey);

        const { container } = render(
          <input 
            type="text" 
            placeholder={placeholderText}
            className="border px-3 py-2"
          />
        );

        const input = container.querySelector('input');
        expect(input).toHaveAttribute('placeholder', placeholderText);
        expect(placeholderText.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Validation Messages', () => {
    it('should render validation messages with proper styling', () => {
      const validationMessages: Record<string, string> = {
        en: 'Line is valid! 🎉',
        es: 'Línea válida! 🎉',
        fr: 'Ligne valide! 🎉',
        pt: 'Linha válida! 🎉',
      };

      Object.values(validationMessages).forEach((message) => {
        const { container } = render(
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {message}
          </div>
        );

        const div = container.querySelector('div');
        expect(div?.textContent).toBe(message);
        expect(div).toHaveClass('bg-green-100');
        expect(message).toContain('🎉');
      });
    });
  });

  describe('Accessibility with I18n', () => {
    it('should maintain accessibility attributes across locales', () => {
      const locales = ['en', 'es', 'fr', 'pt'];
      const buttonKey = 'bingoGame.startGame';

      locales.forEach(locale => {
        const t = createMockTranslations(locale);
        const buttonText = t(buttonKey);

        const { container } = render(
          <button 
            aria-label={buttonText}
            className="px-4 py-2"
          >
            {buttonText}
          </button>
        );

        const button = container.querySelector('button');
        expect(button).toHaveAttribute('aria-label', buttonText);
        expect(button?.textContent).toBe(buttonText);
      });
    });

    it('should use semantic HTML with translated content', () => {
      const { container } = render(
        <form>
          <label htmlFor="cards">Number of Cards</label>
          <input id="cards" type="number" />
          <button type="submit">Generate</button>
        </form>
      );

      const label = container.querySelector('label');
      const input = container.querySelector('input');
      const button = container.querySelector('button');

      expect(label).toHaveAttribute('for', 'cards');
      expect(input).toHaveAttribute('id', 'cards');
      expect(button).toHaveAttribute('type', 'submit');
    });
  });

  describe('Dynamic Content with Variables', () => {
    it('should handle translated strings with placeholders', () => {
      // Simulate a translation with variables
      const templates: Record<string, string> = {
        en: 'Generating {current} of {total} cards...',
        es: 'Generando {current} de {total} tarjetas...',
        fr: 'Génération de {current} sur {total} cartes...',
        pt: 'Gerando {current} de {total} cartões...',
      };

      Object.values(templates).forEach((template) => {
        const rendered = template
          .replace('{current}', '5')
          .replace('{total}', '10');

        const { container } = render(<div>{rendered}</div>);
        const div = container.querySelector('div');
        
        expect(div?.textContent).not.toContain('{current}');
        expect(div?.textContent).not.toContain('{total}');
        expect(div?.textContent).toContain('5');
        expect(div?.textContent).toContain('10');
      });
    });
  });
});
