// Side Panel Main Script - Chat-Based Flow
// Orchestrates UI interactions and module coordination

// Import modules
import { FeatureFlags, isFeatureEnabled, setFeatureFlag } from './modules/config.js';
import { MockRetrievalProvider } from './modules/retrieval.js';
import { mockArticles } from './modules/kb.mock.js';
import { StepRunner } from './modules/stepRunner.js';
import { 
  showNotification, 
  formatReason,
  renderSteppingStones,
  clearElement,
  escapeHtml
} from './modules/ui.js';

// Constants
const THEME_STORAGE_KEY = 'stepper_playful_theme_enabled';

// Initialize modules
const retrieval = new MockRetrievalProvider(mockArticles);
const stepRunner = new StepRunner();
let currentArticle = null;
let extractedContext = new Map(); // Store extracted label-value pairs from page scan
let previousStepIndex = -1; // Track previous step for animation

// DOM Elements
const chatView = document.getElementById('chat-view');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');
const steppingStonesContainer = document.getElementById('stepping-stones-container');
const resetButton = document.getElementById('reset-button');
const themeToggleButton = document.getElementById('theme-toggle-button');

// Modals
const failureModal = document.getElementById('failure-modal');
const closeFailureModal = document.getElementById('close-failure-modal');
const cancelFailure = document.getElementById('cancel-failure');
const failureForm = document.getElementById('failure-form');
const failureReason = document.getElementById('failure-reason');
const failureNote = document.getElementById('failure-note');

// Chat state
let chatState = 'initial'; // initial, searching, in-step, completed
let currentContinueButton = null;

// Initialize UI
async function init() {
  console.log('[Stepper] Feature flags:', FeatureFlags);
  
  // Load theme preference from localStorage
  loadThemePreference();
  
  // Show welcome message
  showWelcomeMessage();
  
  setupEventListeners();
  
  console.log('[Stepper] Modules initialized');
}

// ==================== CHAT FUNCTIONS ====================

/**
 * Show welcome message in chat
 */
function showWelcomeMessage() {
  addAssistantMessage('Hello! I\'m here to help you troubleshoot issues step by step. What problem are you experiencing?');
}

/**
 * Add a message to the chat
 * @param {string} text - Message text
 * @param {string} sender - 'agent' or 'assistant'
 * @param {HTMLElement} customContent - Optional custom content to append
 */
function addChatMessage(text, sender, customContent = null) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${sender}`;
  
  const senderLabel = document.createElement('div');
  senderLabel.className = 'message-sender';
  senderLabel.textContent = sender === 'agent' ? 'You' : 'Assistant';
  
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  
  if (text) {
    const textP = document.createElement('p');
    textP.textContent = text;
    bubble.appendChild(textP);
  }
  
  if (customContent) {
    bubble.appendChild(customContent);
  }
  
  messageDiv.appendChild(senderLabel);
  messageDiv.appendChild(bubble);
  chatMessages.appendChild(messageDiv);
  
  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  return messageDiv;
}

/**
 * Add agent message
 */
function addAgentMessage(text) {
  return addChatMessage(text, 'agent');
}

/**
 * Add assistant message
 */
function addAssistantMessage(text, customContent = null) {
  return addChatMessage(text, 'assistant', customContent);
}

/**
 * Show typing indicator
 */
function showTypingIndicator() {
  const indicator = document.createElement('div');
  indicator.className = 'typing-indicator';
  indicator.innerHTML = '<span></span><span></span><span></span>';
  
  const message = addAssistantMessage(null, indicator);
  message.id = 'typing-indicator-message';
  
  return message;
}

/**
 * Remove typing indicator
 */
function removeTypingIndicator() {
  const indicator = document.getElementById('typing-indicator-message');
  if (indicator) {
    indicator.remove();
  }
}

/**
 * Handle user input
 */
async function handleUserInput() {
  const query = chatInput.value.trim();
  if (!query) return;
  
  // Add agent message
  addAgentMessage(query);
  
  // Clear input
  chatInput.value = '';
  chatInput.disabled = true;
  
  // Show typing
  showTypingIndicator();
  
  // Simulate typing delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Search for matching articles
  const articles = await retrieval.search(query);
  
  removeTypingIndicator();
  
  if (articles.length === 0) {
    addAssistantMessage('I couldn\'t find any articles matching your issue. Could you try describing it differently?');
    chatInput.disabled = false;
    chatInput.focus();
  } else if (articles.length === 1) {
    // Single match - start directly
    const article = articles[0];
    addAssistantMessage(`I found a solution: "${article.title}". This solution has ${article.steps.length} steps. Let's begin!`);
    
    // Start article
    await selectArticleInChat(article.id);
  } else {
    // Multiple matches - show as cards
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'article-cards-container';
    
    articles.slice(0, 5).forEach(article => {
      const card = createArticleCard(article);
      cardsContainer.appendChild(card);
    });
    
    addAssistantMessage(`I found ${articles.length} possible solutions. Please select the one that best matches your issue:`, cardsContainer);
    chatInput.disabled = true;
  }
}

