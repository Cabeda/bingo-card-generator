'use client';

import React, { useState } from 'react';
import { useCardTheme } from './ThemeProvider';
import { useToast } from './ToastProvider';
import { ConfirmDialog } from './ConfirmDialog';
import { getPresetThemeNames, PRESET_THEMES } from '../utils/themes';
import { CardTheme } from '../utils/bingo.interface';
import styles from './ThemeSelector.module.css';

/**
 * ThemeSelector component for selecting and managing bingo card themes.
 * 
 * Features:
 * - Preset theme selection
 * - Custom theme builder with color pickers
 * - Theme preview
 * - Export/Import themes
 * - Delete custom themes
 * 
 * @component
 */
export function ThemeSelector(): React.JSX.Element {
  const {
    currentTheme,
    selectedThemeKey,
    customThemes,
    setTheme,
    setCustomTheme,
    deleteCustomTheme,
    exportTheme,
    importTheme,
  } = useCardTheme();

  const { showSuccess, showError, showWarning } = useToast();

  const [showCustomBuilder, setShowCustomBuilder] = useState(false);
  const [customThemeData, setCustomThemeData] = useState<Partial<CardTheme>>({
    name: '',
    primaryColor: currentTheme.primaryColor,
    secondaryColor: currentTheme.secondaryColor,
    textColor: currentTheme.textColor,
    backgroundColor: currentTheme.backgroundColor,
    fontFamily: currentTheme.fontFamily,
    borderRadius: currentTheme.borderRadius,
    borderWidth: currentTheme.borderWidth,
    cellPadding: currentTheme.cellPadding,
  });

  const [importInput, setImportInput] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [themeToDelete, setThemeToDelete] = useState<{ key: string; name: string } | null>(null);

  const handlePresetSelect = (key: string): void => {
    setTheme(key);
  };

  const handleCustomThemeChange = (field: keyof CardTheme, value: string): void => {
    setCustomThemeData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveCustomTheme = (): void => {
    if (!customThemeData.name?.trim()) {
      showWarning('Please enter a theme name');
      return;
    }

    const theme: CardTheme = {
      name: customThemeData.name.trim(),
      primaryColor: customThemeData.primaryColor || currentTheme.primaryColor,
      secondaryColor: customThemeData.secondaryColor || currentTheme.secondaryColor,
      textColor: customThemeData.textColor || currentTheme.textColor,
      backgroundColor: customThemeData.backgroundColor || currentTheme.backgroundColor,
      fontFamily: customThemeData.fontFamily || currentTheme.fontFamily,
      borderRadius: customThemeData.borderRadius || currentTheme.borderRadius,
      borderWidth: customThemeData.borderWidth || currentTheme.borderWidth,
      cellPadding: customThemeData.cellPadding || currentTheme.cellPadding,
    };

    setCustomTheme(theme);
    showSuccess('Custom theme saved successfully!');
    setShowCustomBuilder(false);
    setCustomThemeData({
      name: '',
      primaryColor: currentTheme.primaryColor,
      secondaryColor: currentTheme.secondaryColor,
      textColor: currentTheme.textColor,
      backgroundColor: currentTheme.backgroundColor,
      fontFamily: currentTheme.fontFamily,
      borderRadius: currentTheme.borderRadius,
      borderWidth: currentTheme.borderWidth,
      cellPadding: currentTheme.cellPadding,
    });
  };

  const handleExportTheme = (): void => {
    const json = exportTheme(currentTheme);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentTheme.name.toLowerCase().replace(/\s+/g, '-')}-theme.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportTheme = (): void => {
    if (!importInput.trim()) {
      showWarning('Please paste theme JSON');
      return;
    }

    const success = importTheme(importInput);
    if (success) {
      showSuccess('Theme imported successfully!');
      setImportInput('');
      setShowImport(false);
    } else {
      showError('Invalid theme JSON. Please check the format.');
    }
  };

  const handleDeleteClick = (key: string, name: string): void => {
    setThemeToDelete({ key, name });
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = (): void => {
    if (themeToDelete) {
      deleteCustomTheme(themeToDelete.key);
      showSuccess('Theme deleted successfully!');
      setShowDeleteConfirm(false);
      setThemeToDelete(null);
    }
  };

  const handleCancelDelete = (): void => {
    setShowDeleteConfirm(false);
    setThemeToDelete(null);
  };

  const presetThemeKeys = getPresetThemeNames();
  const customThemeKeys = Object.keys(customThemes);

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Card Theme</h3>

      {/* Preset Themes */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Preset Themes</h4>
        <div className={styles.themeGrid}>
          {presetThemeKeys.map(key => (
            <button
              key={key}
              className={`${styles.themeButton} ${selectedThemeKey === key ? styles.selected : ''}`}
              onClick={() => handlePresetSelect(key)}
              style={{
                backgroundColor: PRESET_THEMES[key].primaryColor,
                color: PRESET_THEMES[key].textColor,
                borderColor: PRESET_THEMES[key].secondaryColor,
              }}
            >
              {PRESET_THEMES[key].name}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Themes */}
      {customThemeKeys.length > 0 && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Custom Themes</h4>
          <div className={styles.themeGrid}>
            {customThemeKeys.map(key => (
              <div key={key} className={styles.customThemeItem}>
                <button
                  className={`${styles.themeButton} ${selectedThemeKey === key ? styles.selected : ''}`}
                  onClick={() => handlePresetSelect(key)}
                  style={{
                    backgroundColor: customThemes[key].primaryColor,
                    color: customThemes[key].textColor,
                    borderColor: customThemes[key].secondaryColor,
                  }}
                >
                  {customThemes[key].name}
                </button>
                <button
                  className={styles.deleteButton}
                  onClick={() => handleDeleteClick(key, customThemes[key].name)}
                  title="Delete theme"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className={styles.actions}>
        <button
          className={styles.actionButton}
          onClick={() => setShowCustomBuilder(!showCustomBuilder)}
        >
          {showCustomBuilder ? 'Hide' : 'Create'} Custom Theme
        </button>
        <button
          className={styles.actionButton}
          onClick={handleExportTheme}
        >
          Export Current Theme
        </button>
        <button
          className={styles.actionButton}
          onClick={() => setShowImport(!showImport)}
        >
          Import Theme
        </button>
      </div>

      {/* Import Section */}
      {showImport && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Import Theme JSON</h4>
          <textarea
            className={styles.importTextarea}
            value={importInput}
            onChange={(e) => setImportInput(e.target.value)}
            placeholder="Paste theme JSON here..."
            rows={6}
          />
          <div className={styles.actions}>
            <button className={styles.actionButton} onClick={handleImportTheme}>
              Import
            </button>
            <button
              className={styles.actionButton}
              onClick={() => {
                setShowImport(false);
                setImportInput('');
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Custom Theme Builder */}
      {showCustomBuilder && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Custom Theme Builder</h4>
          <div className={styles.builderGrid}>
            <div className={styles.inputGroup}>
              <label htmlFor="theme-name">Theme Name</label>
              <input
                id="theme-name"
                type="text"
                value={customThemeData.name || ''}
                onChange={(e) => handleCustomThemeChange('name', e.target.value)}
                placeholder="My Custom Theme"
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="primary-color">Primary Color (Cell Background)</label>
              <div className={styles.colorInput}>
                <input
                  id="primary-color"
                  type="color"
                  value={customThemeData.primaryColor || currentTheme.primaryColor}
                  onChange={(e) => handleCustomThemeChange('primaryColor', e.target.value)}
                />
                <input
                  type="text"
                  value={customThemeData.primaryColor || currentTheme.primaryColor}
                  onChange={(e) => handleCustomThemeChange('primaryColor', e.target.value)}
                  placeholder="#ff007f"
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="secondary-color">Secondary Color (Border)</label>
              <div className={styles.colorInput}>
                <input
                  id="secondary-color"
                  type="color"
                  value={customThemeData.secondaryColor || currentTheme.secondaryColor}
                  onChange={(e) => handleCustomThemeChange('secondaryColor', e.target.value)}
                />
                <input
                  type="text"
                  value={customThemeData.secondaryColor || currentTheme.secondaryColor}
                  onChange={(e) => handleCustomThemeChange('secondaryColor', e.target.value)}
                  placeholder="#000000"
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="text-color">Text Color</label>
              <div className={styles.colorInput}>
                <input
                  id="text-color"
                  type="color"
                  value={customThemeData.textColor || currentTheme.textColor}
                  onChange={(e) => handleCustomThemeChange('textColor', e.target.value)}
                />
                <input
                  type="text"
                  value={customThemeData.textColor || currentTheme.textColor}
                  onChange={(e) => handleCustomThemeChange('textColor', e.target.value)}
                  placeholder="#ffffff"
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="background-color">Background Color (Empty Cells)</label>
              <div className={styles.colorInput}>
                <input
                  id="background-color"
                  type="color"
                  value={customThemeData.backgroundColor || currentTheme.backgroundColor}
                  onChange={(e) => handleCustomThemeChange('backgroundColor', e.target.value)}
                />
                <input
                  type="text"
                  value={customThemeData.backgroundColor || currentTheme.backgroundColor}
                  onChange={(e) => handleCustomThemeChange('backgroundColor', e.target.value)}
                  placeholder="#ffffff"
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="font-family">Font Family</label>
              <input
                id="font-family"
                type="text"
                value={customThemeData.fontFamily || currentTheme.fontFamily}
                onChange={(e) => handleCustomThemeChange('fontFamily', e.target.value)}
                placeholder="'Roboto', sans-serif"
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="border-radius">Border Radius</label>
              <input
                id="border-radius"
                type="text"
                value={customThemeData.borderRadius || currentTheme.borderRadius}
                onChange={(e) => handleCustomThemeChange('borderRadius', e.target.value)}
                placeholder="0.25rem"
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="border-width">Border Width</label>
              <input
                id="border-width"
                type="text"
                value={customThemeData.borderWidth || currentTheme.borderWidth}
                onChange={(e) => handleCustomThemeChange('borderWidth', e.target.value)}
                placeholder="0.125rem"
              />
            </div>
          </div>

          {/* Preview */}
          <div className={styles.preview}>
            <h5 className={styles.previewTitle}>Preview</h5>
            <div className={styles.previewCard}>
              <div
                className={styles.previewCell}
                style={{
                  backgroundColor: customThemeData.primaryColor || currentTheme.primaryColor,
                  color: customThemeData.textColor || currentTheme.textColor,
                  borderColor: customThemeData.secondaryColor || currentTheme.secondaryColor,
                  borderWidth: customThemeData.borderWidth || currentTheme.borderWidth,
                  borderRadius: customThemeData.borderRadius || currentTheme.borderRadius,
                  fontFamily: customThemeData.fontFamily || currentTheme.fontFamily,
                  borderStyle: 'solid',
                }}
              >
                42
              </div>
              <div
                className={styles.previewCell}
                style={{
                  backgroundColor: customThemeData.backgroundColor || currentTheme.backgroundColor,
                  borderColor: customThemeData.secondaryColor || currentTheme.secondaryColor,
                  borderWidth: customThemeData.borderWidth || currentTheme.borderWidth,
                  borderRadius: customThemeData.borderRadius || currentTheme.borderRadius,
                  borderStyle: 'solid',
                }}
              >
                
              </div>
            </div>
          </div>

          <div className={styles.actions}>
            <button className={styles.actionButton} onClick={handleSaveCustomTheme}>
              Save Custom Theme
            </button>
            <button
              className={styles.actionButton}
              onClick={() => {
                setShowCustomBuilder(false);
                setCustomThemeData({
                  name: '',
                  primaryColor: currentTheme.primaryColor,
                  secondaryColor: currentTheme.secondaryColor,
                  textColor: currentTheme.textColor,
                  backgroundColor: currentTheme.backgroundColor,
                  fontFamily: currentTheme.fontFamily,
                  borderRadius: currentTheme.borderRadius,
                  borderWidth: currentTheme.borderWidth,
                  cellPadding: currentTheme.cellPadding,
                });
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Theme"
        message={themeToDelete ? `Are you sure you want to delete the theme "${themeToDelete.name}"? This action cannot be undone.` : ''}
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}
