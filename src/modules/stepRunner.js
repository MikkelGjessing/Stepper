// Step Runner Module
// Manages step-by-step execution, navigation, and state

import { findStepsToSkip, normalizeToTokens, calculateKeywordOverlap } from './dedupe.js';

/**
 * Step Runner State Machine
 * Manages the execution state and navigation of troubleshooting steps
 */
export class StepRunner {
  constructor() {
    this.reset();
  }

  /**
   * Initialize/reset state
   */
  reset() {
    this.state = {
      selectedArticleId: null,
      activePath: "main", // "main" or fallback ID
      currentStepIndex: 0,
      completedStepIds: new Set(),
      attemptedPaths: [],
      failureHistory: [],
      skippedStepsCount: 0
    };
  }

  /**
   * Start a new article session
   * @param {number} articleId - Article ID
   * @param {Object} article - Article object
   * @returns {Object} Start info with total steps and current step
   */
  startArticle(articleId, article) {
    this.reset();
    this.state.selectedArticleId = articleId;
    this.state.activePath = "main";
    this.state.currentStepIndex = 0;
    this.state.attemptedPaths.push({ 
      path: "main", 
      startedAt: new Date().toISOString() 
    });
    
    return {
      totalSteps: this.getTotalSteps(article),
      currentStep: this.getCurrentStep(article)
    };
  }

  /**
   * Get total steps for the active path
   * @param {Object} article - Article object
   * @returns {number} Total step count
   */
  getTotalSteps(article) {
    if (!article) return 0;
    
    if (this.state.activePath === "main") {
      return article.steps ? article.steps.length : 0;
    } else {
      const fallback = article.fallbacks?.find(f => f.id === this.state.activePath);
      return fallback?.steps ? fallback.steps.length : 0;
    }
  }

  /**
   * Get current step object
   * @param {Object} article - Article object
   * @returns {Object|null} Current step or null
   */
  getCurrentStep(article) {
    if (!article) return null;
    
    const steps = this.getStepsForActivePath(article);
    if (!steps || this.state.currentStepIndex >= steps.length) {
      return null;
    }
    
    return steps[this.state.currentStepIndex];
  }

  /**
   * Get steps for the currently active path
   * @param {Object} article - Article object
   * @returns {Array} Array of steps
   */
  getStepsForActivePath(article) {
    if (!article) return [];
    
    if (this.state.activePath === "main") {
      return article.steps || [];
    } else {
      const fallback = article.fallbacks?.find(f => f.id === this.state.activePath);
      return fallback?.steps || [];
    }
  }

  /**
   * Mark current step as completed and advance
   * @param {Object} article - Article object
   * @returns {Object} Result with completion status and next step
   */
  continue(article) {
    const currentStep = this.getCurrentStep(article);
    if (!currentStep) {
      return { completed: true };
    }

    // Mark step as completed
    this.state.completedStepIds.add(currentStep.id);
    
    // Advance to next step
    this.state.currentStepIndex++;
    
    const steps = this.getStepsForActivePath(article);
    const isLastStep = this.state.currentStepIndex >= steps.length;
    
    return {
      completed: isLastStep,
      nextStep: isLastStep ? null : this.getCurrentStep(article),
      currentStepIndex: this.state.currentStepIndex,
      totalSteps: this.getTotalSteps(article)
    };
  }

  /**
   * Go back to previous step
   * @returns {Object} Result with success status
   */
  back() {
    if (this.state.currentStepIndex > 0) {
      this.state.currentStepIndex--;
      return {
        success: true,
        currentStepIndex: this.state.currentStepIndex
      };
    }
    return {
      success: false,
      message: "Already at first step"
    };
  }

  /**
   * Record step failure
   * @param {string} stepId - Step ID
   * @param {string} reasonCategory - Failure reason category
   * @param {string} note - Optional failure note
   * @returns {Object} Failure record
   */
  recordFailure(stepId, reasonCategory, note) {
    const failure = {
      stepId,
      reasonCategory,
      note,
      timestamp: new Date().toISOString()
    };
    
    this.state.failureHistory.push(failure);
    
    return failure;
  }

  /**
   * Switch to fallback path with deduplication
   * @param {string} fallbackId - Fallback ID
   * @param {Object} article - Article object
   * @param {string[]} completedStepTexts - Texts of completed steps
   * @returns {Object} Result with total steps, current step, and skipped count
   */
  switchToFallback(fallbackId, article, completedStepTexts = []) {
    this.state.activePath = fallbackId;
    this.state.attemptedPaths.push({ 
      path: fallbackId, 
      startedAt: new Date().toISOString() 
    });
    
    // Get fallback steps
    const fallbackSteps = this.getStepsForActivePath(article);
    
    // Find steps to skip based on similarity to completed steps
    const stepsToSkip = findStepsToSkip(fallbackSteps, completedStepTexts);
    
    // Find first non-skipped step
    let startIndex = 0;
    for (let i = 0; i < fallbackSteps.length; i++) {
      if (!stepsToSkip.has(i)) {
        startIndex = i;
        break;
      }
    }
    
    // The startIndex itself represents consecutive skipped steps from beginning
    const consecutiveSkipped = startIndex;
    
    this.state.currentStepIndex = startIndex;
    this.state.skippedStepsCount = consecutiveSkipped;
    
    return {
      totalSteps: this.getTotalSteps(article),
      currentStep: this.getCurrentStep(article),
      skippedSteps: consecutiveSkipped
    };
  }