/**
 * Create article card for selection
 */
function createArticleCard(article) {
  const card = document.createElement('div');
  card.className = 'article-card';
  
  const title = document.createElement('h4');
  title.textContent = article.title;
  card.appendChild(title);
  
  const summary = document.createElement('p');
  summary.textContent = article.summary;
  card.appendChild(summary);
  
  const tags = document.createElement('div');
  tags.className = 'article-tags';
  article.tags.slice(0, 3).forEach(tag => {
    const tagSpan = document.createElement('span');
    tagSpan.className = 'tag';
    tagSpan.textContent = tag;
    tags.appendChild(tagSpan);
  });
  card.appendChild(tags);
  
  card.addEventListener('click', () => selectArticleInChat(article.id));
  
  return card;
}

/**
 * Select article and begin steps in chat
 */
async function selectArticleInChat(articleId) {
  currentArticle = await retrieval.getArticle(articleId);
  if (!currentArticle) return;
  
  stepRunner.startArticle(articleId, currentArticle);
  chatState = 'in-step';
  
  // Show stepping stones
  showSteppingStonesProgress();
  
  // Show first step
  showCurrentStepInChat();
}

/**
 * Show stepping stones progress indicator
 */
function showSteppingStonesProgress() {
  if (isFeatureEnabled('ENABLE_PLAYFUL_THEME')) {
    steppingStonesContainer.style.display = 'block';
    updateSteppingStonesInChat();
  }
}

/**
 * Update stepping stones indicator
 */
function updateSteppingStonesInChat() {
  const state = stepRunner.getState();
  const totalSteps = stepRunner.getTotalSteps(currentArticle);
  const currentStep = state.currentStepIndex + 1;
  
  if (isFeatureEnabled('ENABLE_PLAYFUL_THEME')) {
    const shouldAnimate = previousStepIndex >= 0 && state.currentStepIndex > previousStepIndex;
    renderSteppingStones(steppingStonesContainer, currentStep, totalSteps, shouldAnimate);
    previousStepIndex = state.currentStepIndex;
  }
}

/**
 * Show current step in chat
 */
