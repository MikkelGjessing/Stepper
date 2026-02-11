// UI Module
// Provides UI rendering utilities and helpers

/**
 * Show notification to user
 * @param {string} message - Message to display
 * @param {Object} options - Notification options
 * @returns {boolean} True if confirmed (for requireConfirm)
 */
export function showNotification(message, options = {}) {
  const { 
    type = 'info',  // 'info', 'success', 'warning', 'error'
    requireConfirm = false 
  } = options;
  
  if (requireConfirm) {
    return confirm(message);
  }
  
  // For now, use alert for simplicity
  // TODO: Replace with toast notification system for better UX
  alert(message);
  return true;
}

/**
 * Format failure reason for display
 * @param {string} reason - Reason code
 * @returns {string} Human-readable reason
 */
export function formatReason(reason) {
  const reasons = {
    'cant-find-option': "Customer can't find option/button",
    'system-error': 'System error message',
    'permission-issue': 'Permission/access issue',
    'no-change': "Outcome didn't change",
    'other': 'Other'
  };
  return reasons[reason] || reason;
}

/**
 * Render article item in list
 * @param {Object} article - Article object
 * @param {Function} onClick - Click handler
 * @returns {HTMLElement} Article item element
 */
export function renderArticleItem(article, onClick) {
  const articleItem = document.createElement('div');
  articleItem.className = 'article-item';
  articleItem.innerHTML = `
    <h3>${escapeHtml(article.title)}</h3>
    <p>${escapeHtml(article.summary)}</p>
    <div class="article-tags">
      ${article.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
    </div>
  `;
  articleItem.addEventListener('click', onClick);
  return articleItem;
}

/**
 * Render completed step in summary
 * @param {Object} step - Step object
 * @returns {HTMLElement} Completed step element
 */
export function renderCompletedStep(step) {
  const stepItem = document.createElement('div');
  stepItem.className = 'completed-step';
  stepItem.textContent = `✓ ${step.text}`;
  return stepItem;
}

/**
 * Render failure note in summary
 * @param {Object} failure - Failure object
 * @param {Object} step - Associated step object
 * @returns {HTMLElement} Failure note element
 */
export function renderFailureNote(failure, step) {
  const failureItem = document.createElement('div');
  failureItem.className = 'failure-note';
  failureItem.innerHTML = `
    <strong>${escapeHtml(step ? step.text : failure.stepId)}</strong>
    <p><strong>Reason:</strong> ${escapeHtml(formatReason(failure.reasonCategory))}</p>
    ${failure.note ? `<p><strong>Note:</strong> ${escapeHtml(failure.note)}</p>` : ''}
    <p class="timestamp">${new Date(failure.timestamp).toLocaleString()}</p>
  `;
  return failureItem;
}

/**
 * Populate full article content
 * @param {Object} article - Article object
 * @param {HTMLElement} container - Container element
 */
export function populateFullArticle(article, container) {
  if (!article) return;
  
  container.innerHTML = '';
  
  // Add summary
  const summarySection = document.createElement('div');
  summarySection.className = 'article-section';
  summarySection.innerHTML = `
    <h3>Summary</h3>
    <p>${escapeHtml(article.summary)}</p>
  `;
  container.appendChild(summarySection);
  
  // Add prechecks if available
  if (article.prechecks && article.prechecks.length > 0) {
    const prechecksSection = document.createElement('div');
    prechecksSection.className = 'article-section';
    prechecksSection.innerHTML = `
      <h3>Pre-checks</h3>
      <ul>
        ${article.prechecks.map(check => `<li>${escapeHtml(check)}</li>`).join('')}
      </ul>
    `;
    container.appendChild(prechecksSection);
  }
  
  // Add main steps
  const stepsSection = document.createElement('div');
  stepsSection.className = 'article-section';
  stepsSection.innerHTML = `<h3>Steps</h3>`;
  
  article.steps.forEach((step, index) => {
    const stepItem = document.createElement('div');
    stepItem.className = 'step-item';
    stepItem.innerHTML = `
      <strong>Step ${index + 1}:</strong> ${escapeHtml(step.text)}
      ${step.expectedResult ? `<br><em>Expected: ${escapeHtml(step.expectedResult)}</em>` : ''}
    `;
    stepsSection.appendChild(stepItem);
  });
  
  container.appendChild(stepsSection);
  
  // Add fallbacks if available
  if (article.fallbacks && article.fallbacks.length > 0) {
    const fallbacksSection = document.createElement('div');
    fallbacksSection.className = 'article-section';
    fallbacksSection.innerHTML = `<h3>Fallback Procedures</h3>`;
    
    article.fallbacks.forEach(fallback => {
      const fallbackItem = document.createElement('div');
      fallbackItem.innerHTML = `<strong>${escapeHtml(fallback.condition)}</strong>`;
      const fallbackSteps = document.createElement('ol');
      fallback.steps.forEach(step => {
        const li = document.createElement('li');
        li.textContent = step.text;
        fallbackSteps.appendChild(li);
      });
      fallbackItem.appendChild(fallbackSteps);
      fallbacksSection.appendChild(fallbackItem);
    });
    
    container.appendChild(fallbacksSection);
  }
  
  // Add escalation info if available
  if (article.escalation) {
    const escalationSection = document.createElement('div');
    escalationSection.className = 'article-section';
    escalationSection.innerHTML = `
      <h3>Escalation</h3>
      <p><strong>When:</strong> ${escapeHtml(article.escalation.when)}</p>
      <p><strong>Target:</strong> ${escapeHtml(article.escalation.target)}</p>
    `;
    container.appendChild(escalationSection);
  }
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
export function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Update step progress indicator
 * @param {HTMLElement} element - Progress element
 * @param {number} current - Current step (1-indexed)
 * @param {number} total - Total steps
 */
export function updateStepProgress(element, current, total) {
  element.textContent = `Step ${current} of ${total}`;
}

/**
 * Show/hide element
 * @param {HTMLElement} element - Element to show/hide
 * @param {boolean} show - True to show, false to hide
 */
export function toggleElement(element, show) {
  element.style.display = show ? 'block' : 'none';
}

/**
 * Clear element content
 * @param {HTMLElement} element - Element to clear
 */
export function clearElement(element) {
  element.innerHTML = '';
}
