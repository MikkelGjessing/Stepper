// Page Scanner Module
// Provides interface and implementations for scanning page content
// Supports future integration with SAP CRM and other systems

/**
 * @typedef {Object} PageContent
 * @property {string} url - Page URL
 * @property {string} title - Page title
 * @property {string} text - Extracted text content
 * @property {Object} metadata - Additional metadata (product, case number, etc.)
 * @property {Date} scannedAt - Timestamp of scan
 */

/**
 * PageScanner Interface
 * Defines the contract for page scanning implementations
 */
export class PageScanner {
  /**
   * Scan the active tab for content
   * @returns {Promise<PageContent|null>} Extracted page content or null if unavailable
   */
  async scanActivePage() {
    throw new Error('PageScanner.scanActivePage() must be implemented');
  }

  /**
   * Check if scanner is enabled
   * @returns {boolean} True if scanner is enabled
   */
  isEnabled() {
    throw new Error('PageScanner.isEnabled() must be implemented');
  }

  /**
   * Enable the scanner
   */
  enable() {
    throw new Error('PageScanner.enable() must be implemented');
  }

  /**
   * Disable the scanner
   */
  disable() {
    throw new Error('PageScanner.disable() must be implemented');
  }
}

/**
 * Default Page Scanner (Stub Implementation)
 * Disabled by default, reads basic text from active tab when enabled
 */
export class DefaultPageScanner extends PageScanner {
  constructor() {
    super();
    this.enabled = false;
  }

  /**
   * Check if scanner is enabled
   * @returns {boolean} True if enabled
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Enable the scanner
   */
  enable() {
    this.enabled = true;
    console.log('[PageScanner] Enabled');
  }

  /**
   * Disable the scanner
   */
  disable() {
    this.enabled = false;
    console.log('[PageScanner] Disabled');
  }

  /**
   * Scan the active tab for content
   * @returns {Promise<PageContent|null>} Page content or null if disabled
   */
  async scanActivePage() {
    if (!this.isEnabled()) {
      console.log('[PageScanner] Scanner is disabled');
      return null;
    }

    try {
      // Query the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        console.warn('[PageScanner] No active tab found');
        return null;
      }

      // Execute script to extract page content
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: this._extractPageContent
      });

      if (!results || results.length === 0) {
        console.warn('[PageScanner] No results from content extraction');
        return null;
      }

      const content = results[0].result;
      
      return {
        url: tab.url,
        title: tab.title || content.title,
        text: content.text,
        metadata: content.metadata || {},
        scannedAt: new Date()
      };
    } catch (error) {
      console.error('[PageScanner] Error scanning page:', error);
      return null;
    }
  }

  /**
   * Content extraction function (runs in page context)
   * This is injected into the active tab
   * @private
   */
  _extractPageContent() {
    // Extract basic page content
    const text = document.body.innerText || document.body.textContent || '';
    const title = document.title || '';
    
    // Extract metadata (can be extended for SAP CRM)
    const metadata = {};
    
    // Look for common metadata patterns
    const metaTags = document.querySelectorAll('meta[name], meta[property]');
    metaTags.forEach(tag => {
      const name = tag.getAttribute('name') || tag.getAttribute('property');
      const content = tag.getAttribute('content');
      if (name && content) {
        metadata[name] = content;
      }
    });

    return {
      title,
      text: text.substring(0, 10000), // Limit text length
      metadata
    };
  }
}

/**
 * SAP CRM Page Scanner (Placeholder for future implementation)
 * Will provide specialized scanning for SAP CRM pages
 */
export class SAPCRMPageScanner extends PageScanner {
  constructor() {
    super();
    this.enabled = false;
  }

  isEnabled() {
    return this.enabled;
  }

  enable() {
    this.enabled = true;
    console.log('[SAPCRMPageScanner] Enabled');
  }

  disable() {
    this.enabled = false;
    console.log('[SAPCRMPageScanner] Disabled');
  }

  /**
   * Scan SAP CRM page for structured data
   * @returns {Promise<PageContent|null>} SAP CRM specific content
   */
  async scanActivePage() {
    if (!this.isEnabled()) {
      return null;
    }

    // TODO: Implement SAP CRM specific scanning
    // - Extract case/ticket numbers
    // - Parse product information
    // - Extract customer data
    // - Read error messages
    // - Identify workflow state
    
    console.log('[SAPCRMPageScanner] SAP CRM scanning not yet implemented');
    return null;
  }

  /**
   * Extract SAP CRM specific content (placeholder)
   * @private
   */
  _extractSAPContent() {
    // TODO: Implement SAP CRM content extraction
    // Look for SAP-specific DOM structures, data attributes, etc.
    return {
      caseNumber: null,
      product: null,
      status: null,
      errorMessages: [],
      customerInfo: {}
    };
  }
}

/**
 * Factory to create appropriate page scanner based on configuration
 * @param {string} type - Scanner type ('default', 'sap-crm')
 * @returns {PageScanner} Scanner instance
 */
export function createPageScanner(type = 'default') {
  switch (type) {
    case 'sap-crm':
      return new SAPCRMPageScanner();
    case 'default':
    default:
      return new DefaultPageScanner();
  }
}
