// Configuration Module
// Centralized feature flags and configuration settings

/**
 * Feature Flags
 * Control optional functionality and experimental features
 */
export const FeatureFlags = {
  /**
   * Enable LLM-based assistance features
   * When enabled, provides AI-powered suggestions and analysis
   * Default: false (not yet implemented)
   */
  ENABLE_LLM_ASSIST: false,

  /**
   * Enable page scanning functionality
   * When enabled, automatically scans the active tab for relevant content
   * and prefills the search query with extracted information
   * Default: false (disabled for security and performance)
   */
  ENABLE_PAGE_SCAN: false,

  /**
   * Enable playful stepping stones theme
   * When enabled, shows a cartoon boy jumping across stepping stones
   * instead of the standard "Step X of Y" text indicator
   * Default: false (disabled for minimal MVP)
   */
  ENABLE_PLAYFUL_THEME: false,
};

/**
 * Get current feature flag status
 * @param {string} flagName - Name of the feature flag
 * @returns {boolean} Current status of the flag
 */
export function isFeatureEnabled(flagName) {
  return FeatureFlags[flagName] === true;
}

/**
 * Set feature flag status (for testing/debugging)
 * @param {string} flagName - Name of the feature flag
 * @param {boolean} enabled - New status
 */
export function setFeatureFlag(flagName, enabled) {
  if (flagName in FeatureFlags) {
    FeatureFlags[flagName] = enabled;
    console.log(`[Config] Feature flag ${flagName} set to ${enabled}`);
  } else {
    console.warn(`[Config] Unknown feature flag: ${flagName}`);
  }
}

/**
 * Get all feature flags
 * @returns {Object} All feature flags and their current status
 */
export function getAllFeatureFlags() {
  return { ...FeatureFlags };
}

console.log('[Config] Feature flags loaded:', FeatureFlags);
