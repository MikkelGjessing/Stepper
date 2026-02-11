# Module Architecture Documentation

## Overview

The Stepper extension has been refactored into a clean, modular architecture with well-defined interfaces and separation of concerns. This architecture supports future extensibility, including integration with SAP CRM and other systems.

## Module Structure

```
src/
├── modules/
│   ├── dedupe.js          - Step deduplication utilities
│   ├── kb.mock.js         - Mock knowledge base data
│   ├── pageScanner.js     - Page content scanning (disabled by default)
│   ├── retrieval.js       - Article retrieval with provider interface
│   ├── stepRunner.js      - Step execution state machine
│   └── ui.js              - UI rendering utilities
├── sidepanel.js           - Main UI orchestrator
├── sidepanel.html         - UI markup
├── sidepanel.css          - Styles
├── background.js          - Service worker
├── kb.js                  - (Legacy, may be deprecated)
└── stepper.js             - (Legacy, may be deprecated)
```

## Core Modules

### 1. retrieval.js - Article Retrieval

**Purpose**: Provides an abstraction layer for article retrieval with swappable implementations.

**Key Components**:

#### RetrievalProvider Interface
```javascript
class RetrievalProvider {
  async search(query, options)      // Search articles by query
  async getArticle(id)               // Get article by ID
  async getAllArticles()             // Get all articles
}
```

#### MockRetrievalProvider
Implementation using in-memory mock data with scoring algorithm:
- Tag match: +3 points
- Product match: +2 points  
- Title match: +1 point
- Keyword match: +1 point per keyword

**Extension Points**:
- Create custom providers (e.g., `APIRetrievalProvider`, `SAPCRMRetrievalProvider`)
- Implement the `RetrievalProvider` interface
- Swap implementations without changing UI code

**Usage**:
```javascript
import { MockRetrievalProvider } from './modules/retrieval.js';
const retrieval = new MockRetrievalProvider(mockArticles);
const results = await retrieval.search('email not sending');
```

### 2. stepRunner.js - Step Execution

**Purpose**: Manages step-by-step execution, navigation, and state.

**Key Components**:

#### StepRunner Class
```javascript
class StepRunner {
  startArticle(articleId, article)           // Start new session
  getCurrentStep(article)                    // Get current step
  continue(article)                          // Mark complete & advance
  back()                                     // Go to previous step
  recordFailure(stepId, category, note)      // Record failure
  switchToFallback(id, article, completed)   // Switch to fallback path
  selectFallback(article, all, reason, note) // Select best fallback
}
```

**Features**:
- State management (completed steps, failures, attempted paths)
- Fallback selection algorithm (same-article → cross-article → escalation)
- Integration with deduplication module
- Completion summary generation

**Usage**:
```javascript
import { StepRunner } from './modules/stepRunner.js';
const stepRunner = new StepRunner();
stepRunner.startArticle(1, article);
```

### 3. dedupe.js - Deduplication

**Purpose**: Provides utilities for comparing and deduplicating steps based on text similarity.

**Key Functions**:

```javascript
normalizeToTokens(text)                    // Tokenize text
calculateJaccardSimilarity(tokens1, tokens2) // Calculate similarity
areStepsSimilar(text1, text2, threshold)   // Check if similar
findStepsToSkip(fallbackSteps, completed)  // Find duplicate steps
calculateKeywordOverlap(keywords, tokens)  // Calculate keyword overlap
```

**Configuration**:
```javascript
export const STEP_SIMILARITY_THRESHOLD = 0.6; // Configurable threshold
```

**Algorithm**: 
- Uses Jaccard similarity: `intersection / union`
- Default threshold: 0.6 (60% overlap)
- Exact matches always considered similar

### 4. pageScanner.js - Page Content Scanning

**Purpose**: Provides interface for scanning page content, with architecture for SAP CRM integration.

**Key Components**:

#### PageScanner Interface
```javascript
class PageScanner {
  async scanActivePage()    // Scan active tab
  isEnabled()               // Check if enabled
  enable()                  // Enable scanner
  disable()                 // Disable scanner
}
```

#### DefaultPageScanner
Basic implementation that reads page content:
- Extracts text from DOM
- Captures metadata
- Limits text length (10,000 chars)
- **Disabled by default** for security

#### SAPCRMPageScanner (Placeholder)
Specialized scanner for SAP CRM pages:
- Extract case/ticket numbers
- Parse product information
- Read error messages
- Identify workflow state
- **TODO**: Full implementation

**Factory**:
```javascript
import { createPageScanner } from './modules/pageScanner.js';
const scanner = createPageScanner('default');  // or 'sap-crm'
```

**Security**: Requires `activeTab` and `scripting` permissions in manifest.json.

### 5. ui.js - UI Utilities

**Purpose**: Provides reusable UI rendering functions and helpers.

**Key Functions**:

```javascript
showNotification(message, options)         // Show user notifications
formatReason(reason)                       // Format failure reasons
renderArticleItem(article, onClick)        // Render article in list
renderCompletedStep(step)                  // Render completed step
renderFailureNote(failure, step)           // Render failure note
populateFullArticle(article, container)    // Populate article content
escapeHtml(text)                           // XSS protection
updateStepProgress(element, current, total) // Update progress
```

**Security**: All rendering functions use `escapeHtml()` to prevent XSS attacks.

### 6. kb.mock.js - Mock Data

**Purpose**: Provides sample knowledge base articles for testing and development.

**Contents**:
- 5 sample articles with full schema
- Prechecks, steps, fallbacks, escalation
- Intentional overlap for deduplication testing
- Various failure scenarios

