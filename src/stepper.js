// Stepper State Machine
// Manages the step-by-step execution state and navigation

class StepperStateMachine {
  constructor() {
    this.reset();
  }

  // Initialize state
  reset() {
    this.state = {
      selectedArticleId: null,
      activePath: "main", // "main" or fallback ID
      currentStepIndex: 0,
      completedStepIds: new Set(),
      attemptedPaths: [],
      failureHistory: [],
      skippedStepsCount: 0 // Track number of skipped steps when switching to fallback
    };
  }

  // Normalize text to tokens for similarity comparison
  normalizeToTokens(text) {
    if (!text) return [];
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
      .split(/\s+/) // Split on whitespace
      .filter(token => token.length > 0); // Remove empty tokens
  }

  // Calculate Jaccard similarity between two token sets
  calculateJaccardSimilarity(tokens1, tokens2) {
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    if (union.size === 0) return 0;
    return intersection.size / union.size;
  }

  // Check if two step texts are similar
  areStepsSimilar(text1, text2) {
    // Exact match
    if (text1 === text2) return true;
    
    // Tokenize and calculate Jaccard similarity
    const tokens1 = this.normalizeToTokens(text1);
    const tokens2 = this.normalizeToTokens(text2);
    
    const similarity = this.calculateJaccardSimilarity(tokens1, tokens2);
    return similarity > 0.6;
  }

  // Find steps to skip based on completed steps
  findStepsToSkip(fallbackSteps, completedStepTexts) {
    const stepsToSkip = new Set();
    
    fallbackSteps.forEach((step, index) => {
      for (const completedText of completedStepTexts) {
        if (this.areStepsSimilar(step.text, completedText)) {
          stepsToSkip.add(index);
          break;
        }
      }
    });
    
    return stepsToSkip;
  }

  // Calculate keyword overlap score
  calculateKeywordOverlap(triggerKeywords, queryTokens) {
    if (!triggerKeywords || triggerKeywords.length === 0) return 0;
    if (!queryTokens || queryTokens.length === 0) return 0;
    
    const querySet = new Set(queryTokens);
    let overlapCount = 0;
    
    for (const keyword of triggerKeywords) {
      if (querySet.has(keyword.toLowerCase())) {
        overlapCount++;
      }
    }
    
    return overlapCount;
  }

  // Find best matching fallback in current article
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
    let bestScore = this.calculateKeywordOverlap(
      matchingFallbacks[0].trigger_keywords || [],
      queryTokens
    );
    
    for (let i = 1; i < matchingFallbacks.length; i++) {
      const score = this.calculateKeywordOverlap(
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

  // Search for fallback across all articles
  findFallbackAcrossArticles(allArticles, reasonCategory, queryTokens, currentArticleId) {
    for (const article of allArticles) {
      if (article.id === currentArticleId) continue; // Skip current article
      
      const fallback = this.findFallbackInArticle(article, reasonCategory, queryTokens);
      if (fallback) {
        return { article, fallback };
      }
    }
    return null;
  }

  // Select appropriate fallback based on failure reason
  selectFallback(currentArticle, allArticles, reasonCategory, failureNote) {
    // Extract query tokens from failure note
    const queryTokens = this.normalizeToTokens(failureNote || '');
    
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

  // Start a new article session
  startArticle(articleId, article) {
    this.reset();
    this.state.selectedArticleId = articleId;
    this.state.activePath = "main";
    this.state.currentStepIndex = 0;
    this.state.attemptedPaths.push({ path: "main", startedAt: new Date().toISOString() });
    
    return {
      totalSteps: this.getTotalSteps(article),
      currentStep: this.getCurrentStep(article)
    };
  }

  // Get total steps for the active path
  getTotalSteps(article) {
    if (!article) return 0;
    
    if (this.state.activePath === "main") {
      return article.steps ? article.steps.length : 0;
    } else {
      // Find fallback path
      const fallback = article.fallbacks?.find(f => f.id === this.state.activePath);
      return fallback?.steps ? fallback.steps.length : 0;
    }
  }

  // Get current step object
  getCurrentStep(article) {
    if (!article) return null;
    
    const steps = this.getStepsForActivePath(article);
    if (!steps || this.state.currentStepIndex >= steps.length) {
      return null;
    }
    
    return steps[this.state.currentStepIndex];
  }

  // Get steps for the currently active path
  getStepsForActivePath(article) {
    if (!article) return [];
    
    if (this.state.activePath === "main") {
      return article.steps || [];
    } else {
      const fallback = article.fallbacks?.find(f => f.id === this.state.activePath);
      return fallback?.steps || [];
    }
  }

  // Mark current step as completed and advance
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

  // Go back to previous step
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

  // Record step failure
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

  // Switch to fallback path with deduplication
  switchToFallback(fallbackId, article, completedStepTexts = []) {
    this.state.activePath = fallbackId;
    this.state.attemptedPaths.push({ 
      path: fallbackId, 
      startedAt: new Date().toISOString() 
    });
    
    // Get fallback steps
    const fallbackSteps = this.getStepsForActivePath(article);
    
    // Find steps to skip based on similarity to completed steps
    const stepsToSkip = this.findStepsToSkip(fallbackSteps, completedStepTexts);
    
    // Find first non-skipped step
    let startIndex = 0;
    for (let i = 0; i < fallbackSteps.length; i++) {
      if (!stepsToSkip.has(i)) {
        startIndex = i;
        break;
      }
    }
    
    // Check if all steps from the beginning are skipped
    let consecutiveSkipped = 0;
    for (let i = 0; i < fallbackSteps.length; i++) {
      if (stepsToSkip.has(i)) {
        consecutiveSkipped++;
      } else {
        break;
      }
    }
    
    this.state.currentStepIndex = startIndex;
    this.state.skippedStepsCount = consecutiveSkipped;
    
    return {
      totalSteps: this.getTotalSteps(article),
      currentStep: this.getCurrentStep(article),
      skippedSteps: consecutiveSkipped
    };
  }

  // Get completion summary
  getCompletionSummary() {
    return {
      completedSteps: Array.from(this.state.completedStepIds),
      failureHistory: this.state.failureHistory,
      attemptedPaths: this.state.attemptedPaths,
      completedAt: new Date().toISOString()
    };
  }

  // Get current state (for debugging/display)
  getState() {
    return {
      ...this.state,
      completedStepIds: Array.from(this.state.completedStepIds)
    };
  }

  // Get skipped steps count
  getSkippedStepsCount() {
    return this.state.skippedStepsCount;
  }

  // Clear skipped steps count (after showing banner)
  clearSkippedStepsCount() {
    this.state.skippedStepsCount = 0;
  }

  // Check if process is complete
  isComplete(article) {
    const steps = this.getStepsForActivePath(article);
    return this.state.currentStepIndex >= steps.length;
  }
}

export default StepperStateMachine;
