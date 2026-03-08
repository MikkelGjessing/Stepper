/**
 * Ingestion Entrypoint
 *
 * Unified pipeline used by every article source:
 *   manual upload → importArticleFile  (articles.js)
 *   ServiceNow    → importServiceNowArticles (articles.js)
 *   repo sync     → syncFromRepo (articles.js)
 *
 * Pipeline stages:
 *   1. source-specific cleanup  (optional callback)
 *   2. shared normalization     (ArticleNormalizer.normalize)
 *   3. parser strategy selection + execution (ParserRegistry.run)
 *   4. debug logging            (Ingestion.logDebug)
 *
 * Depends on:  ArticleNormalizer  (normalizer.js)
 *              ParserRegistry     (parser_strategies.js)
 * Both must be loaded before this file.
 */

const Ingestion = {

  /**
   * Run the full ingestion pipeline on a parsed HTML Document.
   *
   * @param {Document} doc            - Parsed HTML document (h1 title already
   *                                    removed by the caller if needed)
   * @param {string}   source         - Source identifier ('uploaded'|'servicenow'|etc.)
   * @param {string}   title          - Article title (already extracted)
   * @param {Function} [sourceCleanup] - Optional source-specific cleanup function
   *                                     called with (doc) before normalization.
   *                                     Should mutate doc in-place and return it.
   * @returns {{ steps: Step[], parserMeta: Object, normalizedArticle: Object }}
   */
  ingest(doc, source, title, sourceCleanup) {
    // Stage 1 – source-specific cleanup (optional)
    if (typeof sourceCleanup === 'function') {
      sourceCleanup(doc);
    }

    // Stage 2 – shared normalization
    const normalizedArticle = ArticleNormalizer.normalize(doc, source, title);

    // Stage 3 – strategy selection + parsing
    const { steps, parserMeta } = ParserRegistry.run(normalizedArticle);

    // Stage 4 – debug logging
    this.logDebug(title, normalizedArticle, parserMeta, steps);

    return { steps, parserMeta, normalizedArticle };
  },

  /**
   * Log article ingestion details to the console for development / debugging.
   * Mirrors the format of Articles.logStepInfo() and Articles._logServiceNowImport().
   *
   * @param {string} title              - Article title
   * @param {Object} normalizedArticle  - NormalizedArticle from ArticleNormalizer
   * @param {Object} parserMeta         - Parser metadata from ParserRegistry
   * @param {Array}  steps              - Parsed steps
   */
  logDebug(title, normalizedArticle, parserMeta, steps) {
    console.group(`⚙️ Ingestion: ${title}`);
    console.log(`Source:            ${normalizedArticle.source}`);
    console.log(`Parser chosen:     ${parserMeta.parserName}`);
    console.log(`Parser score:      ${parserMeta.parserScore}`);
    console.log(`Selection reasons: ${(parserMeta.selectionReasons || []).join('; ')}`);
    console.log(`Steps produced:    ${steps.length}`);
    console.log(`Procedure found:   ${parserMeta.procedureSectionFound}`);
    console.log(`Has tables:        ${parserMeta.hasTables}`);
    console.log(`Has images:        ${parserMeta.hasImages}`);
    console.log(`Section headings:  ${(parserMeta.sectionHeadings || []).join(' | ') || '(none)'}`);
    if (parserMeta.parsingWarnings && parserMeta.parsingWarnings.length > 0) {
      console.warn(`Warnings: ${parserMeta.parsingWarnings.join('; ')}`);
    }
    if (steps.length > 0) {
      console.log(`Step titles: ${steps.map(s => s.title).join(' | ')}`);
    }
    console.groupEnd();
  }
};

// Make available globally in browser context
if (typeof window !== 'undefined') {
  window.Ingestion = Ingestion;
}
