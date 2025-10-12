import React from 'react';
import { render, screen } from '@testing-library/react';
import Navbar from './Navbar';
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
    
    expect(screen.getByText('common.cardGenerator')).toBeInTheDocument();
    expect(screen.getByText('common.playGame')).toBeInTheDocument();
  });

  it('should have correct href attributes', () => {
    render(<Navbar />);
    
    const cardGeneratorLink = screen.getByText('common.cardGenerator').closest('a');
    const playGameLink = screen.getByText('common.playGame').closest('a');
    
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
});