function showCurrentStepInChat() {
  const step = stepRunner.getCurrentStep(currentArticle);
  const state = stepRunner.getState();
  
  if (!step || stepRunner.isComplete(currentArticle)) {
    showCompletionInChat();
    return;
  }
  
  // Update stepping stones
  updateSteppingStonesInChat();
  
  // Create step content
  const stepContent = document.createElement('div');
  stepContent.className = 'step-message';
  
  const stepText = document.createElement('div');
  stepText.className = 'step-text';
  stepText.innerHTML = escapeHtml(step.text);
  stepContent.appendChild(stepText);
  
  // Add expected result if present
  if (step.expectedResult) {
    const expectedDiv = document.createElement('div');
    expectedDiv.className = 'expected-outcome-inline';
    
    const label = document.createElement('div');
    label.className = 'outcome-label';
    label.textContent = 'Expected Outcome';
    expectedDiv.appendChild(label);
    
    const text = document.createElement('div');
    text.className = 'outcome-text';
    text.innerHTML = escapeHtml(step.expectedResult);
    expectedDiv.appendChild(text);
    
    stepContent.appendChild(expectedDiv);
  }
  
  // Add action buttons
  const actions = document.createElement('div');
  actions.className = 'step-actions-inline';
  
  const continueBtn = document.createElement('button');
  continueBtn.className = 'btn btn-primary';
  continueBtn.textContent = 'Continue →';
  continueBtn.addEventListener('click', handleContinueInChat);
  currentContinueButton = continueBtn;
  actions.appendChild(continueBtn);
  
  if (state.currentStepIndex > 0) {
    const backBtn = document.createElement('button');
    backBtn.className = 'btn btn-secondary';
    backBtn.textContent = '← Back';
    backBtn.addEventListener('click', handleBackInChat);
    actions.appendChild(backBtn);
  }
  
  const didntWorkBtn = document.createElement('button');
  didntWorkBtn.className = 'btn btn-warning';
  didntWorkBtn.textContent = 'This didn\'t work';
  didntWorkBtn.addEventListener('click', handleDidntWorkInChat);
  actions.appendChild(didntWorkBtn);
  
  stepContent.appendChild(actions);
  
  // Add step to chat
  const stepNumber = state.currentStepIndex + 1;
  const totalSteps = stepRunner.getTotalSteps(currentArticle);
  addAssistantMessage(`Step ${stepNumber} of ${totalSteps}:`, stepContent);
}

/**
 * Handle continue in chat
 */
function handleContinueInChat() {
  // Disable the button to prevent double clicks
  if (currentContinueButton) {
    currentContinueButton.disabled = true;
  }
  
  const result = stepRunner.continue(currentArticle);
  
  if (result.completed) {
    showCompletionInChat();
  } else {
    showCurrentStepInChat();
  }
}

/**
 * Handle back in chat
 */
function handleBackInChat() {
  const result = stepRunner.back();
  
  if (result.success) {
    addAssistantMessage('Going back to the previous step.');
    showCurrentStepInChat();
  }
}

/**
 * Handle didn't work in chat
 */
function handleDidntWorkInChat() {
  failureModal.style.display = 'flex';
  failureReason.value = '';
  failureNote.value = '';
}

/**
 * Show completion in chat
 */
function showCompletionInChat() {
  const summary = stepRunner.getCompletionSummary();
  
  let message = '✅ Process complete! ';
  if (summary.failureHistory.length > 0) {
    message += `You completed all steps with ${summary.failureHistory.length} issue(s) reported.`;
  } else {
    message += 'You completed all steps successfully!';
  }
  
  addAssistantMessage(message);
  
  chatState = 'completed';
  chatInput.disabled = false;
  chatInput.placeholder = 'Describe another issue...';
  chatInput.focus();
  
  // Hide stepping stones
  steppingStonesContainer.style.display = 'none';
  previousStepIndex = -1;
}

// ==================== EVENT HANDLERS ====================

// Handle reset
function handleReset() {
  if (confirm('Are you sure you want to reset? All progress will be lost.')) {
    stepRunner.reset();
    currentArticle = null;
    chatState = 'initial';
    previousStepIndex = -1;
    
    // Clear chat messages
    clearElement(chatMessages);
    
    // Hide stepping stones
    steppingStonesContainer.style.display = 'none';
    
    // Re-enable and clear input
    chatInput.disabled = false;
    chatInput.value = '';
    chatInput.placeholder = 'Describe the issue...';
    
    // Show welcome message
    showWelcomeMessage();
  }
}

