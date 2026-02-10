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
      failureHistory: []
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

  // Switch to fallback path
  switchToFallback(fallbackId, article) {
    this.state.activePath = fallbackId;
    this.state.currentStepIndex = 0;
    this.state.attemptedPaths.push({ 
      path: fallbackId, 
      startedAt: new Date().toISOString() 
    });
    
    return {
      totalSteps: this.getTotalSteps(article),
      currentStep: this.getCurrentStep(article)
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

  // Check if process is complete
  isComplete(article) {
    const steps = this.getStepsForActivePath(article);
    return this.state.currentStepIndex >= steps.length;
  }
}

export default StepperStateMachine;
