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

// DOM Elements
const articleSelectionView = document.getElementById('article-selection-view');
const stepRunnerView = document.getElementById('step-runner-view');
const articleList = document.getElementById('article-list');
const articleTitle = document.getElementById('article-title');
const stepCounter = document.getElementById('step-counter');
const stepCard = document.getElementById('step-card');
const completionView = document.getElementById('completion-view');

// Step Card Elements
const stepNumber = document.getElementById('step-number');
const stepText = document.getElementById('step-text');
const expectedResultContainer = document.getElementById('expected-result-container');
const expectedResult = document.getElementById('expected-result');
const sayToCustomerContainer = document.getElementById('say-to-customer-container');
const sayToCustomer = document.getElementById('say-to-customer');

// Buttons
const continueButton = document.getElementById('continue-button');
const backButton = document.getElementById('back-button');
const didntWorkButton = document.getElementById('didnt-work-button');
const openArticleButton = document.getElementById('open-article-button');
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
  stepCounter.textContent = `This solution has ${startInfo.totalSteps} steps`;
  
  // Show first step
  renderCurrentStep();
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
  
  // Update step number
  stepNumber.textContent = `Step ${state.currentStepIndex + 1}`;
  
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
  
  stepper.recordFailure(step.id, reason, note);
  
  failureModal.style.display = 'none';
  
  // Show a brief confirmation (optional)
  alert('Issue recorded. You can continue with the next step or try an alternative approach.');
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
    'not-applicable': 'Not Applicable to Situation',
    'did-not-resolve': 'Did Not Resolve Issue',
    'customer-declined': 'Customer Declined',
    'technical-limitation': 'Technical Limitation',
    'insufficient-permissions': 'Insufficient Permissions',
    'other': 'Other'
  };
  return reasons[reason] || reason;
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
  continueButton.addEventListener('click', handleContinue);
  backButton.addEventListener('click', handleBack);
  didntWorkButton.addEventListener('click', handleDidntWork);
  openArticleButton.addEventListener('click', openFullArticle);
  resetButton.addEventListener('click', handleReset);
  backToArticlesButton.addEventListener('click', handleBackToArticles);
  
  // Modal controls
  closeArticleModal.addEventListener('click', closeFullArticle);
  closeFailureModal.addEventListener('click', () => {
    failureModal.style.display = 'none';
  });
  cancelFailure.addEventListener('click', () => {
    failureModal.style.display = 'none';
  });
  failureForm.addEventListener('submit', handleFailureSubmit);
  
  // Close modals on background click
  fullArticleModal.addEventListener('click', (e) => {
    if (e.target === fullArticleModal) {
      closeFullArticle();
    }
  });
  failureModal.addEventListener('click', (e) => {
    if (e.target === failureModal) {
      failureModal.style.display = 'none';
    }
  });
}

// Initialize on load
init();
