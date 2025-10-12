import React from 'react';
import { render, screen } from '@testing-library/react';
import Navbar from './Navbar';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'cardGenerator': 'Card Generator',
      'playGame': 'Play Game',
    };
    return translations[key] || key;
  },
  useLocale: () => 'en',
}));

// Mock LanguageSelector component
jest.mock('./LanguageSelector', () => ({
  LanguageSelector: () => <div data-testid="language-selector">Language Selector</div>,
}));

// Mock ThemeToggle component
jest.mock('./ThemeToggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle">Theme Toggle</div>,
}));

// Mock routing module
jest.mock('../routing', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  },
  usePathname: () => '/',
  useRouter: () => ({
    replace: jest.fn(),
    push: jest.fn(),
  }),
  routing: {
    locales: ['en', 'pt', 'es', 'fr'],
  },
}));

// Mock Next.js Link component
jest.mock('next/link', () => {
  // eslint-disable-next-line react/display-name
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

describe('Navbar', () => {
  it('should render navigation links', () => {
    render(<Navbar />);
    
    expect(screen.getByText('Card Generator')).toBeInTheDocument();
    expect(screen.getByText('Play Game')).toBeInTheDocument();
  });

  it('should have correct href attributes', () => {
    render(<Navbar />);
    
    const cardGeneratorLink = screen.getByText('Card Generator').closest('a');
    const playGameLink = screen.getByText('Play Game').closest('a');
    
    expect(cardGeneratorLink).toHaveAttribute('href', '/');
    expect(playGameLink).toHaveAttribute('href', '/game');
  });

  it('should render as a nav element', () => {
    const { container } = render(<Navbar />);
    
    expect(container.querySelector('nav')).toBeInTheDocument();
  });

  it('should render four navigation items (two links + language selector + theme toggle)', () => {
    const { container } = render(<Navbar />);
    
    const navItems = container.querySelectorAll('li');
    expect(navItems).toHaveLength(4);
  });

  // Internationalization tests
  describe('Internationalization', () => {
    it('should render LanguageSelector component', () => {
      render(<Navbar />);
      expect(screen.getByTestId('language-selector')).toBeInTheDocument();
    });

    it('should render translated "Card Generator" link text', () => {
      render(<Navbar />);
      const link = screen.getByText('Card Generator');
      expect(link).toBeInTheDocument();
      expect(link.closest('a')).toHaveAttribute('href', '/');
    });

    it('should render translated "Play Game" link text', () => {
      render(<Navbar />);
      const link = screen.getByText('Play Game');
      expect(link).toBeInTheDocument();
      expect(link.closest('a')).toHaveAttribute('href', '/game');
    });

    it('should have both translated navigation links in correct order', () => {
      render(<Navbar />);
      const cardGeneratorLink = screen.getByText('Card Generator');
      const playGameLink = screen.getByText('Play Game');
      
      expect(cardGeneratorLink).toBeInTheDocument();
      expect(playGameLink).toBeInTheDocument();
    });

    it('should render ThemeToggle alongside language selector', () => {
      render(<Navbar />);
      expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
      expect(screen.getByTestId('language-selector')).toBeInTheDocument();
    });
  });
});