## Main Orchestrator

### sidepanel.js

**Purpose**: Main UI controller that orchestrates all modules.

**Responsibilities**:
- Initialize all modules
- Handle DOM events
- Coordinate between modules
- Manage UI state transitions
- Keyboard shortcuts

**Module Integration**:
```javascript
import { MockRetrievalProvider } from './modules/retrieval.js';
import { StepRunner } from './modules/stepRunner.js';
import { createPageScanner } from './modules/pageScanner.js';
import { showNotification, renderArticleItem } from './modules/ui.js';

const retrieval = new MockRetrievalProvider(mockArticles);
const stepRunner = new StepRunner();
const pageScanner = createPageScanner('default');
```

## Extension Points for SAP CRM Integration

### 1. Custom Retrieval Provider

Create `SAPCRMRetrievalProvider`:

```javascript
import { RetrievalProvider } from './modules/retrieval.js';

export class SAPCRMRetrievalProvider extends RetrievalProvider {
  constructor(apiEndpoint, apiKey) {
    super();
    this.apiEndpoint = apiEndpoint;
    this.apiKey = apiKey;
  }
  
  async search(query, options) {
    // Call SAP CRM API
    const response = await fetch(`${this.apiEndpoint}/search`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
      body: JSON.stringify({ query, ...options })
    });
    return response.json();
  }
  
  // Implement other interface methods...
}
```

### 2. SAP CRM Page Scanner

Implement `SAPCRMPageScanner._extractSAPContent()`:

```javascript
_extractSAPContent() {
  // Look for SAP-specific DOM structures
  const caseNumber = document.querySelector('[data-sap-case-id]')?.textContent;
  const product = document.querySelector('.sap-product-info')?.textContent;
  
  // Extract error messages from SAP UI
  const errorMessages = Array.from(
    document.querySelectorAll('.sapMMessageBox')
  ).map(el => el.textContent);
  
  return {
    caseNumber,
    product,
    status: this._extractWorkflowStatus(),
    errorMessages,
    customerInfo: this._extractCustomerData()
  };
}
```

### 3. Integration Flow

```javascript
// In sidepanel.js, configure based on environment
const scannerType = isInSAPCRM() ? 'sap-crm' : 'default';
const pageScanner = createPageScanner(scannerType);

// Enable scanner in SAP CRM environment
if (isInSAPCRM()) {
  pageScanner.enable();
  
  // Use scanned content for article search
  const pageContent = await pageScanner.scanActivePage();
  if (pageContent) {
    const query = extractQueryFromSAPContent(pageContent);
    const results = await retrieval.search(query);
    // Present results to user
  }
}
```

## Module Dependencies

```
sidepanel.js
  ├── retrieval.js (MockRetrievalProvider)
  │   └── kb.mock.js
  ├── stepRunner.js (StepRunner)
  │   └── dedupe.js
  ├── pageScanner.js (PageScanner)
  └── ui.js
```

## Permissions Required

**manifest.json**:
```json
{
  "permissions": [
    "sidePanel",      // For side panel UI
    "activeTab",      // For page scanning
    "scripting"       // For content extraction
  ],
  "host_permissions": [
    "<all_urls>"      // For page scanning (can be restricted)
  ]
}
```

## Migration Guide

### From Old Architecture

**Before**:
```javascript
import KnowledgeBase from './kb.js';
import StepperStateMachine from './stepper.js';

const kb = new KnowledgeBase();
kb.loadArticles(mockArticles);
const stepper = new StepperStateMachine();
```

**After**:
```javascript
import { MockRetrievalProvider } from './modules/retrieval.js';
import { StepRunner } from './modules/stepRunner.js';

const retrieval = new MockRetrievalProvider(mockArticles);
const stepRunner = new StepRunner();
```

### Key Changes

1. `KnowledgeBase` → `MockRetrievalProvider`
2. `StepperStateMachine` → `StepRunner`
3. Deduplication extracted to `dedupe.js`
4. UI functions extracted to `ui.js`
5. New `pageScanner.js` for future scanning

## Testing

All functionality has been tested and verified:
- ✅ Article selection works
- ✅ Step navigation works
- ✅ Fallback selection works
- ✅ Deduplication works
- ✅ UI rendering works
- ✅ Search functionality works
- ✅ Keyboard shortcuts work

## Future Enhancements

1. **API Integration**: Implement `APIRetrievalProvider` for remote KB
2. **SAP CRM Scanner**: Complete `SAPCRMPageScanner` implementation
3. **Analytics**: Add module for tracking usage and effectiveness
4. **Caching**: Add caching layer to retrieval module
5. **Offline Support**: Add offline storage module

## Best Practices

1. **Interface-based Design**: Always code to interfaces, not implementations
2. **Single Responsibility**: Each module has one clear purpose
3. **Dependency Injection**: Pass dependencies through constructors
4. **Async/Await**: Use async patterns consistently
5. **Error Handling**: Handle errors at module boundaries
6. **Security**: Always sanitize user input (use `escapeHtml()`)

## Troubleshooting

### Module Not Loading
- Check import paths are correct
- Ensure `.js` extension in imports
- Verify module exports are correct

### PageScanner Not Working
- Check permissions in manifest.json
- Verify scanner is enabled: `pageScanner.isEnabled()`
- Check console for errors

### Retrieval Returns No Results
- Check query formatting
- Verify articles are loaded: `await retrieval.getAllArticles()`
- Check scoring thresholds

## References

- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [ES6 Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [Jaccard Similarity](https://en.wikipedia.org/wiki/Jaccard_index)
