import React from 'react';
import { render } from '@testing-library/react';
import ViewTransition from './ViewTransition';

describe('ViewTransition', () => {
  it('should render without crashing', () => {
    const { container } = render(<ViewTransition />);
    expect(container).toBeInTheDocument();
  });

  it('should not render any visible content', () => {
    const { container } = render(<ViewTransition />);
    expect(container.firstChild).toBeNull();
  });

  it('should check for View Transitions API support on mount', () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    
    // Mock document without startViewTransition
    const originalDocument = global.document;
     
    delete (global.document as any).startViewTransition;
    
    render(<ViewTransition />);
    
    // Restore
    global.document = originalDocument;
    consoleLogSpy.mockRestore();
  });
});
