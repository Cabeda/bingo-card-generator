import '@testing-library/jest-dom';
import { TextDecoder, TextEncoder } from 'util';

// Polyfill for TextEncoder/TextDecoder (only for test environment)
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder as unknown as typeof global.TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder as unknown as typeof global.TextDecoder;
}

// Setup DOM environment for testing hooks
beforeEach(() => {
  // Create a root container for React to render into
  const container = document.createElement('div');
  container.setAttribute('id', 'root');
  document.body.appendChild(container);
});

afterEach(() => {
  // Clean up after each test
  const container = document.getElementById('root');
  if (container) {
    document.body.removeChild(container);
  }
});
