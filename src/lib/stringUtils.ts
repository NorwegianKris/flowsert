/**
 * String utilities for normalization and similarity matching
 */

/**
 * Normalize a location/text string to Title Case with proper trimming
 */
export function normalizeText(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate string similarity score (0-1, where 1 is identical)
 */
export function stringSimilarity(a: string, b: string): number {
  const normalizedA = a.toLowerCase().trim();
  const normalizedB = b.toLowerCase().trim();
  
  if (normalizedA === normalizedB) return 1;
  if (normalizedA.length === 0 || normalizedB.length === 0) return 0;
  
  const maxLength = Math.max(normalizedA.length, normalizedB.length);
  const distance = levenshteinDistance(normalizedA, normalizedB);
  
  return 1 - distance / maxLength;
}

/**
 * Check if two strings are similar above a threshold
 */
export function isSimilar(a: string, b: string, threshold = 0.8): boolean {
  return stringSimilarity(a, b) >= threshold;
}

/**
 * Find similar matches from a list of options
 */
export function findSimilarMatches(
  input: string,
  options: string[],
  threshold = 0.6
): { value: string; similarity: number }[] {
  if (!input.trim()) return [];
  
  const normalizedInput = input.toLowerCase().trim();
  
  return options
    .map(opt => ({
      value: opt,
      similarity: stringSimilarity(normalizedInput, opt.toLowerCase())
    }))
    .filter(match => match.similarity >= threshold || match.value.toLowerCase().includes(normalizedInput))
    .sort((a, b) => b.similarity - a.similarity);
}

/**
 * Check if input matches any existing option (case-insensitive)
 */
export function hasExactMatch(input: string, options: string[]): boolean {
  const normalizedInput = input.toLowerCase().trim();
  return options.some(opt => opt.toLowerCase().trim() === normalizedInput);
}

/**
 * Get the best matching option if similarity is high enough
 */
export function getBestMatch(
  input: string,
  options: string[],
  threshold = 0.9
): string | null {
  if (!input.trim()) return null;
  
  const matches = findSimilarMatches(input, options, threshold);
  return matches.length > 0 ? matches[0].value : null;
}
