// Side Panel Main Script
// Handles UI interactions and state management

import KnowledgeBase from './kb.js';
import { mockArticles } from './kb.mock.js';
import StepperStateMachine from './stepper.js';

// Initialize
const kb = new KnowledgeBase();
const stepper = new StepperStateMachine();
let currentArticle = null;

// Load mock articles
kb.loadArticles(mockArticles);

// Notification helper function
function showNotification(message, options = {}) {
  const { 
    type = 'info',  // 'info', 'success', 'warning', 'error' - for future use
    requireConfirm = false 
  } = options;
  
  if (requireConfirm) {
    return confirm(message);
  }
  
  // For now, use alert for simplicity
  // TODO: Replace with toast notification system for better UX
  // The 'type' parameter can be used for styling different notification types
  alert(message);
  return true;
}

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
const fullArticleModal = document.getElementById('full-article-modal');
const closeArticleModal = document.getElementById('close-article-modal');
const fullArticleTitle = document.getElementById('full-article-title');
const fullArticleContent = document.getElementById('full-article-content');

const failureModal = document.getElementById('failure-modal');
const closeFailureModal = document.getElementById('close-failure-modal');
const cancelFailure = document.getElementById('cancel-failure');
const failureForm = document.getElementById('failure-form');
const failureReason = document.getElementById('failure-reason');
const failureNote = document.getElementById('failure-note');

// Initialize UI
function init() {
  renderArticleList();
  setupEventListeners();
}

// Render article list
function renderArticleList() {
  articleList.innerHTML = '';
  const articles = kb.getAllArticles();
  
  articles.forEach(article => {
    const articleItem = document.createElement('div');
    articleItem.className = 'article-item';
    articleItem.innerHTML = `
      <h3>${article.title}</h3>
      <p>${article.summary}</p>
      <div class="article-tags">
        ${article.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
      </div>
    `;
    articleItem.addEventListener('click', () => selectArticle(article.id));
    articleList.appendChild(articleItem);
  });
}

// Select an article and start the stepper
function selectArticle(articleId) {
  currentArticle = kb.getArticle(articleId);
  if (!currentArticle) return;
  
  const startInfo = stepper.startArticle(articleId, currentArticle);
  
  // Switch to step runner view
  articleSelectionView.classList.remove('active');
  stepRunnerView.classList.add('active');
  
  // Update UI
  articleTitle.textContent = currentArticle.title;
  updateStepProgress();
  
  // Populate inline full article content
  populateFullArticleInline();
  
  // Show first step
  renderCurrentStep();
}

// Update step progress indicator
function updateStepProgress() {
  const state = stepper.getState();
  const totalSteps = stepper.getTotalSteps(currentArticle);
  stepProgress.textContent = `Step ${state.currentStepIndex + 1} of ${totalSteps}`;
}

