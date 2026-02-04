/**
 * Certificate Normalization & Ambiguity Detection
 * 
 * This module provides deterministic normalization of certificate names
 * and pattern-based ambiguity detection for the canonical mapping system.
 */

// Known acronyms that should NEVER be flagged as ambiguous
const KNOWN_ACRONYMS = new Set([
  'huet',
  'bosiet',
  'gwo',
  'stcw',
  'cswip',
  'dmt',
  'ebs',
  'ca ebs',
  'caebs',
  'imca',
  'opito',
  'nogepa',
  'oguk',
  't huet',
  'thuet',
  'foet',
  'mist',
  'nebosh',
  'iosh',
  'iwcf',
  'iadc',
  'hse',
  'rov',
  'adci',
  'dcbc',
  'dmac',
]);

// Generic terms that indicate ambiguity when used alone
const GENERIC_TERMS = new Set([
  'diving',
  'medical',
  'certificate',
  'cert',
  'inspection',
  'training',
  'course',
  'safety',
  'offshore',
  'marine',
  'subsea',
  'diver',
  'supervisor',
  'technician',
  'operator',
  'first aid',
  'firstaid',
]);

// Generic phrases that indicate ambiguity
const GENERIC_PHRASES = [
  'diving cert',
  'diving certificate',
  'medical certificate',
  'medical cert',
  'safety training',
  'safety certificate',
  'safety cert',
  'offshore training',
  'offshore certificate',
  'offshore cert',
  'marine certificate',
  'marine cert',
  'diving training',
  'subsea certificate',
  'subsea cert',
  'inspection certificate',
  'inspection cert',
];

/**
 * Normalizes a certificate title for consistent comparison and alias matching.
 * 
 * Steps:
 * 1. Lowercase
 * 2. Trim
 * 3. Replace punctuation with spaces
 * 4. Collapse multiple spaces
 * 5. Keep only alphanumeric and spaces
 * 6. Unicode normalize (NFD)
 * 
 * @param title - The raw certificate title to normalize
 * @returns The normalized title string
 */
export function normalizeCertificateTitle(title: string): string {
  if (!title || typeof title !== 'string') {
    return '';
  }

  return title
    // Step 1: Lowercase
    .toLowerCase()
    // Step 2: Trim
    .trim()
    // Step 3: Replace punctuation with spaces
    .replace(/[.,;:()\/\\-_'"!?@#$%^&*+=<>[\]{}|~`]/g, ' ')
    // Step 4: Keep only alphanumeric and spaces
    .replace(/[^a-z0-9\s]/g, '')
    // Step 5: Collapse multiple spaces
    .replace(/\s+/g, ' ')
    // Step 6: Final trim
    .trim()
    // Step 7: Unicode normalize
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove diacritics
}

/**
 * Checks if a normalized certificate title is a known industry acronym.
 * These should NEVER be flagged as ambiguous.
 * 
 * @param normalizedTitle - The normalized certificate title
 * @returns True if the title is a known acronym
 */
export function isKnownAcronym(normalizedTitle: string): boolean {
  if (!normalizedTitle) return false;
  
  // Check exact match
  if (KNOWN_ACRONYMS.has(normalizedTitle)) {
    return true;
  }
  
  // Check if the title starts with a known acronym
  // e.g., "cswip 3 2u" should match because it starts with "cswip"
  for (const acronym of KNOWN_ACRONYMS) {
    if (normalizedTitle.startsWith(acronym + ' ')) {
      return true;
    }
  }
  
  return false;
}

/**
 * Checks if a normalized certificate title is too generic for reliable mapping.
 * Generic titles require admin review before alias creation.
 * 
 * Detection Logic:
 * 1. If normalized matches known acronym -> NOT ambiguous
 * 2. If normalized exactly matches generic term -> AMBIGUOUS
 * 3. If normalized matches generic phrase pattern -> AMBIGUOUS
 * 4. Otherwise -> NOT ambiguous
 * 
 * Token count is NEVER used for ambiguity detection.
 * 
 * @param normalizedTitle - The normalized certificate title
 * @returns True if the title is considered ambiguous/generic
 */
export function isAmbiguousTitle(normalizedTitle: string): boolean {
  if (!normalizedTitle) return true; // Empty is ambiguous
  
  // Known acronyms are NEVER ambiguous
  if (isKnownAcronym(normalizedTitle)) {
    return false;
  }
  
  // Check exact match against generic terms
  if (GENERIC_TERMS.has(normalizedTitle)) {
    return true;
  }
  
  // Check against generic phrases
  for (const phrase of GENERIC_PHRASES) {
    if (normalizedTitle === phrase) {
      return true;
    }
  }
  
  // Check if entire title is just generic terms combined
  const words = normalizedTitle.split(' ').filter(w => w.length > 0);
  const allGeneric = words.every(word => GENERIC_TERMS.has(word));
  if (allGeneric && words.length <= 3) {
    return true;
  }
  
  return false;
}

/**
 * Gets an ambiguity warning message for display in the UI.
 * Only called when isAmbiguousTitle returns true.
 * 
 * @param normalizedTitle - The normalized certificate title
 * @returns A warning message explaining why the title is ambiguous
 */
export function getAmbiguityWarning(normalizedTitle: string): string {
  if (GENERIC_TERMS.has(normalizedTitle)) {
    return `"${normalizedTitle}" is too generic. Consider adding specifics like certification level, issuing body, or specialization.`;
  }
  
  for (const phrase of GENERIC_PHRASES) {
    if (normalizedTitle === phrase) {
      return `"${phrase}" is a generic phrase. Please use the full official certificate name.`;
    }
  }
  
  return 'This certificate name appears too generic for reliable matching. Consider using a more specific name.';
}

/**
 * Utility to extract a display-friendly version of a normalized title.
 * Capitalizes first letter of each word.
 * 
 * @param normalizedTitle - The normalized certificate title
 * @returns A title-cased version for display
 */
export function toDisplayTitle(normalizedTitle: string): string {
  if (!normalizedTitle) return '';
  
  return normalizedTitle
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Validates if a raw certificate title is suitable for processing.
 * 
 * @param title - The raw certificate title
 * @returns Object with isValid boolean and optional error message
 */
export function validateCertificateTitle(title: string): { isValid: boolean; error?: string } {
  if (!title || typeof title !== 'string') {
    return { isValid: false, error: 'Certificate title is required' };
  }
  
  const trimmed = title.trim();
  
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Certificate title cannot be empty' };
  }
  
  if (trimmed.length < 2) {
    return { isValid: false, error: 'Certificate title is too short' };
  }
  
  if (trimmed.length > 200) {
    return { isValid: false, error: 'Certificate title is too long (max 200 characters)' };
  }
  
  return { isValid: true };
}
