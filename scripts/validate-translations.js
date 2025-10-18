#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Translation Validation Script
 * 
 * This script checks translation files for completeness and consistency.
 * It can be run manually or as part of CI/CD pipelines.
 * 
 * Usage:
 *   node scripts/validate-translations.js
 * 
 * Exit codes:
 *   0 - All translations are valid
 *   1 - Validation errors found
 */

const fs = require('fs');
const path = require('path');

const MESSAGES_DIR = path.join(__dirname, '../messages');

// Read locales from routing.ts to maintain single source of truth
function getLocalesFromRouting() {
  const routingPath = path.join(__dirname, '../app/routing.ts');
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

const LOCALES = getLocalesFromRouting();

/**
 * Get all keys from a nested object
 */
function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      keys = keys.concat(getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

/**
 * Load translation file
 */
function loadTranslations(locale) {
  const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ Error loading ${locale}.json:`, error.message);
    return null;
  }
}

/**
 * Main validation function
 */
function validateTranslations() {
  console.log('🔍 Validating translation files...\n');
  
  let hasErrors = false;
  const translations = {};
  
  // Load all translations
  for (const locale of LOCALES) {
    translations[locale] = loadTranslations(locale);
    if (!translations[locale]) {
      hasErrors = true;
    }
  }
  
  if (hasErrors) {
    return false;
  }
  
  // Get all keys from English (reference locale)
  const enKeys = new Set(getAllKeys(translations.en));
  console.log(`📝 English has ${enKeys.size} translation keys\n`);
  
  // Check each locale
  for (const locale of LOCALES) {
    if (locale === 'en') continue;
    
    const localeKeys = new Set(getAllKeys(translations[locale]));
    const missingKeys = [...enKeys].filter(key => !localeKeys.has(key));
    const extraKeys = [...localeKeys].filter(key => !enKeys.has(key));
    
    if (missingKeys.length === 0 && extraKeys.length === 0) {
      console.log(`✅ ${locale.toUpperCase()}: All keys present (${localeKeys.size} keys)`);
    } else {
      hasErrors = true;
      console.log(`❌ ${locale.toUpperCase()}: Issues found`);
      
      if (missingKeys.length > 0) {
        console.log(`   Missing ${missingKeys.length} keys:`);
        missingKeys.slice(0, 5).forEach(key => {
          console.log(`     - ${key}`);
        });
        if (missingKeys.length > 5) {
          console.log(`     ... and ${missingKeys.length - 5} more`);
        }
      }
      
      if (extraKeys.length > 0) {
        console.log(`   Extra ${extraKeys.length} keys not in English:`);
        extraKeys.slice(0, 5).forEach(key => {
          console.log(`     - ${key}`);
        });
        if (extraKeys.length > 5) {
          console.log(`     ... and ${extraKeys.length - 5} more`);
        }
      }
    }
    console.log('');
  }
  
  return !hasErrors;
}

// Run validation
const isValid = validateTranslations();

if (isValid) {
  console.log('✅ All translation files are valid!\n');
  process.exit(0);
} else {
  console.log('❌ Translation validation failed. Please fix the issues above.\n');
  console.log('💡 Tip: Run "npm test -- app/utils/i18n.test.ts" for detailed validation\n');
  process.exit(1);
}
