// Side Panel Main Script
// Orchestrates UI interactions and module coordination

// Import modules
import { FeatureFlags, isFeatureEnabled } from './modules/config.js';
import { MockRetrievalProvider } from './modules/retrieval.js';
import { mockArticles } from './modules/kb.mock.js';
import { StepRunner } from './modules/stepRunner.js';
import { createPageScanner } from './modules/pageScanner.js';
import { 
  showNotification, 
  formatReason,
  renderArticleItem,
  renderCompletedStep,
  renderFailureNote,
  populateFullArticle,
  updateStepProgress,
  toggleElement,
  clearElement,
  escapeHtml
} from './modules/ui.js';

// Constants
const MAX_FALLBACK_QUERY_LENGTH = 50; // Maximum characters for fallback search query

// Initialize modules
const retrieval = new MockRetrievalProvider(mockArticles);
const stepRunner = new StepRunner();
const pageScanner = createPageScanner('default'); // Disabled by default
let currentArticle = null;
let scannedPageContent = null; // Store scanned page content
let extractedContext = new Map(); // Store extracted label-value pairs from page scan

// DOM Elements
const articleSelectionView = document.getElementById('article-selection-view');
const stepRunnerView = document.getElementById('step-runner-view');
const articleList = document.getElementById('article-list');
const articleTitle = document.getElementById('article-title');
const stepProgress = document.getElementById('step-progress');
const articleSearch = document.getElementById('article-search');
const skippedStepsBanner = document.getElementById('skipped-steps-banner');
const stepCard = document.getElementById('step-card');
const completionView = document.getElementById('completion-view');
const fullArticleSection = document.getElementById('full-article-section');
const fullArticleContentInline = document.getElementById('full-article-content-inline');

// Step Card Elements
const stepText = document.getElementById('step-text');
const expectedResultContainer = document.getElementById('expected-result-container');
const expectedResult = document.getElementById('expected-result');
const sayToCustomerContainer = document.getElementById('say-to-customer-container');
const sayToCustomer = document.getElementById('say-to-customer');

// Buttons
const continueButton = document.getElementById('continue-button');
const backButton = document.getElementById('back-button');
const didntWorkButton = document.getElementById('didnt-work-button');
const resetButton = document.getElementById('reset-button');
const backToArticlesButton = document.getElementById('back-to-articles');

// Modals
const failureModal = document.getElementById('failure-modal');
const closeFailureModal = document.getElementById('close-failure-modal');
const cancelFailure = document.getElementById('cancel-failure');
const failureForm = document.getElementById('failure-form');
const failureReason = document.getElementById('failure-reason');
const failureNote = document.getElementById('failure-note');

// Initialize UI
async function init() {
  // Log feature flags
  console.log('[Stepper] Feature flags:', FeatureFlags);
  
  // Initialize page scanner if enabled
  if (isFeatureEnabled('ENABLE_PAGE_SCAN')) {
    console.log('[Stepper] Page scanning enabled, initializing...');
    pageScanner.enable();
    await initializePageScanning();
  } else {
    console.log('[Stepper] Page scanning disabled');
  }
  
  renderArticleList();
  setupEventListeners();
  
  // Log module initialization
  console.log('[Stepper] Modules initialized');
  console.log('[PageScanner] Enabled:', pageScanner.isEnabled());
}

/**
 * Initialize page scanning functionality
 * Scans the active page and prefills search if content is found
 */
async function initializePageScanning() {
  try {
    scannedPageContent = await pageScanner.scanActivePage();
    
    if (scannedPageContent) {
      console.log('[Stepper] Page content scanned:', {
        title: scannedPageContent.title,
        url: scannedPageContent.url,
        textLength: scannedPageContent.text?.length || 0,
        contextFieldsFound: scannedPageContent.extractedContext?.size || 0
      });
      
      // Store extracted context
      if (scannedPageContent.extractedContext) {
        extractedContext = scannedPageContent.extractedContext;
        console.log('[Stepper] Extracted context fields:', 
          Array.from(extractedContext.entries()).map(([k, v]) => `${k}: ${v}`)
        );
      }
      
      // Prefill search with relevant content
      if (scannedPageContent.text && articleSearch) {
        const searchQuery = extractSearchQuery(scannedPageContent);
        if (searchQuery) {
          articleSearch.value = searchQuery;
          // Trigger search to filter articles
          handleSearch();
          
          showNotification(
            `Page scanned: "${scannedPageContent.title}". Search prefilled.`,
            'info'
          );
        }
      }
    } else {
      console.log('[Stepper] No page content available');
    }
  } catch (error) {
    console.error('[Stepper] Error initializing page scanning:', error);
  }
}

