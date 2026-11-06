import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeSelector } from './ThemeSelector';
import { ThemeProvider } from './ThemeProvider';
import { PRESET_THEMES } from '../utils/themes';
const showSuccess = jest.fn(), showWarning = jest.fn(), showError = jest.fn();
jest.mock('./ToastProvider', () => ({ useToast: () => ({ showSuccess, showWarning, showError }) }));
function show() { return render(<ThemeProvider><ThemeSelector /></ThemeProvider>); }
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
beforeEach(() => { localStorage.clear(); jest.clearAllMocks(); jest.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => jest.restoreAllMocks());
it('selects every preset, exports the current theme and releases the download URL', () => {
  show();
  Object.values(PRESET_THEMES).forEach(theme => { click(theme.name); expect(localStorage.getItem('selectedBingoTheme')).toBe(Object.keys(PRESET_THEMES).find(key => PRESET_THEMES[key] === theme)); });
  URL.createObjectURL = jest.fn(() => 'blob:theme'); URL.revokeObjectURL = jest.fn();
  const anchor = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { expect(this.download).toBe('kids-theme.json'); });
  click('Export Current Theme');
  expect(anchor).toHaveBeenCalled(); expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:theme');
  expect(document.querySelector('a[download]')).toBeNull();
});
it('validates imports, allows cancellation and imports a valid theme', () => {
  show(); click('Import Theme'); click('Import');
  expect(showWarning).toHaveBeenCalledWith('Please paste theme JSON');
  fireEvent.change(screen.getByPlaceholderText('Paste theme JSON here...'), { target: { value: '{}' } }); click('Import');
  expect(showError).toHaveBeenCalledWith('Invalid theme JSON. Please check the format.');
  click('Cancel'); expect(screen.queryByPlaceholderText('Paste theme JSON here...')).toBeNull();
  click('Import Theme');
  fireEvent.change(screen.getByPlaceholderText('Paste theme JSON here...'), { target: { value: JSON.stringify({ ...PRESET_THEMES.dark, name: 'Imported' }) } }); click('Import');
  expect(screen.getByRole('button', { name: 'Imported' })).toBeInTheDocument();
  expect(showSuccess).toHaveBeenCalledWith('Theme imported successfully!');
});
it('creates a named theme with each editable color and geometry field, then resets cancelled edits', () => {
  show(); click('Create Custom Theme'); click('Save Custom Theme');
  expect(showWarning).toHaveBeenCalledWith('Please enter a theme name');
  fireEvent.change(screen.getByLabelText('Theme Name'), { target: { value: '  Evening  ' } });
  for (const label of ['Primary Color (Cell Background)', 'Secondary Color (Border)', 'Text Color', 'Background Color (Empty Cells)']) fireEvent.change(screen.getByLabelText(label), { target: { value: '#123456' } });
  fireEvent.change(screen.getByLabelText('Font Family'), { target: { value: 'serif' } });
  fireEvent.change(screen.getByLabelText('Border Radius'), { target: { value: '2px' } });
  fireEvent.change(screen.getByLabelText('Border Width'), { target: { value: '3px' } });
  expect(screen.getByText('42')).toHaveStyle({ backgroundColor: '#123456', borderWidth: '3px' });
  click('Save Custom Theme');
  const saved = Object.values(JSON.parse(localStorage.getItem('bingoCardThemes')!))[0];
  expect(saved).toMatchObject({ name: 'Evening', primaryColor: '#123456', secondaryColor: '#123456', textColor: '#123456', backgroundColor: '#123456', fontFamily: 'serif', borderRadius: '2px', borderWidth: '3px' });
  click('Create Custom Theme'); fireEvent.change(screen.getByLabelText('Theme Name'), { target: { value: 'discard' } }); click('Cancel'); click('Create Custom Theme');
  expect(screen.getByLabelText('Theme Name')).toHaveValue(''); click('Hide Custom Theme');
});
it('falls back to the selected theme when editable fields are cleared', () => {
  show(); click('Create Custom Theme');
  fireEvent.change(screen.getByLabelText('Theme Name'), { target: { value: 'Fallback' } });
  // Color text entries permit clearing, unlike the browser color picker.
  const fields = screen.getAllByRole('textbox').filter(input => input.id !== 'theme-name');
  fields.forEach(input => fireEvent.change(input, { target: { value: '' } }));
  click('Save Custom Theme');
  expect(Object.values(JSON.parse(localStorage.getItem('bingoCardThemes')!))[0]).toEqual({ ...PRESET_THEMES.classic, name: 'Fallback' });
});
it('requires confirmation before deleting a custom theme and permits cancellation', () => {
  localStorage.setItem('bingoCardThemes', JSON.stringify({ custom: { ...PRESET_THEMES.dark, name: 'Saved' } }));
  show(); click('Saved'); fireEvent.click(screen.getByTitle('Delete theme'));
  expect(screen.getByText(/Are you sure you want to delete the theme "Saved"/)).toBeInTheDocument();
  click('Cancel and close dialog'); expect(screen.getByRole('button', { name: 'Saved' })).toBeInTheDocument();
  fireEvent.click(screen.getByTitle('Delete theme')); click('Confirm: Delete Theme');
  expect(screen.queryByRole('button', { name: 'Saved' })).toBeNull();
  expect(showSuccess).toHaveBeenCalledWith('Theme deleted successfully!');
});
