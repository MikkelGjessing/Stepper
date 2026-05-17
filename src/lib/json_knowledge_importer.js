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
  DIAGNOSTIC_RECORD_LIMIT: 3,
  PREVIEW_MAX_LENGTH: 120,

  BODY_FIELD_CANDIDATES: [
    'body',
    'bodyHtml',
    'body_html',
    'text',
    'html',
    'content',
    'article',
    'articleBody',
    'article_body',
    'description',
    'procedure',
    'instructions',
    'workInstructions',
    'work_instructions',
    'comments',
    'knowledgeArticle',
    'knowledge_article'
  ],

  NESTED_BODY_PATHS: [
    'fields.text',
    'fields.body',
    'fields.description',
    'article.text',
    'article.body',
    'result.text',
    'result.body',
    'content.html',
    'content.text'
  ],

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
    let articlesWithBody = 0;
    let articlesMissingBody = 0;
    const bodyFieldUsage = {};
    const importedAt = new Date().toISOString();

    // Process in batches to avoid blocking the UI
    for (let start = 0; start < total; start += this.BATCH_SIZE) {
      const batch = records.slice(start, start + this.BATCH_SIZE);
      const articlesToStore = [];

      for (let i = 0; i < batch.length; i++) {
        const raw = batch[i];
        try {
          const processed = this._processRecord(raw, importedAt, start + i);
          if (processed && processed.article) {
            articlesToStore.push(processed.article);
            if (processed.hasBody) {
              articlesWithBody++;
              if (processed.selectedBodyField) {
                bodyFieldUsage[processed.selectedBodyField] =
                  (bodyFieldUsage[processed.selectedBodyField] || 0) + 1;
              }
            } else {
              articlesMissingBody++;
            }
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

    const mostCommonBodyFields = Object.entries(bodyFieldUsage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([field, count]) => `${field} (${count})`);

    console.log('[JsonKnowledgeImporter] Import summary');
    console.log(`[JsonKnowledgeImporter] Total articles found: ${total}`);
    console.log(`[JsonKnowledgeImporter] Articles with body: ${articlesWithBody}`);
    console.log(`[JsonKnowledgeImporter] Articles missing body: ${articlesMissingBody}`);
    console.log(`[JsonKnowledgeImporter] Most common body field names used: ${mostCommonBodyFields.join(', ') || '(none)'}`);

    const baseMsg = `Imported ${imported} of ${total} articles`;
    const summaryMsg = `with body: ${articlesWithBody}, missing body: ${articlesMissingBody}, most common body fields: ${mostCommonBodyFields.join(', ') || 'none'}`;
    const skippedMsg = skipped > 0 ? `, skipped ${skipped}` : '';
    return {
      ok: true,
      imported,
      skipped,
      total,
      withBody: articlesWithBody,
      missingBody: articlesMissingBody,
      mostCommonBodyFields,
      message: `${baseMsg} (${summaryMsg})${skippedMsg}`
    };
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
  _processRecord(raw, importedAt, recordIndex = -1) {
    if (!raw || typeof raw !== 'object') return null;

    const availableKeys = Object.keys(raw);

    // ── Field mapping ────────────────────────────────────────────────────────

    // ID
    const originalId =
      raw.id         || raw.articleId   || raw.sys_id ||
      raw.number     || raw.kb_number   || null;

    // Title
    const titleResult = this._resolveTitle(raw);
    const rawTitle = titleResult.title;

    // Body / content (HTML preferred; plain text accepted)
    const bodyResult = this._resolveBody(raw);

    if (recordIndex >= 0 && recordIndex < this.DIAGNOSTIC_RECORD_LIMIT) {
      const bodyCandidates = {};
      for (const field of this.BODY_FIELD_CANDIDATES) {
        bodyCandidates[field] = this._previewValue(raw[field]);
      }
      console.log('[JsonKnowledgeImporter] JSON article keys', availableKeys);
      console.log('[JsonKnowledgeImporter] Title field used', titleResult.fieldUsed);
      console.log('[JsonKnowledgeImporter] Body candidates', bodyCandidates);
      console.log('[JsonKnowledgeImporter] Candidate body fields found', bodyResult.candidateFieldsFound);
      console.log('[JsonKnowledgeImporter] Selected body field', bodyResult.selectedField || '(none)');
      console.log('[JsonKnowledgeImporter] Selected body length', bodyResult.body.length);
    }

    // Summary
    const rawSummary =
      this._firstNonEmptyString([
        raw.summary,
        raw.short_description,
        this._getByPath(raw, 'metadata.short_description'),
        raw.description
      ]) || '';

    // Tags
    let rawTags = raw.tags || raw.keywords || raw.sys_tags || [];
    if (typeof rawTags === 'string') {
      rawTags = rawTags.split(/[,;|]/).map(t => t.trim()).filter(Boolean);
    }
    const tags = Array.isArray(rawTags) ? rawTags.map(String) : [];

    // ── Build HTML for the ingestion pipeline ───────────────────────────────
    const selectedBody = (bodyResult.body || '').trim();
    const hasBody = Boolean(selectedBody);
    const rawHtml = hasBody && bodyResult.isHtml ? selectedBody : '';
    const rawText = hasBody && !bodyResult.isHtml ? selectedBody : '';

    let htmlContent = rawHtml || rawText;

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
    let titleSource = rawTitle.trim() ? titleResult.fieldUsed : 'fallback';
    let parseStatus = 'missing_body';

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
        parseStatus =
          parserMeta && parserMeta.parserName !== 'fallbackSingleStepParser'
            ? 'parsed_structured'
            : 'parsed_fallback';
      } catch (_) {
        // Ingestion failed — fall back to a single raw step
        steps = [{
          index: 1,
          title: 'Procedure',
          bodyHtml: `<p>${Articles.escapeHtml(Articles.stripHtmlTags(htmlContent).substring(0, 2000))}</p>`,
          images: []
        }];
        parseStatus = 'parsed_fallback';
      }
    } else {
      // No content — still create the article if it has a title
      if (!resolvedTitle || resolvedTitle === 'Untitled article') return null;
      steps = [{
        index: 1,
        title: 'Procedure',
        bodyHtml: '<p>No article body was found in the JSON record.</p>',
        images: []
      }];
      parseStatus = 'missing_body';
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
      parseStatus,
      source:              'bundled_json',
      sourceMeta: {
        importedAt,
        originalId:     originalId ? String(originalId) : null,
        originalNumber: raw.number  || raw.kb_number || null,
        selectedBodyField: bodyResult.selectedField || null,
        availableKeys
      },
      createdAt:           importedAt,
      updatedAt:           importedAt
    };
    articleData.searchText = Articles.buildSearchText(articleData);

    return {
      article: articleData,
      hasBody,
      selectedBodyField: bodyResult.selectedField
    };
  },

  _resolveTitle(raw) {
    const titleCandidates = [
      { field: 'title', value: raw.title },
      { field: 'articleTitle', value: raw.articleTitle },
      { field: 'short_description', value: raw.short_description },
      { field: 'name', value: raw.name },
      { field: 'heading', value: raw.heading },
      { field: 'metadata.short_description', value: this._getByPath(raw, 'metadata.short_description') }
    ];
    for (const candidate of titleCandidates) {
      const value = this._extractScalarString(candidate.value);
      if (value) return { title: value, fieldUsed: candidate.field };
    }
    return { title: '', fieldUsed: 'fallback' };
  },

  _resolveBody(raw) {
    const candidateFieldsFound = [];
    let selectedField = null;
    let selected = { body: '', isHtml: false };

    for (const field of this.BODY_FIELD_CANDIDATES) {
      const valueResult = this._extractContentValue(raw[field], new WeakSet());
      if (valueResult.body) {
        candidateFieldsFound.push(field);
        if (!selectedField) {
          selectedField = field;
          selected = valueResult;
        }
      }
    }

    for (const path of this.NESTED_BODY_PATHS) {
      const valueResult = this._extractContentValue(this._getByPath(raw, path), new WeakSet());
      if (valueResult.body) {
        candidateFieldsFound.push(path);
        if (!selectedField) {
          selectedField = path;
          selected = valueResult;
        }
      }
    }

    // Summary fallback: only if no real body candidate exists.
    if (!selectedField) {
      const summaryFallbackCandidates = [
        { field: 'summary', value: raw.summary },
        { field: 'short_description', value: raw.short_description },
        { field: 'metadata.short_description', value: this._getByPath(raw, 'metadata.short_description') }
      ];
      for (const fallback of summaryFallbackCandidates) {
        const valueResult = this._extractContentValue(fallback.value, new WeakSet());
        if (valueResult.body) {
          selectedField = fallback.field;
          selected = valueResult;
          break;
        }
      }
    }

    return {
      body: selected.body,
      isHtml: Boolean(selected.isHtml),
      selectedField,
      candidateFieldsFound
    };
  },

  _extractContentValue(value, seen) {
    if (value === null || value === undefined) return { body: '', isHtml: false };

    if (typeof value === 'string') {
      const trimmed = value.trim();
      return { body: trimmed, isHtml: /<\w[^>]*>/.test(trimmed) };
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return { body: String(value), isHtml: false };
    }

    if (Array.isArray(value)) {
      return this._extractFromArray(value, seen);
    }

    if (typeof value === 'object') {
      if (seen.has(value)) return { body: '', isHtml: false };
      seen.add(value);

      // ServiceNow-like display/value object.
      const hasValue = Object.prototype.hasOwnProperty.call(value, 'value');
      const hasDisplayValue = Object.prototype.hasOwnProperty.call(value, 'display_value');
      if (hasValue || hasDisplayValue) {
        const valuePart = this._extractContentValue(value.value, seen);
        const displayPart = this._extractContentValue(value.display_value, seen);
        const valueLen = this._contentLength(valuePart.body);
        const displayLen = this._contentLength(displayPart.body);
        if (valuePart.body && (valuePart.isHtml || valueLen >= displayLen)) {
          return valuePart;
        }
        if (displayPart.body) return displayPart;
        return valuePart.body ? valuePart : { body: '', isHtml: false };
      }

      // Common content-block object keys.
      const objectFieldPriority = this.BODY_FIELD_CANDIDATES;
      for (const key of objectFieldPriority) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          const nested = this._extractContentValue(value[key], seen);
          if (nested.body) return nested;
        }
      }

      return { body: '', isHtml: false };
    }

    return { body: '', isHtml: false };
  },

  _extractFromArray(items, seen) {
    const parts = [];
    let hasHtml = false;

    for (const item of items) {
      const extracted = this._extractContentValue(item, seen);
      if (!extracted.body) continue;
      parts.push(extracted);
      if (extracted.isHtml) hasHtml = true;
    }

    if (parts.length === 0) return { body: '', isHtml: false };

    if (hasHtml) {
      return {
        body: parts.map((part) => {
          if (part.isHtml) return part.body;
          const escaped = Articles.escapeHtml(part.body);
          return escaped
            .split(/\n{2,}/)
            .map((block) => `<p>${block.replace(/\n/g, '<br>')}</p>`)
            .join('\n');
        }).join('\n'),
        isHtml: true
      };
    }

    return {
      body: parts.map(part => part.body).join('\n\n'),
      isHtml: false
    };
  },

  _extractScalarString(value) {
    const extracted = this._extractContentValue(value, new WeakSet());
    return extracted.body || '';
  },

  _getByPath(obj, path) {
    return path.split('.').reduce((current, key) => {
      if (!current || typeof current !== 'object') return undefined;
      return current[key];
    }, obj);
  },

  _firstNonEmptyString(values) {
    for (const value of values) {
      const extracted = this._extractScalarString(value);
      if (extracted) return extracted;
    }
    return '';
  },

  _previewValue(value) {
    const extracted = this._extractContentValue(value, new WeakSet());
    if (!extracted.body) return null;
    return extracted.body.length > this.PREVIEW_MAX_LENGTH
      ? `${extracted.body.substring(0, this.PREVIEW_MAX_LENGTH)}…`
      : extracted.body;
  },

  _contentLength(content) {
    if (!content) return 0;
    return Articles.stripHtmlTags(String(content)).trim().length;
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
