import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageSelector } from './LanguageSelector';

// Mock next-intl
const mockReplace = jest.fn();
const mockUseLocale = jest.fn();

jest.mock('next-intl', () => ({
  useLocale: () => mockUseLocale(),
}));

// Mock routing module
jest.mock('../routing', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
  usePathname: () => '/test-path',
  routing: {
    locales: ['en', 'pt', 'es', 'fr'],
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('LanguageSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    mockUseLocale.mockReturnValue('en');
  });

  it('should render with current locale selected', () => {
    mockUseLocale.mockReturnValue('en');
    render(<LanguageSelector />);
    
    const select = screen.getByRole('combobox', { name: /select language/i }) as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.value).toBe('en');
  });

  it('should render all available locales as options', () => {
    render(<LanguageSelector />);
    
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(4);
    
    // Check that all locales are present
    expect(screen.getByRole('option', { name: /🇬🇧 EN/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /🇵🇹 PT/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /🇪🇸 ES/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /🇫🇷 FR/i })).toBeInTheDocument();
  });

  it('should change language when a different locale is selected', () => {
    render(<LanguageSelector />);
    
    const select = screen.getByRole('combobox', { name: /select language/i });
    
    // Change to Portuguese
    fireEvent.change(select, { target: { value: 'pt' } });
    
    expect(mockReplace).toHaveBeenCalledWith('/test-path', { locale: 'pt' });
    expect(localStorageMock.getItem('preferred-locale')).toBe('pt');
  });

  it('should store language preference in localStorage', () => {
    render(<LanguageSelector />);
    
    const select = screen.getByRole('combobox', { name: /select language/i });
    
    // Test each language
    fireEvent.change(select, { target: { value: 'es' } });
    expect(localStorageMock.getItem('preferred-locale')).toBe('es');
    
    fireEvent.change(select, { target: { value: 'fr' } });
    expect(localStorageMock.getItem('preferred-locale')).toBe('fr');
  });

  it('should use router.replace with correct pathname and locale', () => {
    render(<LanguageSelector />);
    
    const select = screen.getByRole('combobox', { name: /select language/i });
    
    fireEvent.change(select, { target: { value: 'fr' } });
    
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/test-path', { locale: 'fr' });
  });

  it('should render with Portuguese locale', () => {
    mockUseLocale.mockReturnValue('pt');
    render(<LanguageSelector />);
    
    const select = screen.getByRole('combobox', { name: /select language/i }) as HTMLSelectElement;
    expect(select.value).toBe('pt');
  });

  it('should render with Spanish locale', () => {
    mockUseLocale.mockReturnValue('es');
    render(<LanguageSelector />);
    
    const select = screen.getByRole('combobox', { name: /select language/i }) as HTMLSelectElement;
    expect(select.value).toBe('es');
  });

  it('should render with French locale', () => {
    mockUseLocale.mockReturnValue('fr');
    render(<LanguageSelector />);
    
    const select = screen.getByRole('combobox', { name: /select language/i }) as HTMLSelectElement;
    expect(select.value).toBe('fr');
  });

  it('should have accessible label', () => {
    render(<LanguageSelector />);
    
    const select = screen.getByLabelText(/select language/i);
    expect(select).toBeInTheDocument();
  });

  it('should call router.replace when changing from English to each language', () => {
    mockUseLocale.mockReturnValue('en');
    render(<LanguageSelector />);
    
    const select = screen.getByRole('combobox', { name: /select language/i });
    
    // Test changing to each language
    const locales = ['pt', 'es', 'fr'];
    locales.forEach((locale, index) => {
      fireEvent.change(select, { target: { value: locale } });
      expect(mockReplace).toHaveBeenCalledWith('/test-path', { locale });
      expect(mockReplace).toHaveBeenCalledTimes(index + 1);
    });
  });

  it('should update localStorage for each language selection', () => {
    render(<LanguageSelector />);
    
    const select = screen.getByRole('combobox', { name: /select language/i });
    
    // Test all languages
    fireEvent.change(select, { target: { value: 'en' } });
    expect(localStorageMock.getItem('preferred-locale')).toBe('en');
    
    fireEvent.change(select, { target: { value: 'pt' } });
    expect(localStorageMock.getItem('preferred-locale')).toBe('pt');
    
    fireEvent.change(select, { target: { value: 'es' } });
    expect(localStorageMock.getItem('preferred-locale')).toBe('es');
    
    fireEvent.change(select, { target: { value: 'fr' } });
    expect(localStorageMock.getItem('preferred-locale')).toBe('fr');
  });
});
