/**
 * Benchmark script to test card generation performance
 * Run with: npx tsx app/utils/benchmark.ts
 */

import { generateRandomBingoCards } from './utils';

function benchmark(numCards: number): void {
    console.log(`\nGenerating ${numCards} cards...`);
    const startTime = performance.now();
    
    const cards = generateRandomBingoCards(numCards);
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`✓ Generated ${cards.length} cards in ${duration.toFixed(2)}ms`);
    console.log(`  Average: ${(duration / numCards).toFixed(4)}ms per card`);
    console.log(`  Rate: ${(numCards / (duration / 1000)).toFixed(0)} cards/second`);
}

console.log('=== Bingo Card Generation Benchmark ===');

// Test different scales
benchmark(100);
benchmark(1000);
benchmark(5000);
benchmark(10000);

console.log('\n=== Benchmark Complete ===');