/**
 * Extract a search query from scanned page content
 * @param {PageContent} content - Scanned page content
 * @returns {string} Search query
 */
function extractSearchQuery(content) {
  // Use metadata if available
  if (content.metadata?.product) {
    return content.metadata.product;
  }
  
  // Extract key terms from page text
  const text = content.text || '';
  
  // Look for common product/issue keywords
  const keywords = [
    'gmail', 'outlook', 'email', 
    'network', 'wifi', 'internet', 'connection',
    'windows', 'mac', 'linux',
    'installation', 'install', 'setup',
    'error', 'failed', 'not working'
  ];
  
  const lowerText = text.toLowerCase();
  const foundKeywords = keywords.filter(keyword => lowerText.includes(keyword));
  
  // Return the first few keywords or first sentence
  if (foundKeywords.length > 0) {
    return foundKeywords.slice(0, 2).join(' ');
  }
  
  // Fallback: first MAX_FALLBACK_QUERY_LENGTH characters
  return text.substring(0, MAX_FALLBACK_QUERY_LENGTH).trim();
}

/**
 * Augment text with extracted context values
 * Detects mentions of context labels and appends their values
 * @param {string} text - Text to augment (step text or expected result)
 * @returns {string} Augmented HTML with context hints
 */
function augmentTextWithContext(text) {
  if (!text || extractedContext.size === 0) {
    return escapeHtml(text);
  }
  
  const contextHints = [];
  
  // Pre-compile regexes for efficiency
  const labelRegexes = new Map();
  extractedContext.forEach((value, label) => {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    labelRegexes.set(label, new RegExp(`\\b${escapedLabel}\\b`, 'i'));
  });
  
  // Check if any context labels are mentioned in the text (case-insensitive)
  extractedContext.forEach((value, label) => {
    const labelRegex = labelRegexes.get(label);
    
    if (labelRegex.test(text)) {
      contextHints.push(`${escapeHtml(label)}: ${escapeHtml(value)}`);
    }
  });
  
  // Build HTML with context hints styled differently
  let html = escapeHtml(text);
  
  if (contextHints.length > 0) {
    html += ` <span class="context-hint">(Stepper found: ${contextHints.join(', ')})</span>`;
  }
  
  return html;
}

// Render article list
async function renderArticleList() {
  clearElement(articleList);
  const articles = await retrieval.getAllArticles();
  
  articles.forEach(article => {
    const articleItem = renderArticleItem(article, () => selectArticle(article.id));
    articleList.appendChild(articleItem);
  });
}

// Select an article and start the stepper
async function selectArticle(articleId) {
  currentArticle = await retrieval.getArticle(articleId);
  if (!currentArticle) return;
  
  const startInfo = stepRunner.startArticle(articleId, currentArticle);
  
  // Switch to step runner view
  articleSelectionView.classList.remove('active');
  stepRunnerView.classList.add('active');
  
  // Update UI
  articleTitle.textContent = currentArticle.title;
  updateStepProgressIndicator();
  
  // Populate inline full article content
  populateFullArticleInline();
  
  // Show first step
  renderCurrentStep();
}

// Update step progress indicator
function updateStepProgressIndicator() {
  const state = stepRunner.getState();
  const totalSteps = stepRunner.getTotalSteps(currentArticle);
  updateStepProgress(stepProgress, state.currentStepIndex + 1, totalSteps);
}

// Populate inline full article content
function populateFullArticleInline() {
  populateFullArticle(currentArticle, fullArticleContentInline);
}

