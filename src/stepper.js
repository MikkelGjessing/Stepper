// Step Logic Module
// Manages step navigation and state

class StepManager {
  constructor() {
    this.currentArticle = null;
    this.currentStepIndex = 0;
    this.maxSteps = 0;
  }

  /**
   * Initialize with a new article
   * @param {object} article - The article with steps to navigate
   */
  setArticle(article) {
    this.currentArticle = article;
    this.currentStepIndex = 0;
    this.maxSteps = article.steps.length;
  }

  /**
   * Get the current step information
   * @returns {object|null} - Current step data or null if no article
   */
  getCurrentStep() {
    if (!this.currentArticle) {
      return null;
    }

    return {
      stepNumber: this.currentStepIndex + 1,
      totalSteps: this.maxSteps,
      stepText: this.currentArticle.steps[this.currentStepIndex],
      isFirst: this.currentStepIndex === 0,
      isLast: this.currentStepIndex === this.maxSteps - 1,
      articleTitle: this.currentArticle.title,
      articleSummary: this.currentArticle.summary
    };
  }

  /**
   * Move to the next step
   * @returns {boolean} - True if successfully moved, false if at end
   */
  nextStep() {
    if (!this.currentArticle || this.currentStepIndex >= this.maxSteps - 1) {
      return false;
    }
    this.currentStepIndex++;
    return true;
  }

  /**
   * Move to the previous step
   * @returns {boolean} - True if successfully moved, false if at start
   */
  previousStep() {
    if (!this.currentArticle || this.currentStepIndex <= 0) {
      return false;
    }
    this.currentStepIndex--;
    return true;
  }

  /**
   * Reset to the first step
   */
  reset() {
    this.currentStepIndex = 0;
  }

  /**
   * Clear all state
   */
  clear() {
    this.currentArticle = null;
    this.currentStepIndex = 0;
    this.maxSteps = 0;
  }

  /**
   * Check if there's an active article
   * @returns {boolean} - True if an article is loaded
   */
  hasArticle() {
    return this.currentArticle !== null;
  }

  /**
   * Get the full article
   * @returns {object|null} - The current article or null
   */
  getArticle() {
    return this.currentArticle;
  }
}

export { StepManager };
