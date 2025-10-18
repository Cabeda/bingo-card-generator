/**
 * Translation Coverage Tests
 * 
 * These tests ensure that all translation keys are present across all supported locales
 * to prevent missing translations that could result in English fallbacks or broken UI.
 */

import fs from 'fs';
import path from 'path';
import enMessages from '../../messages/en.json';
import esMessages from '../../messages/es.json';
import frMessages from '../../messages/fr.json';
import ptMessages from '../../messages/pt.json';

type MessageObject = Record<string, string | MessageObject>;

/**
 * Read locales from routing.ts to maintain single source of truth
 */
function getLocalesFromRouting(): string[] {
  const routingPath = path.join(__dirname, '../routing.ts');
  const routingContent = fs.readFileSync(routingPath, 'utf8');
  const localesMatch = routingContent.match(/locales:\s*\[(.*?)\]/s);
  
  if (!localesMatch) {
    throw new Error('Could not find locales array in routing.ts');
  }
  
  // Extract locale strings from the array
  const localesStr = localesMatch[1];
  const locales = localesStr
    .split(',')
    .map(s => s.trim().replace(/['"]/g, ''))
    .filter(s => s.length > 0);
  
  return locales;
}

/**
 * Recursively extracts all translation keys from a nested object
 * @param obj - The translation object to extract keys from
 * @param prefix - The current key path prefix
 * @returns Array of all dot-notation keys
 */
function getAllKeys(obj: MessageObject, prefix = ''): string[] {
  let keys: string[] = [];
  
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    
    if (typeof value === 'object' && value !== null) {
      keys = keys.concat(getAllKeys(value as MessageObject, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}

/**
 * Gets the value of a nested key from an object using dot notation
 * @param obj - The object to get the value from
 * @param key - The dot-notation key path
 * @returns The value at the key path, or undefined if not found
 */
function getNestedValue(obj: MessageObject, key: string): string | MessageObject | undefined {
  const keys = key.split('.');
  let current: string | MessageObject = obj;
  
  for (const k of keys) {
    if (typeof current === 'object' && current !== null && k in current) {
      current = current[k];
    } else {
      return undefined;
    }
  }
  
  return current;
}

describe('Translation Coverage', () => {
  const locales = {
    en: enMessages,
    es: esMessages,
    fr: frMessages,
    pt: ptMessages,
  };

  const allLocaleKeys = Object.entries(locales).map(([locale, messages]) => ({
    locale,
    keys: new Set(getAllKeys(messages)),
    messages,
  }));

  describe('Key Consistency', () => {
    it('should have the same keys across all locales', () => {
      const enKeys = allLocaleKeys.find(l => l.locale === 'en')!.keys;
      const missingKeysByLocale: Record<string, string[]> = {};

      for (const { locale, keys } of allLocaleKeys) {
        if (locale === 'en') continue;

        const missingKeys: string[] = [];
        for (const key of enKeys) {
          if (!keys.has(key)) {
            missingKeys.push(key);
          }
        }

        if (missingKeys.length > 0) {
          missingKeysByLocale[locale] = missingKeys;
        }
      }

      if (Object.keys(missingKeysByLocale).length > 0) {
        const errorMessage = Object.entries(missingKeysByLocale)
          .map(([locale, keys]) => 
            `\n  ${locale.toUpperCase()}: Missing ${keys.length} keys:\n    - ${keys.join('\n    - ')}`
          )
          .join('\n');

        throw new Error(`Some locales are missing translation keys:${errorMessage}`);
      }
    });

    it('should not have extra keys in non-English locales', () => {
      const enKeys = allLocaleKeys.find(l => l.locale === 'en')!.keys;
      const extraKeysByLocale: Record<string, string[]> = {};

      for (const { locale, keys } of allLocaleKeys) {
        if (locale === 'en') continue;

        const extraKeys: string[] = [];
        for (const key of keys) {
          if (!enKeys.has(key)) {
            extraKeys.push(key);
          }
        }

        if (extraKeys.length > 0) {
          extraKeysByLocale[locale] = extraKeys;
        }
      }

      if (Object.keys(extraKeysByLocale).length > 0) {
        const errorMessage = Object.entries(extraKeysByLocale)
          .map(([locale, keys]) => 
            `\n  ${locale.toUpperCase()}: Extra ${keys.length} keys:\n    - ${keys.join('\n    - ')}`
          )
          .join('\n');

        throw new Error(`Some locales have extra keys not present in English:${errorMessage}`);
      }
    });
  });

  describe('Value Validation', () => {
    it('should not have empty translation values', () => {
      const emptyValuesByLocale: Record<string, string[]> = {};

      for (const { locale, keys, messages } of allLocaleKeys) {
        const emptyKeys: string[] = [];
        
        for (const key of keys) {
          const value = getNestedValue(messages, key);
          if (typeof value === 'string' && value.trim() === '') {
            emptyKeys.push(key);
          }
        }

        if (emptyKeys.length > 0) {
          emptyValuesByLocale[locale] = emptyKeys;
        }
      }

      if (Object.keys(emptyValuesByLocale).length > 0) {
        const errorMessage = Object.entries(emptyValuesByLocale)
          .map(([locale, keys]) => 
            `\n  ${locale.toUpperCase()}: ${keys.length} empty values:\n    - ${keys.join('\n    - ')}`
          )
          .join('\n');

        throw new Error(`Some translations have empty values:${errorMessage}`);
      }
    });

    it('should have consistent placeholder usage across locales', () => {
      const placeholderRegex = /\{[^}]+\}/g;
      const inconsistentPlaceholders: string[] = [];

      const enKeys = allLocaleKeys.find(l => l.locale === 'en')!.keys;

      for (const key of enKeys) {
        const enValue = getNestedValue(enMessages, key);
        if (typeof enValue !== 'string') continue;

        const enPlaceholders = (enValue.match(placeholderRegex) || []).sort();

        for (const { locale, messages } of allLocaleKeys) {
          if (locale === 'en') continue;

          const value = getNestedValue(messages, key);
          if (typeof value !== 'string') continue;

          const placeholders = (value.match(placeholderRegex) || []).sort();

          if (JSON.stringify(enPlaceholders) !== JSON.stringify(placeholders)) {
            inconsistentPlaceholders.push(
              `${key} [${locale}]: Expected ${JSON.stringify(enPlaceholders)} but got ${JSON.stringify(placeholders)}`
            );
          }
        }
      }

      if (inconsistentPlaceholders.length > 0) {
        throw new Error(
          `Some translations have inconsistent placeholders:\n  - ${inconsistentPlaceholders.join('\n  - ')}`
        );
      }
    });
  });

  describe('Structure Validation', () => {
    it('should have all expected top-level sections', () => {
      const expectedSections = ['common', 'fileUpload', 'bingoGame', 'themes'];

      for (const { locale, messages } of allLocaleKeys) {
        const sections = Object.keys(messages);
        const missingSections = expectedSections.filter(s => !sections.includes(s));

        if (missingSections.length > 0) {
          throw new Error(`${locale.toUpperCase()} is missing sections: ${missingSections.join(', ')}`);
        }
      }
    });

    it('should have consistent structure depth across all locales', () => {
      function getMaxDepth(obj: MessageObject, depth = 0): number {
        if (typeof obj !== 'object' || obj === null) {
          return depth;
        }
        
        let maxDepth = depth;
        for (const key in obj) {
          const childDepth = getMaxDepth(obj[key] as MessageObject, depth + 1);
          maxDepth = Math.max(maxDepth, childDepth);
        }
        
        return maxDepth;
      }

      const depths = allLocaleKeys.map(({ locale, messages }) => ({
        locale,
        depth: getMaxDepth(messages),
      }));

      const enDepth = depths.find(d => d.locale === 'en')!.depth;
      const inconsistentDepths = depths.filter(d => d.locale !== 'en' && d.depth !== enDepth);

      if (inconsistentDepths.length > 0) {
        const errorMessage = inconsistentDepths
          .map(d => `${d.locale.toUpperCase()}: depth ${d.depth} (expected ${enDepth})`)
          .join(', ');
        
        throw new Error(`Translation structure depth is inconsistent: ${errorMessage}`);
      }
    });
  });

  describe('Locale Configuration', () => {
    it('should match locales defined in routing.ts', () => {
      const routingLocales = getLocalesFromRouting();
      const messageLocales = Object.keys(locales);

      const missingInMessages = routingLocales.filter(l => !messageLocales.includes(l));
      const extraInMessages = messageLocales.filter(l => !routingLocales.includes(l));

      if (missingInMessages.length > 0 || extraInMessages.length > 0) {
        const errors: string[] = [];
        if (missingInMessages.length > 0) {
          errors.push(`Missing message files for: ${missingInMessages.join(', ')}`);
        }
        if (extraInMessages.length > 0) {
          errors.push(`Extra message files not in routing: ${extraInMessages.join(', ')}`);
        }
        throw new Error(errors.join('\n'));
      }
    });

    it('should have valid JSON structure in all message files', () => {
      // This test implicitly passes if the imports succeed
      // but we can add explicit validation
      allLocaleKeys.forEach(({ messages }) => {
        expect(messages).toBeDefined();
        expect(typeof messages).toBe('object');
        expect(messages).not.toBeNull();
      });
    });
  });
});
