/**
 * Search and ranking functionality
 * Provides article search with relevance scoring
 */

const Search = {
  /**
   * Strip HTML tags from text
   * @param {string} html - HTML string
   * @returns {string} Plain text
   */
  stripHtml(html) {
    if (!html) return '';
    // Remove HTML tags but keep text content
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  },

  /**
   * Normalise text for search comparison: lowercase, collapse whitespace,
   * strip punctuation and normalise separators (/ - _).
   * @param {string} text
   * @returns {string}
   */
  normalizeText(text) {
    if (!text) return '';
    return text
      .toLowerCase()
      .replace(/[\/\-_]+/g, ' ')   // normalise separators
      .replace(/[^\w\s]/g, ' ')    // strip other punctuation
      .replace(/\s+/g, ' ')
      .trim();
  },

  /**
   * Tokenize text into searchable keywords
   * @param {string} text - Text to tokenize
   * @returns {Array<string>} Array of tokens
   */
  tokenize(text) {
    if (!text) return [];
    return this.normalizeText(text)
      .split(/\s+/)
      .filter(token => token.length > 2); // Filter out very short tokens
  },

  /**
   * Search articles by query with LLM integration
   * @param {string} query - Search query
   * @param {Array} articles - Articles to search
   * @param {Object} settings - Settings object with LLM configuration
   * @returns {Promise<Array>} Ranked search results (top 5-10)
   */
  async searchArticles(query, articles, settings = {}) {
    if (!query || !query.trim()) {
      return articles || [];
    }
    
    if (!Array.isArray(articles) || articles.length === 0) {
      return [];
    }
    
    // Perform keyword-based search
    const keywordResults = this.keywordSearch(query, articles);
    
    // Check if LLM search is enabled and configured
    if (settings.enableLLMSearch && settings.llmEndpoint && settings.llmApiKey) {
      try {
        // Try LLM reranking
        const llmResults = await this.llmRerank(query, keywordResults, settings);
        return llmResults.slice(0, 10); // Return top 10
      } catch (error) {
        console.error('LLM search failed, falling back to keyword search:', error);
        // Fall back to keyword results
        return keywordResults.slice(0, 10);
      }
    }
    
    // Return top 5-10 keyword results
    return keywordResults.slice(0, 10);
  },

  /**
   * Perform keyword-based search
   * @param {string} query - Search query
   * @param {Array} articles - Articles to search
   * @returns {Array} Ranked search results
   */
  keywordSearch(query, articles) {
    if (!query || !query.trim()) {
      return [];
    }
    
    if (!Array.isArray(articles) || articles.length === 0) {
      return [];
    }
    
    const normalizedQuery = this.normalizeText(query);
    const queryTokens = this.tokenize(query);
    const results = [];
    
    articles.forEach(article => {
      const score = this.calculateRelevanceScore(normalizedQuery, queryTokens, article);
      if (score > 0) {
        results.push({
          article,
          score,
          highlights: this.getHighlights(normalizedQuery, article)
        });
      }
    });
    
    // Sort by score descending
    results.sort((a, b) => b.score - a.score);
    
    return results.map(r => r.article);
  },

  /**
   * Search articles by query (legacy method for backwards compatibility)
   * @param {string} query - Search query
   * @param {Array} articles - Articles to search
   * @returns {Array} Ranked search results
   */
  search(query, articles) {
    return this.keywordSearch(query, articles);
  },

  /**
   * Calculate relevance score for an article.
   *
   * Ranking priority (highest → lowest):
   *   1. Exact / near title match
   *   2. Title token matches
   *   3. Step-title / section-heading matches
   *   4. Procedure content matches (step bodies, summary)
   *   5. Pre-built searchText field (covers all text, normalised)
   *   6. Tags / keywords  (lowest weight — avoids tag-only discovery)
   *
   * @param {string} query - Normalised query
   * @param {Array<string>} queryTokens - Tokenized query
   * @param {Object} article - Article object
   * @returns {number} Relevance score
   */
  calculateRelevanceScore(query, queryTokens, article) {
    let score = 0;
    
    if (!article) return score;

    // ── 1. Title match (highest weight) ────────────────────────────────────
    const title = this.normalizeText(article.title || '');
    if (title.includes(query)) {
      score += 15;
      if (title.startsWith(query)) score += 5; // starts-with bonus
    }

    // Title token matches
    if (queryTokens.length > 0) {
      const matchedTokens = queryTokens.filter(t => title.includes(t));
      score += matchedTokens.length * 2;
    }

    // ── 2. Pre-built searchText field ──────────────────────────────────────
    // If the article has a pre-computed normalised searchText, use it for fast
    // full-text matching without re-extracting all content.
    if (article.searchText) {
      const st = article.searchText; // already normalised
      if (st.includes(query)) {
        score += 3;
      }
      if (queryTokens.length > 1) {
        queryTokens.forEach(token => {
          if (st.includes(token)) score += 0.5;
        });
      }
    }

    // ── 3. Summary / intro match ───────────────────────────────────────────
    const summary = this.normalizeText(article.summary || '');
    if (summary.includes(query)) score += 4;

    // ── 4. Step titles and body content ────────────────────────────────────
    if (Array.isArray(article.steps)) {
      // Pre-compute normalised step bodies once to avoid redundant processing
      const normalisedSteps = article.steps.map(step => ({
        title: this.normalizeText(step.title || ''),
        body: this.normalizeText(this.stripHtml(step.bodyHtml || ''))
      }));

      normalisedSteps.forEach(({ title: stepTitle, body: stepBody }) => {
        if (stepTitle.includes(query)) {
          score += 5; // step-title match is high-value
        }

        if (stepBody.includes(query)) {
          score += 2;
          const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const occurrences = (stepBody.match(new RegExp(escaped, 'g')) || []).length;
          score += Math.min(occurrences * 0.5, 3); // cap bonus at 3
        }
      });

      // ── 5. Token matching across summary + steps ─────────────────────────
      if (queryTokens.length > 1) {
        queryTokens.forEach(token => {
          if (summary.includes(token)) score += 0.5;
          normalisedSteps.forEach(({ body: stepBody }) => {
            if (stepBody.includes(token)) score += 0.3;
          });
        });
      }
    } else if (queryTokens.length > 1) {
      // No steps — still apply summary token bonus
      queryTokens.forEach(token => {
        if (summary.includes(token)) score += 0.5;
      });
    }

    // ── 6. Tags (lowest weight — should not dominate ranking) ─────────────
    if (Array.isArray(article.tags)) {
      article.tags.forEach(tag => {
        const tagNorm = this.normalizeText(tag);
        if (tagNorm.includes(query)) {
          score += 1; // reduced from 5
        }
        queryTokens.forEach(token => {
          if (tagNorm.includes(token)) {
            score += 0.3; // reduced from 2
          }
        });
      });
    }
    
    return score;
  },

  /**
   * Use LLM to rerank search results
   * @param {string} query - User query
   * @param {Array} articles - Keyword-ranked articles
   * @param {Object} settings - Settings with LLM configuration
   * @returns {Promise<Array>} LLM-reranked articles
   */
  async llmRerank(query, articles, settings) {
    if (!articles || articles.length === 0) {
      return [];
    }
    
    // Limit to top 20 articles for LLM processing to avoid payload size issues
    const candidateArticles = articles.slice(0, 20);
    
    // Prepare article data for LLM (only send title, summary, tags - not full bodies)
    const articleData = candidateArticles.map(article => ({
      id: article.id,
      title: article.title,
      summary: article.summary || '',
      tags: article.tags || []
    }));
    
    // Construct prompt for LLM
    const prompt = `You are a helpful assistant that helps users find the most relevant step-by-step guides.

User query: "${query}"

Available articles (in JSON format):
${JSON.stringify(articleData, null, 2)}

Task: Select and rank the top 10 most relevant articles for this user query. Return ONLY a JSON array of article IDs in order of relevance, like this: ["id1", "id2", "id3", ...]

Return only the JSON array, no other text.`;

    // Call LLM API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(settings.llmEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.llmApiKey}`
        },
        body: JSON.stringify({
          model: settings.llmModel || 'gpt-3.5-turbo',
          messages: [
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 500
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`LLM API returned status ${response.status}`);
      }
      
      const data = await response.json();
      
      // Extract the response text
      let llmResponse = '';
      if (data.choices && data.choices[0] && data.choices[0].message) {
        llmResponse = data.choices[0].message.content.trim();
      } else {
        throw new Error('Unexpected LLM response format');
      }
      
      // Parse the JSON array of IDs
      let rankedIds;
      try {
        // Try to extract JSON array from response
        const jsonMatch = llmResponse.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          rankedIds = JSON.parse(jsonMatch[0]);
        } else {
          rankedIds = JSON.parse(llmResponse);
        }
      } catch (parseError) {
        console.error('Failed to parse LLM response:', llmResponse);
        throw new Error('Failed to parse LLM response as JSON');
      }
      
      if (!Array.isArray(rankedIds)) {
        throw new Error('LLM did not return an array');
      }
      
      // Reorder articles based on LLM ranking
      const rankedArticles = [];
      const articleMap = new Map(candidateArticles.map(a => [a.id, a]));
      
      rankedIds.forEach(id => {
        if (articleMap.has(id)) {
          rankedArticles.push(articleMap.get(id));
          articleMap.delete(id); // Remove to avoid duplicates
        }
      });
      
      // Append any remaining articles that weren't ranked by LLM
      articleMap.forEach(article => rankedArticles.push(article));
      
      return rankedArticles;
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('LLM request timed out');
      }
      
      throw error;
    }
  },

  /**
   * Get highlighted snippets from article
   * @param {string} query - Normalized query
   * @param {Object} article - Article object
   * @returns {Array} Array of highlight snippets
   */
  getHighlights(query, article) {
    const highlights = [];
    
    if (!article) return highlights;
    
    // Title highlight
    const title = article.title || '';
    if (title.toLowerCase().includes(query)) {
      highlights.push({ field: 'title', text: title });
    }
    
    // Content highlights (first 3 matches)
    const content = article.content || '';
    const lowerContent = content.toLowerCase();
    const index = lowerContent.indexOf(query);
    
    if (index !== -1) {
      const start = Math.max(0, index - 40);
      const end = Math.min(content.length, index + query.length + 40);
      let snippet = content.substring(start, end);
      
      if (start > 0) snippet = '...' + snippet;
      if (end < content.length) snippet = snippet + '...';
      
      highlights.push({ field: 'content', text: snippet });
    }
    
    return highlights;
  },

  /**
   * Filter articles by category
   * @param {Array} articles - Articles to filter
   * @param {string} category - Category to filter by
   * @returns {Array} Filtered articles
   */
  filterByCategory(articles, category) {
    if (!category || !Array.isArray(articles)) {
      return articles || [];
    }
    
    return articles.filter(article => 
      article.category && article.category.toLowerCase() === category.toLowerCase()
    );
  },

  /**
   * Filter articles by tags
   * @param {Array} articles - Articles to filter
   * @param {Array} tags - Tags to filter by
   * @returns {Array} Filtered articles
   */
  filterByTags(articles, tags) {
    if (!Array.isArray(tags) || tags.length === 0 || !Array.isArray(articles)) {
      return articles || [];
    }
    
    return articles.filter(article => {
      if (!Array.isArray(article.tags)) return false;
      return tags.some(tag => 
        article.tags.some(articleTag => 
          articleTag.toLowerCase() === tag.toLowerCase()
        )
      );
    });
  },

  /**
   * Get unique categories from articles
   * @param {Array} articles - Articles to analyze
   * @returns {Array} Unique categories
   */
  getCategories(articles) {
    if (!Array.isArray(articles)) return [];
    
    const categories = new Set();
    articles.forEach(article => {
      if (article.category) {
        categories.add(article.category);
      }
    });
    
    return Array.from(categories).sort();
  },

  /**
   * Get unique tags from articles
   * @param {Array} articles - Articles to analyze
   * @returns {Array} Unique tags
   */
  getTags(articles) {
    if (!Array.isArray(articles)) return [];
    
    const tags = new Set();
    articles.forEach(article => {
      if (Array.isArray(article.tags)) {
        article.tags.forEach(tag => tags.add(tag));
      }
    });
    
    return Array.from(tags).sort();
  }
};

// Make it available globally
if (typeof window !== 'undefined') {
  window.Search = Search;
}