// Render the current step
function renderCurrentStep() {
  const step = stepRunner.getCurrentStep(currentArticle);
  const state = stepRunner.getState();
  
  if (!step || stepRunner.isComplete(currentArticle)) {
    showCompletion();
    return;
  }
  
  // Show step card, hide completion
  stepCard.style.display = 'block';
  completionView.style.display = 'none';
  
  // Update step progress
  updateStepProgressIndicator();
  
  // Show skipped steps banner if applicable
  const skippedCount = stepRunner.getSkippedStepsCount();
  if (skippedCount > 0) {
    skippedStepsBanner.style.display = 'block';
    skippedStepsBanner.textContent = `Skipped ${skippedCount} step${skippedCount > 1 ? 's' : ''} already completed.`;
    // Clear the count so banner doesn't show on subsequent steps
    stepRunner.clearSkippedStepsCount();
  } else {
    skippedStepsBanner.style.display = 'none';
  }
  
  // Update step text (augment with context if available)
  stepText.innerHTML = augmentTextWithContext(step.text);
  
  // Update expected result
  if (step.expectedResult) {
    expectedResultContainer.style.display = 'block';
    expectedResult.innerHTML = augmentTextWithContext(step.expectedResult);
  } else {
    expectedResultContainer.style.display = 'none';
  }
  
  // Update say to customer
  if (step.sayToCustomer) {
    sayToCustomerContainer.style.display = 'block';
    sayToCustomer.textContent = step.sayToCustomer;
  } else {
    sayToCustomerContainer.style.display = 'none';
  }
  
  // Update back button state
  backButton.disabled = state.currentStepIndex === 0;
}

// Handle Continue button
function handleContinue() {
  const result = stepRunner.continue(currentArticle);
  
  if (result.completed) {
    showCompletion();
  } else {
    renderCurrentStep();
  }
}

// Handle Back button
function handleBack() {
  const result = stepRunner.back();
  
  if (result.success) {
    renderCurrentStep();
  }
}

// Handle "This didn't work" button
function handleDidntWork() {
  failureModal.style.display = 'flex';
  failureReason.value = '';
  failureNote.value = '';
}

// Handle failure form submission
async function handleFailureSubmit(e) {
  e.preventDefault();
  
  const step = stepRunner.getCurrentStep(currentArticle);
  const reason = failureReason.value;
  const note = failureNote.value;
  
  // Record the failure
  stepRunner.recordFailure(step.id, reason, note);
  
  failureModal.style.display = 'none';
  
  // Get all completed step texts for deduplication
  const completedStepTexts = [];
  const allSteps = currentArticle.steps || [];
  const state = stepRunner.getState();
  
  allSteps.forEach(s => {
    // Check Set membership using includes since getState() converts to Array
    if (state.completedStepIds.includes(s.id)) {
      completedStepTexts.push(s.text);
    }
  });
  
  // Select appropriate fallback
  const allArticles = await retrieval.getAllArticles();
  const fallbackResult = stepRunner.selectFallback(
    currentArticle,
    allArticles,
    reason,
    note
  );
  
  if (fallbackResult.type === 'same-article') {
    // Switch to fallback in same article
    const result = stepRunner.switchToFallback(
      fallbackResult.fallback.id,
      currentArticle,
      completedStepTexts
    );
    
    const message = result.skippedSteps > 0
      ? `Switching to alternative approach: ${fallbackResult.fallback.condition}\nSkipping ${result.skippedSteps} step(s) already completed.`
      : `Switching to alternative approach: ${fallbackResult.fallback.condition}`;
    
    showNotification(message, { type: 'info' });
    renderCurrentStep();
  } else if (fallbackResult.type === 'cross-article') {
    // Found fallback in different article
    const message = `Found alternative solution in "${fallbackResult.article.title}".\n\nWould you like to switch to this approach?`;
    
    if (showNotification(message, { requireConfirm: true })) {
      // Switch to the new article
      currentArticle = fallbackResult.article;
      articleTitle.textContent = currentArticle.title;
      
      const result = stepRunner.switchToFallback(
        fallbackResult.fallback.id,
        currentArticle,
        completedStepTexts
      );
      
      if (result.skippedSteps > 0) {
        showNotification(
          `Switched to new article. Skipping ${result.skippedSteps} step(s) already completed.`,
          { type: 'success' }
        );
      }
      
      renderCurrentStep();
    } else {
      showNotification('Issue recorded. You can continue with the next step or reset.', { type: 'info' });
    }
  } else if (fallbackResult.type === 'escalation') {
    // Show escalation guidance
    const escalation = fallbackResult.escalation;
    if (escalation) {
      showNotification(
        `No automated solution available.\n\nEscalation Required:\nWhen: ${escalation.when}\nTarget: ${escalation.target}`,
        { type: 'warning' }
      );
    } else {
      showNotification(
        'Issue recorded. No automated fallback available. Please escalate to appropriate support team.',
        { type: 'warning' }
      );
    }
  }
}

