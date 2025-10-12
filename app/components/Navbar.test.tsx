import React from 'react';
import { render, screen } from '@testing-library/react';
import Navbar from './Navbar';

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

  it('should render three navigation items (two links + theme toggle)', () => {
    const { container } = render(<Navbar />);
    
    const navItems = container.querySelectorAll('li');
    expect(navItems).toHaveLength(3);
  });
});
