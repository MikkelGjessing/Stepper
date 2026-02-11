// Page Scanner Module
// Provides interface and implementations for scanning page content
// Supports future integration with SAP CRM and other systems

/**
 * @typedef {Object} PageContent
 * @property {string} url - Page URL
 * @property {string} title - Page title
 * @property {string} text - Extracted text content
 * @property {Object} metadata - Additional metadata (product, case number, etc.)
 * @property {Map<string, string>} extractedContext - Label-value pairs extracted from page (e.g., "Terminal ID" -> "12345")
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

    // Return mocked content for now (deterministic behavior)
    console.log('[PageScanner] Returning mocked page content');
    return this._getMockedPageContent();
  }

  /**
   * Get mocked page content for testing/development
   * Returns deterministic test data
   * @returns {PageContent} Mocked page content
   * @private
   */
  _getMockedPageContent() {
    const mockScenarios = [
      {
        url: 'https://example.com/support',
        title: 'Customer Support - Email Issue',
        text: `Email not sending. Using Gmail. Error message: "Could not connect to SMTP server". Checked internet connection.
        
        Customer ID: ABC123
        Terminal ID: T-456789
        SMTP Server: smtp.gmail.com
        Port Number: 587
        Account Type: Business`,
        metadata: {
          product: 'Gmail',
          issue: 'email-sending',
          platform: 'Windows'
        }
      },
      {
        url: 'https://example.com/help',
        title: 'Network Connection Problems',
        text: `Internet connection lost. WiFi shows connected but no internet access. Using Windows 10. Network adapter seems active.
        
        Router Model: NetGear R7000
        IP Address: 192.168.1.100
        MAC Address: AA:BB:CC:DD:EE:FF
        Network Name: HomeWiFi`,
        metadata: {
          product: 'Windows',
          issue: 'network',
          platform: 'Windows 10'
        }
      },
      {
        url: 'https://example.com/issues',
        title: 'Software Installation Failed',
        text: `Installation failed with error code 1603. Windows installer package. Need administrator permissions.
        
        Error Code: 1603
        Product Name: Adobe Acrobat
        Version: 2023.1
        Installation Path: C:\\Program Files\\Adobe`,
        metadata: {
          product: 'Windows Installer',
          issue: 'installation',
          errorCode: '1603'
        }
      }
    ];

    // Return first scenario for deterministic behavior
    const scenario = mockScenarios[0];
    
    // Extract label-value pairs from text
    const extractedContext = this._extractLabelValuePairs(scenario.text);
    
    return {
      ...scenario,
      extractedContext,
      scannedAt: new Date()
    };
  }

  /**
   * Extract label-value pairs from text
   * Detects patterns like "Label: Value", "Label = Value", "Label - Value"
   * @param {string} text - Text to extract from
   * @returns {Map<string, string>} Map of label to value
   * @private
   */
  _extractLabelValuePairs(text) {
    const context = new Map();
    
    if (!text) return context;
    
    // Pattern matches:
    // - "Label: Value" (colon separator)
    // - "Label = Value" (equals separator)
    // - "Label - Value" (dash separator, with extra spacing)
    // Labels can contain letters, numbers, spaces, hyphens, and underscores
    const patterns = [
      /([A-Za-z0-9][A-Za-z0-9\s\-_]+?):\s*([^\n]+)/g,  // Colon: "Customer ID: ABC123", "IPv4 Address: 192.168.1.1"
      /([A-Za-z0-9][A-Za-z0-9\s\-_]+?)\s*=\s*([^\n]+)/g,  // Equals: "Status = Active", "2FA Code = 123"
      /([A-Za-z0-9][A-Za-z0-9\s\-_]+?)\s+-\s+([^\n]+)/g   // Dash: "Account Type - Premium"
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const label = match[1].trim();
        const value = match[2].trim();
        
        // Only store if label is reasonable length (2-50 chars) and value exists
        // Don't overwrite if already exists (prefer first match)
        if (label.length >= 2 && label.length <= 50 && value && value.length > 0 && !context.has(label)) {
          context.set(label, value);
        }
      }
    });
    
    return context;
  }

  /**
   * Scan the active tab for real content (disabled for now)
   * @returns {Promise<PageContent|null>} Page content or null if unavailable
   * @private
   */
  async _scanActivePageReal() {
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
      
      // Extract label-value pairs from text
      const extractedContext = this._extractLabelValuePairs(content.text);
      
      return {
        url: tab.url,
        title: tab.title || content.title,
        text: content.text,
        metadata: content.metadata || {},
        extractedContext,
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
    const MAX_TEXT_LENGTH = 10000; // Maximum text length to extract
    
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
      text: text.substring(0, MAX_TEXT_LENGTH), // Limit text length
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