// Render the current step
function renderCurrentStep() {
  const step = stepper.getCurrentStep(currentArticle);
  const state = stepper.getState();
  
  if (!step || stepper.isComplete(currentArticle)) {
    showCompletion();
    return;
  }
  
  // Show step card, hide completion
  stepCard.style.display = 'block';
  completionView.style.display = 'none';
  
  // Update step progress
  updateStepProgress();
  
  // Show skipped steps banner if applicable
  const skippedCount = stepper.getSkippedStepsCount();
  if (skippedCount > 0) {
    skippedStepsBanner.style.display = 'block';
    skippedStepsBanner.textContent = `Skipped ${skippedCount} step${skippedCount > 1 ? 's' : ''} already completed.`;
    // Clear the count so banner doesn't show on subsequent steps
    stepper.clearSkippedStepsCount();
  } else {
    skippedStepsBanner.style.display = 'none';
  }
  
  // Update step text
  stepText.textContent = step.text;
  
  // Update expected result
  if (step.expectedResult) {
    expectedResultContainer.style.display = 'block';
    expectedResult.textContent = step.expectedResult;
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
  const result = stepper.continue(currentArticle);
  
  if (result.completed) {
    showCompletion();
  } else {
    renderCurrentStep();
  }
}

// Handle Back button
function handleBack() {
  const result = stepper.back();
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
function handleFailureSubmit(e) {
  e.preventDefault();
  
  const step = stepper.getCurrentStep(currentArticle);
  const reason = failureReason.value;
  const note = failureNote.value;
  
  // Record the failure
  stepper.recordFailure(step.id, reason, note);
  
  failureModal.style.display = 'none';
  
  // Get all completed step texts for deduplication
  const completedStepTexts = [];
  const allSteps = currentArticle.steps || [];
  const state = stepper.getState();
  
  allSteps.forEach(s => {
    // Check Set membership using includes since getState() converts to Array
    if (state.completedStepIds.includes(s.id)) {
      completedStepTexts.push(s.text);
    }
  });
  
  // Select appropriate fallback
  const fallbackResult = stepper.selectFallback(
    currentArticle,
    kb.getAllArticles(),
    reason,
    note
  );
  
  if (fallbackResult.type === 'same-article') {
    // Switch to fallback in same article
    const result = stepper.switchToFallback(
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
      
      const result = stepper.switchToFallback(
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
  
  const summary = stepper.getCompletionSummary();
  
  // Render completed steps
  const completedStepsList = document.getElementById('completed-steps-list');
  completedStepsList.innerHTML = '';
  
  const steps = stepper.getStepsForActivePath(currentArticle);
  summary.completedSteps.forEach(stepId => {
    const step = steps.find(s => s.id === stepId);
    if (step) {
      const stepItem = document.createElement('div');
      stepItem.className = 'completed-step';
      stepItem.textContent = `✓ ${step.text}`;
      completedStepsList.appendChild(stepItem);
    }
  });
  
  // Render failure notes if any
  const failureNotesContainer = document.getElementById('failure-notes');
  const failureNotesList = document.getElementById('failure-notes-list');
  
  if (summary.failureHistory.length > 0) {
    failureNotesContainer.style.display = 'block';
    failureNotesList.innerHTML = '';
    
    summary.failureHistory.forEach(failure => {
      const step = steps.find(s => s.id === failure.stepId);
      const failureItem = document.createElement('div');
      failureItem.className = 'failure-note';
      failureItem.innerHTML = `
        <strong>${step ? step.text : failure.stepId}</strong>
        <p><strong>Reason:</strong> ${formatReason(failure.reasonCategory)}</p>
        ${failure.note ? `<p><strong>Note:</strong> ${failure.note}</p>` : ''}
        <p class="timestamp">${new Date(failure.timestamp).toLocaleString()}</p>
      `;
      failureNotesList.appendChild(failureItem);
    });
  } else {
    failureNotesContainer.style.display = 'none';
  }
}

// Format failure reason for display
function formatReason(reason) {
  const reasons = {
    'cant-find-option': "Customer can't find option/button",
    'system-error': 'System error message',
    'permission-issue': 'Permission/access issue',
    'no-change': "Outcome didn't change",
    'other': 'Other'
  };
  return reasons[reason] || reason;
}

// Populate inline full article content
function populateFullArticleInline() {
  if (!currentArticle) return;
  
  fullArticleContentInline.innerHTML = '';
  
  // Add summary
  const summarySection = document.createElement('div');
  summarySection.className = 'article-section';
  summarySection.innerHTML = `
    <h3>Summary</h3>
    <p>${currentArticle.summary}</p>
  `;
  fullArticleContentInline.appendChild(summarySection);
  
  // Add prechecks if available
  if (currentArticle.prechecks && currentArticle.prechecks.length > 0) {
    const prechecksSection = document.createElement('div');
    prechecksSection.className = 'article-section';
    prechecksSection.innerHTML = `
      <h3>Pre-checks</h3>
      <ul>
        ${currentArticle.prechecks.map(check => `<li>${check}</li>`).join('')}
      </ul>
    `;
    fullArticleContentInline.appendChild(prechecksSection);
  }
  
  // Add main steps
  const stepsSection = document.createElement('div');
  stepsSection.className = 'article-section';
  stepsSection.innerHTML = `<h3>Steps</h3>`;
  
  currentArticle.steps.forEach((step, index) => {
    const stepItem = document.createElement('div');
    stepItem.className = 'step-item';
    stepItem.innerHTML = `
      <strong>Step ${index + 1}:</strong> ${step.text}
      ${step.expectedResult ? `<br><em>Expected: ${step.expectedResult}</em>` : ''}
    `;
    stepsSection.appendChild(stepItem);
  });
  
  fullArticleContentInline.appendChild(stepsSection);
  
  // Add fallbacks if available
  if (currentArticle.fallbacks && currentArticle.fallbacks.length > 0) {
    const fallbacksSection = document.createElement('div');
    fallbacksSection.className = 'article-section';
    fallbacksSection.innerHTML = `<h3>Fallback Procedures</h3>`;
    
    currentArticle.fallbacks.forEach(fallback => {
      const fallbackItem = document.createElement('div');
      fallbackItem.innerHTML = `<strong>${fallback.condition}</strong>`;
      const fallbackSteps = document.createElement('ol');
      fallback.steps.forEach(step => {
        const li = document.createElement('li');
        li.textContent = step.text;
        fallbackSteps.appendChild(li);
      });
      fallbackItem.appendChild(fallbackSteps);
      fallbacksSection.appendChild(fallbackItem);
    });
    
    fullArticleContentInline.appendChild(fallbacksSection);
  }
  
  // Add escalation info if available
  if (currentArticle.escalation) {
    const escalationSection = document.createElement('div');
    escalationSection.className = 'article-section';
    escalationSection.innerHTML = `
      <h3>Escalation</h3>
      <p><strong>When:</strong> ${currentArticle.escalation.when}</p>
      <p><strong>Target:</strong> ${currentArticle.escalation.target}</p>
    `;
    fullArticleContentInline.appendChild(escalationSection);
  }
}

// Open full article modal
function openFullArticle() {
  if (!currentArticle) return;
  
  fullArticleTitle.textContent = currentArticle.title;
  fullArticleContent.innerHTML = '';
  
  // Add summary
  const summarySection = document.createElement('div');
  summarySection.className = 'article-section';
  summarySection.innerHTML = `
    <h3>Summary</h3>
    <p>${currentArticle.summary}</p>
  `;
  fullArticleContent.appendChild(summarySection);
  
  // Add prechecks if available
  if (currentArticle.prechecks && currentArticle.prechecks.length > 0) {
    const prechecksSection = document.createElement('div');
    prechecksSection.className = 'article-section';
    prechecksSection.innerHTML = `
      <h3>Pre-checks</h3>
      <ul>
        ${currentArticle.prechecks.map(check => `<li>${check}</li>`).join('')}
      </ul>
    `;
    fullArticleContent.appendChild(prechecksSection);
  }
  
  // Add main steps
  const stepsSection = document.createElement('div');
  stepsSection.className = 'article-section';
  stepsSection.innerHTML = `<h3>Steps</h3>`;
  
  currentArticle.steps.forEach((step, index) => {
    const stepItem = document.createElement('div');
    stepItem.className = 'step-item';
    stepItem.innerHTML = `
      <strong>Step ${index + 1}:</strong> ${step.text}
      ${step.expectedResult ? `<br><em>Expected: ${step.expectedResult}</em>` : ''}
    `;
    stepsSection.appendChild(stepItem);
  });
  
  fullArticleContent.appendChild(stepsSection);
  
  // Add fallbacks if available
  if (currentArticle.fallbacks && currentArticle.fallbacks.length > 0) {
    const fallbacksSection = document.createElement('div');
    fallbacksSection.className = 'article-section';
    fallbacksSection.innerHTML = `<h3>Fallback Procedures</h3>`;
    
    currentArticle.fallbacks.forEach(fallback => {
      const fallbackItem = document.createElement('div');
      fallbackItem.innerHTML = `<strong>${fallback.condition}</strong>`;
      const fallbackSteps = document.createElement('ol');
      fallback.steps.forEach(step => {
        const li = document.createElement('li');
        li.textContent = step.text;
        fallbackSteps.appendChild(li);
      });
      fallbackItem.appendChild(fallbackSteps);
      fallbacksSection.appendChild(fallbackItem);
    });
    
    fullArticleContent.appendChild(fallbacksSection);
  }
  
  // Add escalation info if available
  if (currentArticle.escalation) {
    const escalationSection = document.createElement('div');
    escalationSection.className = 'article-section';
    escalationSection.innerHTML = `
      <h3>Escalation</h3>
      <p><strong>When:</strong> ${currentArticle.escalation.when}</p>
      <p><strong>Target:</strong> ${currentArticle.escalation.target}</p>
    `;
    fullArticleContent.appendChild(escalationSection);
  }
  
  fullArticleModal.style.display = 'flex';
}

// Close full article modal
function closeFullArticle() {
  fullArticleModal.style.display = 'none';
}

// Handle reset
function handleReset() {
  if (confirm('Are you sure you want to reset? All progress will be lost.')) {
    stepper.reset();
    currentArticle = null;
    
    stepRunnerView.classList.remove('active');
    articleSelectionView.classList.add('active');
  }
}

// Handle back to articles
function handleBackToArticles() {
  stepper.reset();
  currentArticle = null;
  
  stepRunnerView.classList.remove('active');
  articleSelectionView.classList.add('active');
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
function handleSearch(e) {
  const query = e.target.value.toLowerCase().trim();
  
  if (!query) {
    // Show all articles
    renderArticleList();
    return;
  }
  
  // Filter articles
  const allArticles = kb.getAllArticles();
  const filtered = allArticles.filter(article => {
    return article.title.toLowerCase().includes(query) ||
           article.summary.toLowerCase().includes(query) ||
           article.tags.some(tag => tag.toLowerCase().includes(query)) ||
           article.keywords.some(kw => kw.toLowerCase().includes(query));
  });
  
  // Render filtered list
  articleList.innerHTML = '';
  filtered.forEach(article => {
    const articleItem = document.createElement('div');
    articleItem.className = 'article-item';
    articleItem.innerHTML = `
      <h3>${article.title}</h3>
      <p>${article.summary}</p>
      <div class="article-tags">
        ${article.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
      </div>
    `;
    articleItem.addEventListener('click', () => selectArticle(article.id));
    articleList.appendChild(articleItem);
  });
  
  if (filtered.length === 0) {
    articleList.innerHTML = '<p style="padding: 16px; text-align: center; color: var(--text-secondary);">No articles found</p>';
  }
}

// Initialize on load
init();
