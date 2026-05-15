/**
 * Bundled JSON Knowledge Importer
 *
 * Loads knowledge-json/articles.json (bundled with the extension) and ingests
 * each article through the same pipeline used by every other source:
 *
 *   1. extractArticleArray()   – handle array / object / ServiceNow-result root
 *   2. normalizeJsonRecord()   – flexible field mapping → raw article shape
 *   3. Ingestion.ingest()      – shared normalise → strategy → parse pipeline
 *   4. batch upsert            – deduplication by stable "bundled_json:<id>" key
 *
 * Depends on:  Articles, Ingestion, ArticleNormalizer, Storage
 *              (all loaded before this file in options.html)
 */

const JsonKnowledgeImporter = {

  /** Number of articles to parse per microtask yield. */
  BATCH_SIZE: 50,

  /**
   * Load knowledge-json/articles.json and import all articles it contains.
   *
   * @param {Function} [onProgress] - Called with ({imported, total, skipped})
   *                                  after each batch.
   * @returns {Promise<{ok:boolean, imported:number, skipped:number, total:number, message:string}>}
   */
  async loadBundledJsonKnowledge(onProgress) {
    const url = chrome.runtime.getURL('knowledge-json/articles.json');
    let json;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        // File does not exist or is not accessible — non-fatal
        console.warn('[JsonKnowledgeImporter] No bundled JSON knowledge file found');
        return { ok: true, imported: 0, skipped: 0, total: 0, message: 'No bundled JSON file found' };
      }
      json = await response.json();
    } catch (err) {
      const msg = `Could not parse knowledge-json/articles.json: ${err.message}`;
      console.error('[JsonKnowledgeImporter]', msg);
      return { ok: false, imported: 0, skipped: 0, total: 0, message: msg };
    }

    return this.importJsonKnowledgeData(json, onProgress);
  },

  /**
   * Import an already-parsed JSON object (any of the three supported shapes).
   * This is the main entry point used both by loadBundledJsonKnowledge() and
   * any caller that already has a parsed JSON value.
   *
   * @param {*}        json        - Parsed JSON value (array or object)
   * @param {Function} [onProgress]
   * @returns {Promise<{ok:boolean, imported:number, skipped:number, total:number, message:string}>}
   */
  async importJsonKnowledgeData(json, onProgress) {
    let records;
    try {
      records = this.extractArticleArray(json);
    } catch (err) {
      const msg = `Could not parse knowledge-json/articles.json: ${err.message}`;
      return { ok: false, imported: 0, skipped: 0, total: 0, message: msg };
    }

    const total = records.length;
    let imported = 0;
    let skipped = 0;
    const importedAt = new Date().toISOString();

    // Process in batches to avoid blocking the UI
    for (let start = 0; start < total; start += this.BATCH_SIZE) {
      const batch = records.slice(start, start + this.BATCH_SIZE);
      const articlesToStore = [];

      for (const raw of batch) {
        try {
          const article = this._processRecord(raw, importedAt);
          if (article) {
            articlesToStore.push(article);
          } else {
            skipped++;
          }
        } catch (err) {
          skipped++;
        }
      }

      if (articlesToStore.length > 0) {
        await this._upsertBatch(articlesToStore);
        imported += articlesToStore.length;
      }

      if (typeof onProgress === 'function') {
        onProgress({ imported, total, skipped });
      }

      // Yield to the event loop between batches
      if (start + this.BATCH_SIZE < total) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    const msg = skipped > 0
      ? `Imported ${imported} articles, skipped ${skipped}`
      : `Imported ${imported} articles`;
    return { ok: true, imported, skipped, total, message: msg };
  },

  /**
   * Extract the articles array from any of the three supported JSON root shapes.
   *
   * 1. Array root:             [ { id, title, ... }, ... ]
   * 2. Object with "articles": { "articles": [ ... ] }
   * 3. ServiceNow result:      { "result": [ ... ] }
   *
   * @param {*} json
   * @returns {Array} Raw record array
   * @throws {Error} if the structure is unrecognised
   */
  extractArticleArray(json) {
    if (Array.isArray(json)) {
      return json;
    }
    if (json && typeof json === 'object') {
      if (Array.isArray(json.articles)) return json.articles;
      if (Array.isArray(json.result))   return json.result;
    }
    throw new Error('Unrecognised JSON structure — expected an array or an object with "articles" or "result" key');
  },

  /**
   * Map a raw record through the flexible field-mapping rules and run it
   * through the shared ingestion pipeline.
   *
   * @param {Object} raw       - Raw record from the JSON file
   * @param {string} importedAt - ISO timestamp for this import run
   * @returns {Object|null} Fully processed article or null if the record should be skipped
   */
  _processRecord(raw, importedAt) {
    if (!raw || typeof raw !== 'object') return null;

    // ── Field mapping ────────────────────────────────────────────────────────

    // ID
    const originalId =
      raw.id         || raw.articleId   || raw.sys_id ||
      raw.number     || raw.kb_number   || null;

    // Title
    const rawTitle =
      raw.title           || raw.articleTitle       ||
      raw.short_description || raw.name             ||
      raw.heading         || '';

    // Body / content (HTML preferred; plain text accepted)
    const rawHtml =
      raw.body        || raw.bodyHtml   || raw.text  ||
      raw.html        || raw.content    || raw.article ||
      raw.procedure   || '';

    // Plain-text fallback (used only when all HTML fields are empty)
    const rawText = typeof rawHtml === 'string' ? rawHtml : String(rawHtml || '');

    // Summary
    const rawSummary =
      raw.summary     || raw.description || raw.short_description || '';

    // Tags
    let rawTags = raw.tags || raw.keywords || raw.sys_tags || [];
    if (typeof rawTags === 'string') {
      rawTags = rawTags.split(/[,;|]/).map(t => t.trim()).filter(Boolean);
    }
    const tags = Array.isArray(rawTags) ? rawTags.map(String) : [];

    // ── Build HTML for the ingestion pipeline ───────────────────────────────
    let htmlContent = rawText.trim();

    // If the content does not look like HTML, wrap it so the DOM parser works well
    const looksLikeHtml = /<\w[^>]*>/.test(htmlContent);
    if (!looksLikeHtml && htmlContent) {
      // Escape and convert plain text (newlines → paragraphs)
      const escaped = Articles.escapeHtml(htmlContent);
      htmlContent = escaped
        .split(/\n{2,}/)
        .map(block => `<p>${block.replace(/\n/g, '<br>')}</p>`)
        .join('\n');
    }

    // ── Parse through the shared pipeline ───────────────────────────────────
    let steps = [];
    let parserMeta = {};
    let normalizedArticle = {};
    let resolvedTitle = rawTitle.trim() || 'Untitled article';
    let titleSource = rawTitle.trim() ? 'title' : 'fallback';

    if (htmlContent) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');

        // Use resolveArticleTitle to get a good title (falls back to doc content)
        const rawSourceData = rawTitle.trim() ? { title: rawTitle.trim() } : null;
        const titleResult = Articles.resolveArticleTitle(rawSourceData, doc, null);
        resolvedTitle = titleResult.title;
        titleSource   = titleResult.titleSource;

        // Run ingestion pipeline
        const ingestResult = Ingestion.ingest(doc, 'bundled_json', resolvedTitle);
        steps            = ingestResult.steps;
        parserMeta       = ingestResult.parserMeta;
        normalizedArticle = ingestResult.normalizedArticle;
      } catch (_) {
        // Ingestion failed — fall back to a single raw step
        steps = [{
          index: 1,
          title: 'Procedure',
          bodyHtml: `<p>${Articles.escapeHtml(Articles.stripHtmlTags(htmlContent).substring(0, 2000))}</p>`,
          images: []
        }];
      }
    } else {
      // No content — still create the article if it has a title
      if (!resolvedTitle || resolvedTitle === 'Untitled article') return null;
      steps = [{
        index: 1,
        title: 'Procedure',
        bodyHtml: '<p>No content provided.</p>',
        images: []
      }];
    }

    // Derive summary
    let summary = (rawSummary || '').trim();
    if (!summary && normalizedArticle.introHtml) {
      summary = Articles.stripHtmlTags(normalizedArticle.introHtml).substring(0, 300).trim();
    }

    // ── Build stable article ID ──────────────────────────────────────────────
    // Use a deterministic prefix so repeated imports update rather than duplicate.
    const stableId = originalId
      ? `bundled_json:${String(originalId)}`
      : `bundled_json:${Articles.generateUUID()}`;

    const mergedTags = [
      ...new Set([
        ...tags,
        ...(Array.isArray(normalizedArticle.tags) ? normalizedArticle.tags : [])
      ])
    ];

    const articleData = {
      id:                  stableId,
      title:               resolvedTitle,
      titleSource,
      summary,
      introHtml:           normalizedArticle.introHtml       || '',
      relatedInfoHtml:     normalizedArticle.relatedInfoHtml || '',
      tags:                mergedTags,
      estimatedMinutes:    null,
      steps,
      parserMeta,
      source:              'bundled_json',
      sourceMeta: {
        importedAt,
        originalId:     originalId ? String(originalId) : null,
        originalNumber: raw.number  || raw.kb_number || null
      },
      createdAt:           importedAt,
      updatedAt:           importedAt
    };
    articleData.searchText = Articles.buildSearchText(articleData);

    return articleData;
  },

  /**
   * Upsert a batch of articles into storage in a single read-modify-write cycle.
   * @param {Array} articles - Processed article objects with stable IDs
   */
  async _upsertBatch(articles) {
    const allStored = await Storage.getArticles();

    // Build a fast lookup of existing articles by ID
    const byId = new Map();
    for (const a of allStored) {
      byId.set(a.id, a);
    }

    for (const article of articles) {
      const existing = byId.get(article.id);
      if (existing) {
        byId.set(article.id, {
          ...article,
          createdAt: existing.createdAt,  // preserve original createdAt
          updatedAt: article.updatedAt
        });
      } else {
        byId.set(article.id, article);
      }
    }

    await Storage.setArticles(Array.from(byId.values()));
  },

  /**
   * Delete all articles with source "bundled_json" from storage.
   * @returns {Promise<{success:boolean, count:number, message:string}>}
   */
  async clearBundledJsonArticles() {
    try {
      const all = await Storage.getArticles();
      const toKeep  = all.filter(a => a.source !== 'bundled_json');
      const removed = all.length - toKeep.length;
      await Storage.setArticles(toKeep);
      return {
        success: true,
        count: removed,
        message: `Deleted ${removed} bundled JSON article${removed === 1 ? '' : 's'}`
      };
    } catch (err) {
      console.error('[JsonKnowledgeImporter] clearBundledJsonArticles error:', err);
      return { success: false, count: 0, message: `Error: ${err.message}` };
    }
  },

  /**
   * Return the number of articles currently stored with source "bundled_json".
   * @returns {Promise<number>}
   */
  async getBundledJsonArticlesCount() {
    try {
      const all = await Storage.getArticles();
      return all.filter(a => a.source === 'bundled_json').length;
    } catch (_) {
      return 0;
    }
  }
};

if (typeof window !== 'undefined') {
  window.JsonKnowledgeImporter = JsonKnowledgeImporter;
}
