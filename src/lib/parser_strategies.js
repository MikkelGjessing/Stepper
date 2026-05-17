/**
 * Parser Strategy Registry
 *
 * Strategy order (most structured first):
 *   1) procedureTableParser
 *   2) explicitStepParser
 *   3) numberedListParser
 *   4) headingSectionParser
 *   5) paragraphActionParser
 *   6) fallbackSingleStepParser
 */

// Allow longer procedural titles so imported steps are not over-truncated.
const MAX_TITLE_LENGTH = 140;
const MIN_BODY_LENGTH_WITH_NOISE_TITLE = 20;
const MAX_TAG_BLOCK_LENGTH = 120;

const STRATEGY_PRIORITY = {
  procedureTableParser: 1,
  explicitStepParser: 2,
  numberedListParser: 3,
  headingSectionParser: 4,
  paragraphActionParser: 5,
  fallbackSingleStepParser: 6
};

const ACTION_VERBS = [
  'Open', 'Click', 'Select', 'Enter', 'Type', 'Choose', 'Go to', 'Navigate', 'Press',
  'Confirm', 'Save', 'Search', 'Find', 'Copy', 'Paste', 'Check', 'Verify', 'Ensure'
];
const ACTION_VERB_REGEX = new RegExp(
  `^(?:${ACTION_VERBS
    .map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .sort((a, b) => b.length - a.length)
    .join('|')})\\b`,
  'i'
);

function _tmpDiv(html) {
  const div = document.createElement('div');
  div.innerHTML = html || '';
  return div;
}