// Show completion summary
function showCompletion() {
  stepCard.style.display = 'none';
  completionView.style.display = 'block';
  
  const summary = stepRunner.getCompletionSummary();
  
  // Render completed steps
  const completedStepsList = document.getElementById('completed-steps-list');
  clearElement(completedStepsList);
  
  const steps = stepRunner.getStepsForActivePath(currentArticle);
  summary.completedSteps.forEach(stepId => {
    const step = steps.find(s => s.id === stepId);
    if (step) {
      completedStepsList.appendChild(renderCompletedStep(step));
    }
  });
  
  // Render failure notes if any
  const failureNotesContainer = document.getElementById('failure-notes');
  const failureNotesList = document.getElementById('failure-notes-list');
  
  if (summary.failureHistory.length > 0) {
    failureNotesContainer.style.display = 'block';
    clearElement(failureNotesList);
    
    summary.failureHistory.forEach(failure => {
      const step = steps.find(s => s.id === failure.stepId);
      failureNotesList.appendChild(renderFailureNote(failure, step));
    });
  } else {
    failureNotesContainer.style.display = 'none';
  }
}

// Handle reset
function handleReset() {
  if (confirm('Are you sure you want to reset? All progress will be lost.')) {
    stepRunner.reset();
    currentArticle = null;
    stepRunnerView.classList.remove('active');
    articleSelectionView.classList.add('active');
  }
}

// Handle back to articles
function handleBackToArticles() {
  stepRunnerView.classList.remove('active');
  articleSelectionView.classList.add('active');
  stepRunner.reset();
  currentArticle = null;
}

// Setup event listeners
function setupEventListeners() {
  // Button listeners
  continueButton.addEventListener('click', handleContinue);
  backButton.addEventListener('click', handleBack);
  didntWorkButton.addEventListener('click', handleDidntWork);
  resetButton.addEventListener('click', handleReset);
  backToArticlesButton.addEventListener('click', handleBackToArticles);
  
  // Search functionality
  articleSearch.addEventListener('input', handleSearch);
  
  // Modal controls
  closeFailureModal.addEventListener('click', () => {
    failureModal.style.display = 'none';
  });
  cancelFailure.addEventListener('click', () => {
    failureModal.style.display = 'none';
  });
  failureForm.addEventListener('submit', handleFailureSubmit);
  
  // Close modals on background click
  failureModal.addEventListener('click', (e) => {
    if (e.target === failureModal) {
      failureModal.style.display = 'none';
    }
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcuts);
}

// Handle keyboard shortcuts
function handleKeyboardShortcuts(e) {
  // Esc to close modals
  if (e.key === 'Escape') {
    if (failureModal.style.display === 'flex') {
      failureModal.style.display = 'none';
      e.preventDefault();
    }
    return;
  }
  
  // Only handle Enter when not in a modal or text input
  if (e.key === 'Enter' && 
      failureModal.style.display !== 'flex' &&
      !e.target.matches('input, textarea, select')) {
    // Enter to continue (only in step runner view)
    if (stepRunnerView.classList.contains('active') && 
        !continueButton.disabled && 
        stepCard.style.display !== 'none') {
      continueButton.click();
      e.preventDefault();
    }
  }
}

// Handle article search
async function handleSearch(e) {
  const query = e.target.value.toLowerCase().trim();
  
  if (!query) {
    // Show all articles
    renderArticleList();
    return;
  }
  
  // Filter articles using retrieval module
  const filtered = await retrieval.filterArticles(query);
  
  // Render filtered list
  clearElement(articleList);
  filtered.forEach(article => {
    const articleItem = renderArticleItem(article, () => selectArticle(article.id));
    articleList.appendChild(articleItem);
  });
  
  if (filtered.length === 0) {
    articleList.innerHTML = '<p style="padding: 16px; text-align: center; color: var(--text-secondary);">No articles found</p>';
  }
}

// Initialize on load
init();
