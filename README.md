# Stepper
A step-by-step guiding side panel for variance reduction

## Overview
Stepper is a Chrome browser extension that provides a step-by-step guided process for troubleshooting and support scenarios. It helps reduce variance in customer support by ensuring consistent execution of knowledge base articles.

## Features

### State Management
- **selectedArticleId**: Tracks the currently active article
- **activePath**: Manages "main" path or fallback procedures
- **currentStepIndex**: Tracks progress through steps
- **completedStepIds**: Set of completed step IDs
- **attemptedPaths**: History of paths attempted
- **failureHistory**: Array of failures with reason, notes, and timestamps

### Step Runner Behavior
1. **Article Selection**: Browse and select from knowledge base articles
2. **Step Display**: Shows one step at a time with:
   - Step text and instructions
   - Expected results (when available)
   - Optional "Say to Customer" suggestions
3. **Navigation Controls**:
   - **Continue**: Marks step completed and advances
   - **Back**: Returns to previous step
   - **This didn't work**: Opens modal to record failure with reason and notes
   - **Open Full Article**: View complete article in read-only mode
   - **Reset**: Clears all state and returns to article selection
4. **Completion**: Shows summary with completed steps and any failure notes

## Installation

### Load Unpacked Extension
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `/home/runner/work/Stepper/Stepper` directory
5. The Stepper extension icon should appear in your toolbar

### Opening the Side Panel
- Click the Stepper extension icon in your toolbar
- The side panel will open with the knowledge base article list

## File Structure

```
Stepper/
├── manifest.json           # Extension manifest (Manifest V3)
├── src/
│   ├── background.js      # Service worker for extension lifecycle
│   ├── sidepanel.html     # Side panel UI structure
│   ├── sidepanel.css      # Styling with CSS variables
│   ├── sidepanel.js       # Main UI logic and event handlers
│   ├── stepper.js         # State machine implementation
│   ├── kb.js              # Knowledge base management
│   ├── kb.mock.js         # Mock knowledge base data (legacy)
│   └── modules/           # Modular architecture
│       ├── config.js      # Feature flags and configuration
│       ├── retrieval.js   # Article retrieval (swappable provider)
│       ├── stepRunner.js  # Step execution state machine
│       ├── dedupe.js      # Deduplication utilities
│       ├── pageScanner.js # Page content scanning
│       ├── ui.js          # UI rendering utilities
│       └── kb.mock.js     # Mock knowledge base articles
└── icons/
    ├── icon16.png         # 16x16 extension icon
    ├── icon48.png         # 48x48 extension icon
    └── icon128.png        # 128x128 extension icon
```

## Feature Flags

Stepper uses feature flags to control optional functionality. These are configured in `src/modules/config.js`:

### ENABLE_PLAYFUL_THEME
- **Default**: `true`
- **Purpose**: Enable playful stepping stones progress indicator
- **When enabled**: 
  - Shows a cartoon boy jumping across stepping stones
  - Animated jump when advancing to next step
  - Visual stone states (completed: blue, current: green, upcoming: faded)
  - Toggle via 🎨 button in header
- **When disabled**: Shows classic "Step X of Y" text indicator
- See [STEPPING_STONES_THEME.md](STEPPING_STONES_THEME.md) for details

### ENABLE_LLM_ASSIST
- **Default**: `false`
- **Purpose**: Enable AI-powered assistance features (not yet implemented)
- **When enabled**: Will provide LLM-based suggestions and analysis

### ENABLE_PAGE_SCAN
- **Default**: `false` (disabled for security and performance)
- **Purpose**: Automatically scan the active tab for relevant content
- **When enabled**: 
  - Scans page content on initialization
  - **Extracts label-value pairs** (e.g., "Customer ID: ABC123", "Terminal ID: T-456")
  - Stores extracted context for intelligent step augmentation
  - Prefills search query with extracted information
  - Augments step instructions with detected values
  - Shows notification when content is detected
  - Uses mocked data (deterministic behavior for testing)

#### Context Extraction

When page scanning is enabled, the system automatically:

1. **Extracts structured data** from the page using pattern matching:
   - `Label: Value` (colon separator)
   - `Label = Value` (equals separator)
   - `Label - Value` (dash separator)

2. **Stores in extractedContext Map** for later use

3. **Augments step text** when labels are mentioned:
   ```
   Original: "Verify SMTP Server and Port Number"
   Augmented: "Verify SMTP Server and Port Number 
              (Stepper found: SMTP Server: smtp.gmail.com, Port Number: 587)"
   ```

4. **Case-insensitive matching** detects labels regardless of case

See [CONTEXT_EXTRACTION.md](CONTEXT_EXTRACTION.md) for complete documentation.

### Enabling Feature Flags

To enable a feature flag, edit `src/modules/config.js`:

```javascript
export const FeatureFlags = {
  ENABLE_PLAYFUL_THEME: true,  // Toggle playful stepping stones theme
  ENABLE_LLM_ASSIST: false,
  ENABLE_PAGE_SCAN: true,  // Change to true to enable
};
```

Or use the API programmatically:

```javascript
import { setFeatureFlag } from './modules/config.js';

// Enable playful theme
setFeatureFlag('ENABLE_PLAYFUL_THEME', true);

// Enable page scanning
setFeatureFlag('ENABLE_PAGE_SCAN', true);

// Disable LLM assist
setFeatureFlag('ENABLE_LLM_ASSIST', false);
```

Or toggle themes via the UI:
- Click the 🎨 button in the header to toggle between playful and classic themes
- Preference is saved to localStorage and persists across sessions

## Knowledge Base Schema

Articles follow this enhanced schema:

```javascript
{
  id: number,
  title: string,
  tags: string[],
  product: string,
  version?: string,
  summary: string,
  keywords: string[],
  prechecks: string[],
  steps: [{
    id: string,
    text: string,
    expectedResult?: string,
    sayToCustomer?: string
  }],
  fallbacks: [{
    id: string,
    condition: string,
    steps: [{ id, text, expectedResult? }]
  }],
  stop_conditions: string[],
  escalation: {
    when: string,
    target: string
  }
}
```

## Development

### Modifying Mock Data
Edit `src/kb.mock.js` to add or modify knowledge base articles.

### Styling
The extension uses CSS custom properties (variables) defined in `src/sidepanel.css` for consistent theming.

### State Machine
The core state management is in `src/stepper.js`. It handles:
- Article initialization
- Step navigation (forward/back)
- Completion tracking
- Failure recording
- Path switching (main to fallback)

## Testing
1. Load the extension in Chrome
2. Click the extension icon to open the side panel
3. Select an article from the list
4. Navigate through steps using the provided buttons
5. Test failure recording with "This didn't work"
6. View full article with "Open Full Article"
7. Complete all steps to see the completion summary

## Browser Compatibility
- Chrome (Manifest V3)
- Other Chromium-based browsers with side panel support