function _extractTitleFromText(text) {
  const cleaned = (text || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'Step';
  const sentence = cleaned.split(/[.!?](?:\s|$)/)[0].trim() || cleaned;
  return sentence.length > MAX_TITLE_LENGTH ? sentence.substring(0, MAX_TITLE_LENGTH) : sentence;
}

function _buildStep(title, bodyEl) {
  const images = ArticleNormalizer.extractImages(bodyEl);
  const sanitized = ArticleNormalizer.sanitizeHtmlContent(bodyEl);
  return {
    title: (title || 'Step').trim() || 'Step',
    bodyHtml: sanitized.innerHTML,
    images
  };
}

function _stripHtml(html) {
  return ArticleNormalizer.stripHtmlTags(html || '');
}

function _isLikelyNoise(text) {
  const t = (text || '').trim();
  if (!t) return true;
  if (/^(?:step(?:\s*\d+)?|\d+|#)$/i.test(t)) return true;
  if (/^(?:keywords?|tags?)\s*[:\-]?$/i.test(t)) return true;
  if (/^(?:change\s+log|revision\s+history)\s*[:\-]?$/i.test(t)) return true;
  return false;
}

function _isCredibleStep(step) {
  if (!step || typeof step !== 'object') return false;
  const bodyText = _stripHtml(step.bodyHtml).trim();
  const title = (step.title || '').trim();
  const hasImages = Array.isArray(step.images) && step.images.length > 0;
  if (!bodyText && !hasImages) return false;
  if (_isLikelyNoise(title) && bodyText.length < MIN_BODY_LENGTH_WITH_NOISE_TITLE) return false;
  if (/^(?:change\s+log|revision\s+history)$/i.test(bodyText)) return false;
  if (/^(?:keywords?|tags?)\s*[:\-]?\s*[\w\s,;|_-]+$/i.test(bodyText) && bodyText.length < MAX_TAG_BLOCK_LENGTH) return false;
  return true;
}

function _finalizeSteps(steps, parserName) {
  const normalized = (Array.isArray(steps) ? steps : [])
    .map((step, i) => ({
      ...step,
      index: i + 1,
      displayNumber: step.displayNumber || i + 1,
      parserStrategy: parserName
    }));

  const credible = normalized.filter(_isCredibleStep);
  if (credible.length > 0) {
    return credible.map((step, i) => ({ ...step, index: i + 1 }));
  }
  return normalized;
}

function _buildParserMeta(parserName, parserScore, selectionReasons, normalizedArticle, steps, warnings) {
  const sectionHeadings = (normalizedArticle.sections || []).map(s => s.heading);
  const procedureSectionFound = (normalizedArticle.sections || []).some(s => s.headingType === 'procedure');
  const procedureHtml = normalizedArticle.procedureHtml || '';

  return {
    parserName,
    parserScore,
    parsingWarnings: Array.isArray(warnings) ? warnings : [],
    stepCount: steps.length,
    selectionReasons: Array.isArray(selectionReasons) ? selectionReasons : [],
    sectionHeadings,
    procedureSectionFound,
    hasNotes: /(?:Note|Warning|Important|Tip)[!:]/i.test(procedureHtml),
    hasImages: (normalizedArticle.images || []).length > 0,
    hasTables: /<table/i.test(procedureHtml)
  };
}

function _extractPreferredProcedureHtml(normalizedArticle) {
  const sourceHtml = normalizedArticle.procedureHtml || '';
  if (!sourceHtml) return '';

  const container = _tmpDiv(sourceHtml);
  const nodes = Array.from(container.childNodes).filter(n => n.nodeType === Node.ELEMENT_NODE);

  let collecting = false;
  let hasProcedureHeading = false;
  const out = document.createElement('div');

  for (const node of nodes) {
    const isHeading = /^H[1-6]$/.test(node.tagName || '');
    const headingText = isHeading ? node.textContent.trim() : '';

    if (isHeading && ArticleNormalizer.isProcedureSectionHeading(headingText)) {
      collecting = true;
      hasProcedureHeading = true;
      out.appendChild(node.cloneNode(true));
      continue;
    }

    if (isHeading && (ArticleNormalizer.isSkipSectionHeading(headingText)
      || ArticleNormalizer.isIntroSectionHeading(headingText)
      || ArticleNormalizer.isTagsSectionHeading(headingText))) {
      if (collecting) break;
      continue;
    }

    if (collecting) {
      out.appendChild(node.cloneNode(true));
    }
  }

  return hasProcedureHeading ? out.innerHTML : sourceHtml;
}

const procedureTableParser = {
  name: 'procedureTableParser',

  canParse(normalizedArticle) {
    const reasons = [];
    const container = _tmpDiv(_extractPreferredProcedureHtml(normalizedArticle));
    const tables = Array.from(container.querySelectorAll('table'));
    if (tables.length === 0) return { score: 0, reasons: ['no procedure table found'] };

    const STEP_COL = /^(?:step|no\.?|#|nr\.?|step\s*#)$/i;
    const ACTION_COL = /^(?:action|instruction|task|description|details?|image\s*(?:&|and)\s*details?|what\s+to\s+do)$/i;

    let best = 0;
    for (const table of tables) {
      const headerRow = table.querySelector('thead tr') || table.querySelector('tr');
      if (!headerRow) continue;
      const headers = Array.from(headerRow.querySelectorAll('th, td')).map(c => c.textContent.trim());
      const hasStep = headers.some(h => STEP_COL.test(h));
      const hasAction = headers.some(h => ACTION_COL.test(h));
      if (hasStep && hasAction) {
        best = Math.max(best, 95);
      } else if (hasAction) {
        best = Math.max(best, 85);
      }
    }

    if (best > 0) reasons.push('procedural table headers detected');
    return { score: best, reasons: reasons.length ? reasons : ['table found but headers are weak'] };
  },

  parse(normalizedArticle) {
    const warnings = [];
    const container = _tmpDiv(_extractPreferredProcedureHtml(normalizedArticle));
    const tables = Array.from(container.querySelectorAll('table'));
    const steps = [];

    let startIndex = 1;
    for (const table of tables) {
      const tableSteps = Articles.extractTableSteps(table, startIndex);
      if (tableSteps.length > 0) {
        steps.push(...tableSteps);
        startIndex += tableSteps.length;
      }
    }

    if (steps.length === 0) warnings.push('No procedural rows extracted from table content');
    return { steps: _finalizeSteps(steps, this.name), warnings };
  }
};

const explicitStepParser = {
  name: 'explicitStepParser',

  canParse(normalizedArticle) {
    const reasons = [];
    const container = _tmpDiv(_extractPreferredProcedureHtml(normalizedArticle));
    const blocks = Array.from(container.querySelectorAll('p, h1, h2, h3, h4, h5, h6'));

    const explicitMarkers = blocks.filter(el => /^step\s*\d+(?:\s*[:\-–]|\s*$)/i.test(el.textContent.trim()));
    if (explicitMarkers.length >= 2) {
      reasons.push(`${explicitMarkers.length} explicit Step N markers`);
      return { score: 92, reasons };
    }

    const numberedParas = blocks.filter(el => /^\d+[.)]\s+\S/.test(el.textContent.trim()));
    if (numberedParas.length >= 3) {
      reasons.push(`${numberedParas.length} numbered procedural paragraphs`);
      return { score: 72, reasons };
    }
    if (numberedParas.length === 2) {
      reasons.push('2 numbered procedural paragraphs');
      return { score: 58, reasons };
    }

    return { score: 0, reasons: ['no explicit step markers or numbered paragraphs found'] };
  },

  parse(normalizedArticle) {
    const warnings = [];
    const procedureHtml = _extractPreferredProcedureHtml(normalizedArticle);
    let steps = [];

    try {
      const parser = new DOMParser();
      const tmpDoc = parser.parseFromString(`<body>${procedureHtml}</body>`, 'text/html');
      steps = Articles.segmentIntoSteps(tmpDoc);
    } catch (_) {
      warnings.push('DOM parse failed while extracting explicit steps');
    }

    if (!Array.isArray(steps) || steps.length === 0) {
      warnings.push('Explicit markers detected but no steps extracted');
      steps = [];
    }

    return { steps: _finalizeSteps(steps, this.name), warnings };
  }
};

const numberedListParser = {
  name: 'numberedListParser',

  canParse(normalizedArticle) {
    const reasons = [];
    const container = _tmpDiv(_extractPreferredProcedureHtml(normalizedArticle));
    const topLevelLists = Array.from(container.children).filter(el => el.tagName === 'OL');
    const topLevelCount = topLevelLists.reduce((n, ol) => n + Array.from(ol.children).filter(li => li.tagName === 'LI').length, 0);

    if (topLevelCount >= 2) {
      reasons.push(`top-level ordered list with ${topLevelCount} items`);
      return { score: 76, reasons };
    }

    return { score: 0, reasons: ['no procedural ordered list found'] };
  },

  parse(normalizedArticle) {
    const container = _tmpDiv(_extractPreferredProcedureHtml(normalizedArticle));
    const warnings = [];
    const steps = [];

    const topLevelLists = Array.from(container.children).filter(el => el.tagName === 'OL');
    for (const ol of topLevelLists) {
      const lis = Array.from(ol.children).filter(li => li.tagName === 'LI');
      lis.forEach((li) => {
        const title = _extractTitleFromText(li.textContent);
        const div = document.createElement('div');
        div.appendChild(li.cloneNode(true));
        steps.push(_buildStep(title, div));
      });
    }

    if (steps.length === 0) warnings.push('No top-level list items extracted');
    return { steps: _finalizeSteps(steps, this.name), warnings };
  }
};

const headingSectionParser = {
  name: 'headingSectionParser',

  canParse(normalizedArticle) {
    const reasons = [];
    const container = _tmpDiv(_extractPreferredProcedureHtml(normalizedArticle));

    const headings = Array.from(container.querySelectorAll('h2, h3, h4')).filter(h => {
      const text = h.textContent.trim();
      if (!text) return false;
      if (ArticleNormalizer.isProcedureSectionHeading(text)) return false;
      if (ArticleNormalizer.isSkipSectionHeading(text)) return false;
      if (ArticleNormalizer.isIntroSectionHeading(text)) return false;
      if (ArticleNormalizer.isTagsSectionHeading(text)) return false;
      return true;
    });

    if (headings.length >= 2) {
      reasons.push(`${headings.length} meaningful subsection headings in procedure area`);
      return { score: 62, reasons };
    }

    return { score: 0, reasons: ['insufficient subsection headings'] };
  },

  parse(normalizedArticle) {
    const container = _tmpDiv(_extractPreferredProcedureHtml(normalizedArticle));
    const warnings = [];
    const steps = [];

    const headings = Array.from(container.querySelectorAll('h2, h3, h4')).filter(h => {
      const text = h.textContent.trim();
      return text
        && !ArticleNormalizer.isProcedureSectionHeading(text)
        && !ArticleNormalizer.isSkipSectionHeading(text)
        && !ArticleNormalizer.isIntroSectionHeading(text)
        && !ArticleNormalizer.isTagsSectionHeading(text);
    });

    headings.forEach((heading) => {
      const stepBody = document.createElement('div');
      let node = heading.nextElementSibling;
      while (node && !/^H[1-6]$/.test(node.tagName || '')) {
        stepBody.appendChild(node.cloneNode(true));
        node = node.nextElementSibling;
      }

      const bodyText = _stripHtml(stepBody.innerHTML);
      if (!bodyText.trim() && stepBody.querySelectorAll('img, table').length === 0) return;
      steps.push(_buildStep(heading.textContent.trim(), stepBody));
    });

    if (steps.length === 0) warnings.push('No subsection blocks produced usable steps');
    return { steps: _finalizeSteps(steps, this.name), warnings };
  }
};

const paragraphActionParser = {
  name: 'paragraphActionParser',

  _actionRegex() {
    return ACTION_VERB_REGEX;
  },

  canParse(normalizedArticle) {
    const reasons = [];
    const container = _tmpDiv(_extractPreferredProcedureHtml(normalizedArticle));
    const actionRe = this._actionRegex();
    const paragraphs = Array.from(container.querySelectorAll('p')).map(p => p.textContent.trim()).filter(Boolean);
    const actionParagraphs = paragraphs.filter(p => actionRe.test(p));

    if (actionParagraphs.length >= 3) {
      reasons.push(`${actionParagraphs.length} imperative action paragraphs`);
      return { score: 48, reasons };
    }
    if (actionParagraphs.length === 2) {
      reasons.push('2 imperative action paragraphs');
      return { score: 34, reasons };
    }

    return { score: 0, reasons: ['insufficient imperative paragraph pattern'] };
  },

  parse(normalizedArticle) {
    const warnings = [];
    const container = _tmpDiv(_extractPreferredProcedureHtml(normalizedArticle));
    const actionRe = this._actionRegex();
    const steps = [];

    const blocks = Array.from(container.childNodes).filter(n => n.nodeType === Node.ELEMENT_NODE);
    let current = null;

    const flush = () => {
      if (!current) return;
      steps.push(_buildStep(current.title, current.body));
      current = null;
    };

    for (const node of blocks) {
      const text = node.textContent.trim();
      if (!text) continue;

      if ((node.tagName === 'P' || /^H[1-6]$/.test(node.tagName || '')) && actionRe.test(text)) {
        flush();
        const body = document.createElement('div');
        body.appendChild(node.cloneNode(true));
        current = { title: _extractTitleFromText(text), body };
        continue;
      }

      if (current) {
        current.body.appendChild(node.cloneNode(true));
      }
    }

    flush();

    if (steps.length === 0) warnings.push('No actionable paragraph clusters extracted');
    return { steps: _finalizeSteps(steps, this.name), warnings };
  }
};

const fallbackSingleStepParser = {
  name: 'fallbackSingleStepParser',

  canParse() {
    return { score: 1, reasons: ['fallback strategy'] };
  },

  parse(normalizedArticle) {
    const html = _extractPreferredProcedureHtml(normalizedArticle) || normalizedArticle.procedureHtml || '';
    const div = _tmpDiv(html);
    const steps = _finalizeSteps([
      _buildStep(_extractTitleFromText(_stripHtml(html) || 'Procedure'), div)
    ], this.name);

    return {
      steps,
      warnings: ['Fallback parser used because no stronger structure was detected']
    };
  }
};

const parserStrategies = [
  procedureTableParser,
  explicitStepParser,
  numberedListParser,
  headingSectionParser,
  paragraphActionParser,
  fallbackSingleStepParser
];

const ParserRegistry = {
  strategies: parserStrategies,

  _sortByScoreAndPriority(results) {
    return results.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return STRATEGY_PRIORITY[a.strategy.name] - STRATEGY_PRIORITY[b.strategy.name];
    });
  },

  _evaluateStrategies(normalizedArticle) {
    return this.strategies.map(strategy => {
      const can = strategy.canParse(normalizedArticle) || { score: 0, reasons: [] };
      return {
        strategy,
        score: Number.isFinite(can.score) ? can.score : 0,
        reasons: Array.isArray(can.reasons) ? can.reasons : []
      };
    });
  },

  _pickBestNonFallbackMultiStep(normalizedArticle, scored) {
    const candidates = [];

    for (const item of scored) {
      if (item.strategy.name === 'fallbackSingleStepParser') continue;
      if (item.score <= 0) continue;

      const parsed = item.strategy.parse(normalizedArticle);
      const steps = Array.isArray(parsed.steps) ? parsed.steps : [];
      const credible = steps.filter(_isCredibleStep);
      if (credible.length > 1) {
        candidates.push({ ...item, parsed, credibleCount: credible.length });
      }
    }

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const pa = STRATEGY_PRIORITY[a.strategy.name];
      const pb = STRATEGY_PRIORITY[b.strategy.name];
      if (pa !== pb) return pa - pb;
      return b.credibleCount - a.credibleCount;
    });

    return candidates[0];
  },

  run(normalizedArticle) {
    const scored = this._sortByScoreAndPriority(this._evaluateStrategies(normalizedArticle));
    const selected = scored[0];

    let chosen = {
      ...selected,
      parsed: selected.strategy.parse(normalizedArticle)
    };

    const chosenCredibleCount = (chosen.parsed.steps || []).filter(_isCredibleStep).length;
    if (chosen.strategy.name === 'fallbackSingleStepParser' || chosenCredibleCount <= 1) {
      const better = this._pickBestNonFallbackMultiStep(normalizedArticle, scored);
      if (better) chosen = better;
    }

    let steps = Array.isArray(chosen.parsed.steps) ? chosen.parsed.steps : [];
    if (steps.length === 0) {
      const fb = fallbackSingleStepParser.parse(normalizedArticle);
      steps = fb.steps;
      chosen.strategy = fallbackSingleStepParser;
      chosen.score = fallbackSingleStepParser.canParse(normalizedArticle).score;
      chosen.reasons = ['all non-fallback strategies produced zero steps'];
      chosen.parsed = fb;
    }

    const parserMeta = _buildParserMeta(
      chosen.strategy.name,
      chosen.score,
      chosen.reasons,
      normalizedArticle,
      steps,
      chosen.parsed.warnings || []
    );

    return { steps, parserMeta };
  }
};

if (typeof window !== 'undefined') {
  window.parserStrategies = parserStrategies;
  window.ParserRegistry = ParserRegistry;
}