  /**
   * Find best matching fallback in current article
   * @param {Object} article - Article object
   * @param {string} reasonCategory - Failure reason category
   * @param {string[]} queryTokens - Query tokens from failure note
   * @returns {Object|null} Best matching fallback or null
   */
  findFallbackInArticle(article, reasonCategory, queryTokens) {
    if (!article.fallbacks || article.fallbacks.length === 0) {
      return null;
    }
    
    // Filter fallbacks by reason_category
    const matchingFallbacks = article.fallbacks.filter(
      fb => fb.reason_category === reasonCategory
    );
    
    if (matchingFallbacks.length === 0) return null;
    if (matchingFallbacks.length === 1) return matchingFallbacks[0];
    
    // Multiple matches - pick the one with best keyword overlap
    let bestFallback = matchingFallbacks[0];
    let bestScore = calculateKeywordOverlap(
      matchingFallbacks[0].trigger_keywords || [],
      queryTokens
    );
    
    for (let i = 1; i < matchingFallbacks.length; i++) {
      const score = calculateKeywordOverlap(
        matchingFallbacks[i].trigger_keywords || [],
        queryTokens
      );
      if (score > bestScore) {
        bestScore = score;
        bestFallback = matchingFallbacks[i];
      }
    }
    
    return bestFallback;
  }

  /**
   * Search for fallback across all articles
   * @param {Array} allArticles - All available articles
   * @param {string} reasonCategory - Failure reason category
   * @param {string[]} queryTokens - Query tokens
   * @param {number} currentArticleId - Current article ID to skip
   * @returns {Object|null} Result with article and fallback or null
   */
  findFallbackAcrossArticles(allArticles, reasonCategory, queryTokens, currentArticleId) {
    for (const article of allArticles) {
      if (article.id === currentArticleId) continue;
      
      const fallback = this.findFallbackInArticle(article, reasonCategory, queryTokens);
      if (fallback) {
        return { article, fallback };
      }
    }
    return null;
  }

  /**
   * Select appropriate fallback based on failure reason
   * @param {Object} currentArticle - Current article
   * @param {Array} allArticles - All articles
   * @param {string} reasonCategory - Failure reason category
   * @param {string} failureNote - Failure note for context
   * @returns {Object} Fallback selection result
   */
  selectFallback(currentArticle, allArticles, reasonCategory, failureNote) {
    // Extract query tokens from failure note
    const queryTokens = normalizeToTokens(failureNote || '');
    
    // First, try to find fallback in current article
    const fallbackInArticle = this.findFallbackInArticle(
      currentArticle,
      reasonCategory,
      queryTokens
    );
    
    if (fallbackInArticle) {
      return { 
        type: 'same-article',
        fallback: fallbackInArticle,
        article: currentArticle
      };
    }
    
    // Try other articles
    const crossArticleResult = this.findFallbackAcrossArticles(
      allArticles,
      reasonCategory,
      queryTokens,
      currentArticle.id
    );
    
    if (crossArticleResult) {
      return {
        type: 'cross-article',
        fallback: crossArticleResult.fallback,
        article: crossArticleResult.article
      };
    }
    
    // No fallback found - return escalation guidance
    return {
      type: 'escalation',
      escalation: currentArticle.escalation
    };
  }

  /**
   * Get completion summary
   * @returns {Object} Summary of completed steps and failures
   */
  getCompletionSummary() {
    return {
      completedSteps: Array.from(this.state.completedStepIds),
      failureHistory: this.state.failureHistory,
      attemptedPaths: this.state.attemptedPaths,
      completedAt: new Date().toISOString()
    };
  }

  /**
   * Get current state
   * @returns {Object} Current state with arrays instead of Sets
   */
  getState() {
    return {
      ...this.state,
      completedStepIds: Array.from(this.state.completedStepIds)
    };
  }

  /**
   * Get skipped steps count
   * @returns {number} Number of skipped steps
   */
  getSkippedStepsCount() {
    return this.state.skippedStepsCount;
  }

  /**
   * Clear skipped steps count (after showing banner)
   */
  clearSkippedStepsCount() {
    this.state.skippedStepsCount = 0;
  }

  /**
   * Check if process is complete
   * @param {Object} article - Article object
   * @returns {boolean} True if complete
   */
  isComplete(article) {
    const steps = this.getStepsForActivePath(article);
    return this.state.currentStepIndex >= steps.length;
  }
}
