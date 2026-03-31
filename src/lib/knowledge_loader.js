/**
 * Knowledge Loader
 * Loads and ingests knowledge base files from the bundled /knowledge folder.
 *
 * Files are listed in knowledge/index.json.  Each file is fetched via
 * chrome.runtime.getURL, parsed with the existing Articles parsers, and
 * stored with source: 'knowledge' so they are searchable.
 *
 * Calling loadKnowledgeFiles() is idempotent by default: previously loaded
 * files are skipped.  Pass { force: true } to re-ingest every listed file.
 *
 * DOCX / PDF parsing requires mammoth / pdf.js to be loaded in the page.
 * Those formats are silently skipped in contexts where the libraries are
 * absent (e.g. the popup side-panel).  The options page loads both libraries
 * and will ingest all supported types.
 */

const DOCX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const KnowledgeLoader = {
  /**
   * Load and ingest all files listed in knowledge/index.json.
   * @param {Object} [options]
   * @param {boolean} [options.force=false] - Re-ingest even already-loaded files
   * @returns {Promise<{ok: boolean, loaded: number, skipped: number, errors: Array}>}
   */
  async loadKnowledgeFiles({ force = false } = {}) {
    const indexUrl = chrome.runtime.getURL('knowledge/index.json');
    let index;
    try {
      const resp = await fetch(indexUrl);
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      index = await resp.json();
    } catch (e) {
      console.warn('KnowledgeLoader: could not fetch knowledge/index.json', e);
      return { ok: false, loaded: 0, skipped: 0, errors: [{ file: 'index.json', error: e.message }] };
    }

    const files = Array.isArray(index.files)
      ? index.files.filter(f => typeof f === 'string' && f.trim())
      : [];

    if (!files.length) {
      return { ok: true, loaded: 0, skipped: 0, errors: [] };
    }

    // Determine which files still need to be loaded
    let alreadyLoaded = {};
    if (!force) {
      const stored = await chrome.storage.local.get('knowledge_loaded_files');
      alreadyLoaded = stored.knowledge_loaded_files || {};
    }

    const pending = force ? files : files.filter(f => !alreadyLoaded[f]);
    const result = { ok: true, loaded: 0, skipped: files.length - pending.length, errors: [] };

    for (const filename of pending) {
      try {
        const ingestResult = await this._ingestFile(filename);
        if (ingestResult.ok) {
          alreadyLoaded[filename] = new Date().toISOString();
          result.loaded++;
          console.log(`KnowledgeLoader: loaded "${filename}"`);
        } else {
          result.errors.push({ file: filename, error: ingestResult.message });
          console.warn(`KnowledgeLoader: skipped "${filename}" – ${ingestResult.message}`);
        }
      } catch (e) {
        result.errors.push({ file: filename, error: e.message });
        console.error(`KnowledgeLoader: error loading "${filename}"`, e);
      }
    }

    // Persist the updated loaded-files registry
    await chrome.storage.local.set({ knowledge_loaded_files: alreadyLoaded });

    return result;
  },

  /**
   * Fetch a single file from the knowledge folder, parse it, and upsert the
   * resulting article with source: 'knowledge'.
   * @param {string} filename
   * @returns {Promise<{ok: boolean, message?: string, article?: Object}>}
   */
  async _ingestFile(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const fileUrl = chrome.runtime.getURL(`knowledge/${filename}`);
    const fallbackTitle = filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');

    let parseResult;

    if (ext === 'docx' || ext === 'doc') {
      if (typeof mammoth === 'undefined') {
        return { ok: false, message: 'mammoth not available – open Settings to load DOCX files' };
      }
      const resp = await fetch(fileUrl);
      if (!resp.ok) {
        return { ok: false, message: `Failed to fetch "${filename}": HTTP ${resp.status}` };
      }
      const blob = await resp.blob();
      const file = new File([blob], filename, { type: blob.type || DOCX_MIME_TYPE });
      parseResult = await Articles.parseDocxArticle(file, fallbackTitle);

    } else if (ext === 'pdf') {
      if (typeof pdfjsLib === 'undefined') {
        return { ok: false, message: 'pdf.js not available – open Settings to load PDF files' };
      }
      const resp = await fetch(fileUrl);
      if (!resp.ok) {
        return { ok: false, message: `Failed to fetch "${filename}": HTTP ${resp.status}` };
      }
      const blob = await resp.blob();
      const file = new File([blob], filename, { type: 'application/pdf' });
      parseResult = await Articles.parsePdfArticle(file, fallbackTitle);

    } else {
      const resp = await fetch(fileUrl);
      if (!resp.ok) {
        return { ok: false, message: `Failed to fetch "${filename}": HTTP ${resp.status}` };
      }
      const text = await resp.text();

      switch (ext) {
        case 'md':
          parseResult = Articles.parseMarkdownArticle(text, fallbackTitle);
          break;
        case 'txt':
          parseResult = Articles.parseTxtArticle(text, fallbackTitle);
          break;
        case 'json':
          parseResult = Articles.parseJsonArticle(text, fallbackTitle);
          break;
        default:
          return { ok: false, message: `Unsupported file type: .${ext}` };
      }
    }

    if (!parseResult || !parseResult.ok) {
      return parseResult || { ok: false, message: 'Unknown parse error' };
    }

    const article = parseResult.article;
    // Use a stable ID derived from the filename so repeated ingestion updates
    // the existing article rather than creating duplicates.
    article.id = 'knowledge:' + filename;
    article.source = 'knowledge';

    await Articles.upsertArticle(article);
    return { ok: true, article };
  }
};