// Setup event listeners
function setupEventListeners() {
  // Chat input listeners
  sendButton.addEventListener('click', handleUserInput);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !chatInput.disabled) {
      handleUserInput();
    }
  });
  
  // Button listeners
  resetButton.addEventListener('click', handleReset);
  themeToggleButton.addEventListener('click', handleThemeToggle);
  
  // Modal controls
  closeFailureModal.addEventListener('click', () => {
    failureModal.style.display = 'none';
  });
  cancelFailure.addEventListener('click', () => {
    failureModal.style.display = 'none';
  });
  failureForm.addEventListener('submit', handleFailureSubmit);
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Close modals with Escape
    if (e.key === 'Escape') {
      if (failureModal.style.display === 'flex') {
        failureModal.style.display = 'none';
      }
    }
  });
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
  
  // Add message about failure recorded
  addAssistantMessage(`Issue recorded. Let me find an alternative approach...`);
  
  // Get all completed step texts for deduplication
  const completedStepTexts = [];
  const allSteps = currentArticle.steps || [];
  const state = stepRunner.getState();
  
  allSteps.forEach(s => {
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
      ? `Switching to alternative approach: ${fallbackResult.fallback.condition}. Skipping ${result.skippedSteps} step(s) already completed.`
      : `Switching to alternative approach: ${fallbackResult.fallback.condition}`;
    
    addAssistantMessage(message);
    showCurrentStepInChat();
  } else if (fallbackResult.type === 'cross-article') {
    // Found fallback in different article
    addAssistantMessage(`I found an alternative solution in "${fallbackResult.article.title}". Let's try that approach.`);
    
    // Switch to the new article
    currentArticle = fallbackResult.article;
    
    const result = stepRunner.switchToFallback(
      fallbackResult.fallback.id,
      currentArticle,
      completedStepTexts
    );
    
    if (result.skippedSteps > 0) {
      addAssistantMessage(`Skipping ${result.skippedSteps} step(s) already completed.`);
    }
    
    showCurrentStepInChat();
  } else if (fallbackResult.type === 'escalation') {
    // Show escalation guidance
    const escalation = fallbackResult.escalation;
    if (escalation) {
      addAssistantMessage(
        `No automated solution available. Escalation Required:\nWhen: ${escalation.when}\nTarget: ${escalation.target}`
      );
    } else {
      addAssistantMessage(
        'Issue recorded. No automated fallback available. Please escalate to appropriate support team.'
      );
    }
  }
}

// Handle theme toggle
function handleThemeToggle() {
  const currentTheme = isFeatureEnabled('ENABLE_PLAYFUL_THEME');
  const newTheme = !currentTheme;
  
  // Toggle theme
  setFeatureFlag('ENABLE_PLAYFUL_THEME', newTheme);
  
  // Save preference to localStorage
  saveThemePreference(newTheme);
  
  // Update UI if in stepping mode
  if (chatState === 'in-step') {
    if (newTheme) {
      showSteppingStonesProgress();
    } else {
      steppingStonesContainer.style.display = 'none';
    }
  }
  
  // Show notification
  const message = newTheme 
    ? '🎨 Playful theme enabled! Watch the boy jump across stepping stones!'
    : '📋 Classic theme disabled. Stepping stones hidden.';
  showNotification(message);
  
  console.log('[Stepper] Theme toggled:', newTheme ? 'Playful' : 'Classic');
}

// Load theme preference from localStorage
function loadThemePreference() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved !== null) {
      const enabled = saved === 'true';
      setFeatureFlag('ENABLE_PLAYFUL_THEME', enabled);
      console.log('[Stepper] Loaded theme preference:', enabled ? 'Playful' : 'Classic');
    }
  } catch (error) {
    console.warn('[Stepper] Could not load theme preference:', error);
  }
}

// Save theme preference to localStorage
function saveThemePreference(enabled) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, enabled.toString());
    console.log('[Stepper] Saved theme preference:', enabled ? 'Playful' : 'Classic');
  } catch (error) {
    console.warn('[Stepper] Could not save theme preference:', error);
  }
}

// Initialize on load
init();
