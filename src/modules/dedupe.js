// Step Deduplication Module
// Provides utilities for comparing and deduplicating steps based on text similarity

/**
 * Configuration for deduplication
 */
export const STEP_SIMILARITY_THRESHOLD = 0.6;

/**
 * Normalize text to tokens for comparison
 * @param {string} text - Text to normalize
 * @returns {string[]} Array of normalized tokens
 */
export function normalizeToTokens(text) {
  if (!text) return [];
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
    .split(/\s+/) // Split on whitespace
    .filter(token => token.length > 0); // Remove empty tokens
}

/**
 * Calculate Jaccard similarity between two token sets
 * @param {string[]} tokens1 - First set of tokens
 * @param {string[]} tokens2 - Second set of tokens
 * @returns {number} Similarity score between 0 and 1
 */
export function calculateJaccardSimilarity(tokens1, tokens2) {
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * Check if two step texts are similar based on Jaccard similarity
 * @param {string} text1 - First step text
 * @param {string} text2 - Second step text
 * @param {number} threshold - Similarity threshold (default: STEP_SIMILARITY_THRESHOLD)
 * @returns {boolean} True if steps are similar
 */
export function areStepsSimilar(text1, text2, threshold = STEP_SIMILARITY_THRESHOLD) {
  // Exact match
  if (text1 === text2) return true;
  
  // Tokenize and calculate Jaccard similarity
  const tokens1 = normalizeToTokens(text1);
  const tokens2 = normalizeToTokens(text2);
  
  const similarity = calculateJaccardSimilarity(tokens1, tokens2);
  return similarity > threshold;
}

/**
 * Find steps to skip based on similarity to completed steps
 * @param {Array} fallbackSteps - Steps in the fallback path
 * @param {string[]} completedStepTexts - Texts of completed steps
 * @returns {Set<number>} Set of indices to skip
 */
export function findStepsToSkip(fallbackSteps, completedStepTexts) {
  const stepsToSkip = new Set();
  
  fallbackSteps.forEach((step, index) => {
    for (const completedText of completedStepTexts) {
      if (areStepsSimilar(step.text, completedText)) {
        stepsToSkip.add(index);
        break;
      }
    }
  });
  
  return stepsToSkip;
}

/**
 * Calculate keyword overlap for fallback selection
 * @param {string[]} triggerKeywords - Keywords from fallback definition
 * @param {string[]} queryTokens - Tokens from user query/note
 * @returns {number} Number of overlapping keywords
 */
export function calculateKeywordOverlap(triggerKeywords, queryTokens) {
  if (!triggerKeywords || triggerKeywords.length === 0) return 0;
  if (!queryTokens || queryTokens.length === 0) return 0;
  
  const querySet = new Set(queryTokens);
  let overlapCount = 0;
  
  for (const keyword of triggerKeywords) {
    if (querySet.has(keyword.toLowerCase())) {
      overlapCount++;
    }
  }
  
  return overlapCount;
}
