/**
 * Article Retrieval Module
 * 
 * This module handles intelligent article retrieval from the knowledge base
 * using a scoring algorithm based on tags, product names, and title words.
 * 
 * Scoring rules:
 * - +3 if query contains a tag term
 * - +2 if query contains product name
 * - +1 if query contains words from title
 * 
 * Can be swapped with an API call in the future.
 */

import { enhancedKnowledgeBase } from './kb.mock.js';

/**
 * Normalize query text for matching
 * @param {string} query - Raw query string
 * @returns {string[]} - Array of normalized tokens
 */
function normalizeQuery(query) {
  if (!query || query.trim().length === 0) {
    return [];
  }
  
  // Convert to lowercase
  let normalized = query.toLowerCase();
  
  // Strip punctuation (keep letters, numbers, and spaces)
  normalized = normalized.replace(/[^\w\s]/g, ' ');
  
  // Split into tokens and filter empty strings
  const tokens = normalized.split(/\s+/).filter(token => token.length > 0);
  
  return tokens;
}

/**
 * Calculate score for an article based on query
 * @param {Object} article - Knowledge article
 * @param {string[]} queryTokens - Normalized query tokens
 * @returns {number} - Article score
 */
function scoreArticle(article, queryTokens) {
  let score = 0;
  
  // Check tag matches (+3 per tag match)
  if (article.tags) {
    article.tags.forEach(tag => {
      const tagTokens = normalizeQuery(tag);
      tagTokens.forEach(tagToken => {
        if (queryTokens.includes(tagToken)) {
          score += 3;
        }
      });
    });
  }
  
  // Check product name matches (+2 per product word match)
  if (article.product) {
    const productTokens = normalizeQuery(article.product);
    productTokens.forEach(productToken => {
      if (queryTokens.includes(productToken)) {
        score += 2;
      }
    });
  }
  
  // Check title word matches (+1 per title word match)
  if (article.title) {
    const titleTokens = normalizeQuery(article.title);
    titleTokens.forEach(titleToken => {
      if (queryTokens.includes(titleToken)) {
        score += 1;
      }
    });
  }
  
  return score;
}

/**
 * Retrieve top matching articles for a query
 * @param {string} query - User's issue description
 * @param {number} topN - Number of top matches to return (default: 3)
 * @returns {Object} - Results object with matches and metadata
 */
export function retrieveArticles(query, topN = 3) {
  const queryTokens = normalizeQuery(query);
  
  if (queryTokens.length === 0) {
    return {
      matches: [],
      lowConfidence: false,
      query: query
    };
  }
  
  // Score all articles
  const scoredArticles = enhancedKnowledgeBase.map(article => ({
    article: article,
    score: scoreArticle(article, queryTokens)
  }));
  
  // Sort by score (descending) and take top N
  const topMatches = scoredArticles
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .filter(match => match.score > 0); // Only return articles with some score
  
  // Determine if confidence is low (top score < 9)
  const topScore = topMatches.length > 0 ? topMatches[0].score : 0;
  const lowConfidence = topScore < 9;
  
  return {
    matches: topMatches.map(match => ({
      id: match.article.id,
      title: match.article.title,
      summary: match.article.summary,
      product: match.article.product,
      score: match.score,
      article: match.article
    })),
    lowConfidence: lowConfidence,
    topScore: topScore,
    query: query
  };
}

/**
 * Get article by ID
 * @param {number} id - Article ID
 * @returns {Object|null} - Article or null if not found
 */
export function getArticleById(id) {
  return enhancedKnowledgeBase.find(article => article.id === id) || null;
}

/**
 * Backward compatibility: Simple best match function
 * @param {string} query - User's issue description
 * @returns {Object|null} - Best matching article or null
 */
export function findBestMatch(query) {
  const results = retrieveArticles(query, 1);
  if (results.matches.length > 0) {
    return results.matches[0].article;
  }
  return null;
}
