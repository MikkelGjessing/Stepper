// Article Retrieval Module
// Provides interface and implementations for retrieving relevant articles

/**
 * @typedef {Object} RetrievalResult
 * @property {Object} article - The retrieved article
 * @property {number} score - Relevance score
 * @property {Object} matchInfo - Information about what matched
 */

/**
 * RetrievalProvider Interface
 * Defines the contract for article retrieval implementations
 */
export class RetrievalProvider {
  /**
   * Search for articles based on a query
   * @param {string} query - Search query
   * @param {Object} options - Search options (limit, filters, etc.)
   * @returns {Promise<RetrievalResult[]>} Array of retrieval results
   */
  async search(query, options = {}) {
    throw new Error('RetrievalProvider.search() must be implemented');
  }

  /**
   * Get article by ID
   * @param {number|string} id - Article ID
   * @returns {Promise<Object|null>} Article or null if not found
   */
  async getArticle(id) {
    throw new Error('RetrievalProvider.getArticle() must be implemented');
  }

  /**
   * Get all available articles
   * @returns {Promise<Object[]>} Array of all articles
   */
  async getAllArticles() {
    throw new Error('RetrievalProvider.getAllArticles() must be implemented');
  }
}

/**
 * Mock Retrieval Provider
 * In-memory implementation using mock knowledge base
 */
export class MockRetrievalProvider extends RetrievalProvider {
  constructor(articles = []) {
    super();
    this.articles = articles;
  }

  /**
   * Load articles into the provider
   * @param {Object[]} articles - Array of articles
   */
  loadArticles(articles) {
    this.articles = articles;
  }

  /**
   * Search for articles based on query
   * Scores: +3 for tag match, +2 for product match, +1 for title match
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<RetrievalResult[]>} Sorted by score (highest first)
   */
  async search(query, options = {}) {
    const { limit = 3 } = options;
    const queryLower = query.toLowerCase();
    const queryTokens = queryLower.split(/\s+/);

    const results = this.articles.map(article => {
      let score = 0;
      const matchInfo = {
        tagMatches: [],
        productMatch: false,
        titleMatch: false,
        keywordMatches: []
      };

      // Tag matches (+3 each)
      if (article.tags) {
        article.tags.forEach(tag => {
          if (queryTokens.some(token => tag.toLowerCase().includes(token))) {
            score += 3;
            matchInfo.tagMatches.push(tag);
          }
        });
      }

      // Product match (+2)
      if (article.product && queryLower.includes(article.product.toLowerCase())) {
        score += 2;
        matchInfo.productMatch = true;
      }

      // Title match (+1)
      if (article.title && article.title.toLowerCase().includes(queryLower)) {
        score += 1;
        matchInfo.titleMatch = true;
      }

      // Keyword matches (+1 each)
      if (article.keywords) {
        article.keywords.forEach(keyword => {
          if (queryLower.includes(keyword.toLowerCase())) {
            score += 1;
            matchInfo.keywordMatches.push(keyword);
          }
        });
      }

      return { article, score, matchInfo };
    });

    // Filter out zero scores and sort by score descending
    return results
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Get article by ID
   * @param {number|string} id - Article ID
   * @returns {Promise<Object|null>} Article or null
   */
  async getArticle(id) {
    const article = this.articles.find(a => a.id === id);
    return article || null;
  }

  /**
   * Get all articles
   * @returns {Promise<Object[]>} All articles
   */
  async getAllArticles() {
    return [...this.articles];
  }

  /**
   * Search by keywords (legacy method for compatibility)
   * @param {string[]} keywords - Array of keywords
   * @returns {Promise<Object[]>} Matching articles
   */
  async searchByKeywords(keywords) {
    return this.articles.filter(article =>
      keywords.some(keyword =>
        article.keywords && article.keywords.includes(keyword)
      )
    );
  }

  /**
   * Filter articles (client-side filtering)
   * @param {string} query - Filter query
   * @returns {Promise<Object[]>} Filtered articles
   */
  async filterArticles(query) {
    const queryLower = query.toLowerCase().trim();
    
    if (!queryLower) {
      return this.getAllArticles();
    }

    return this.articles.filter(article => {
      return article.title.toLowerCase().includes(queryLower) ||
             article.summary.toLowerCase().includes(queryLower) ||
             (article.tags || []).some(tag => tag.toLowerCase().includes(queryLower)) ||
             (article.keywords || []).some(kw => kw.toLowerCase().includes(queryLower));
    });
  }
}

/**
 * Helper to check if retrieval confidence is low
 * @param {RetrievalResult[]} results - Search results
 * @returns {boolean} True if confidence is low
 */
export function isLowConfidence(results) {
  const LOW_CONFIDENCE_THRESHOLD = 9;
  if (!results || results.length === 0) return true;
  return results[0].score < LOW_CONFIDENCE_THRESHOLD;
}
