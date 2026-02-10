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
│   └── kb.mock.js         # Mock knowledge base data
└── icons/
    ├── icon16.png         # 16x16 extension icon
    ├── icon48.png         # 48x48 extension icon
    └── icon128.png        # 128x128 extension icon
```

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
