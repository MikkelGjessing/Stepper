# Stepper

A step-by-step guiding chat panel for variance reduction - Browser Extension

## Overview

Stepper is a browser extension that provides step-by-step support guidance through a side panel interface. Users can describe their issues, and the extension matches them with relevant support articles from a local knowledge base, presenting solutions one step at a time.

## Features

- 🎯 **Intelligent Article Retrieval**: Weighted scoring algorithm finds top 3 matching articles
- 📊 **Confidence Scoring**: Shows match scores and warns when confidence is low
- 🎨 **Article Selection UI**: Agent picks from top 3 matches with scores and summaries
- 📋 **Step-by-Step Guidance**: Presents solutions one step at a time for better focus
- ⬅️ **Navigation Controls**: Continue, Back, and Reset buttons for flexible navigation
- 📄 **Full Article View**: Option to view all steps at once
- ⚠️ **Feedback Mechanism**: "This didn't work" button for user feedback
- 🏗️ **Modular Architecture**: Separate swappable modules for UI, retrieval, and step logic

## Architecture

The extension is built with a clean modular architecture:

- **`src/retrieval.js`**: Article retrieval module - scoring algorithm and matching logic (swappable with API)
- **`src/kb.js`**: Simple knowledge base module - basic article storage (legacy)
- **`src/kb.mock.js`**: Enhanced knowledge base - detailed articles with fallback paths
- **`src/stepper.js`**: Step Logic module - manages step navigation and state
- **`src/sidepanel.js`**: UI module - controls user interactions and view updates
- **`src/sidepanel.html`**: HTML structure for the side panel
- **`src/sidepanel.css`**: Modern styling for the UI
- **`src/background.js`**: Background service worker for extension setup

## Installation

### Chrome/Edge (Manifest V3)

1. Clone this repository or download the source code
2. Open Chrome/Edge and navigate to `chrome://extensions/` (or `edge://extensions/`)
3. Enable "Developer mode" using the toggle in the top right
4. Click "Load unpacked"
5. Select the `Stepper` directory
6. The extension icon should appear in your browser toolbar

### Using the Extension

1. Click the Stepper extension icon in your browser toolbar to open the side panel
2. Describe your issue in the text area (e.g., "My email is not sending")
3. Click "Find Solution" to search the knowledge base
4. Review the solution overview showing the total number of steps
5. Click "Start Steps" to begin the step-by-step guide
6. Use the navigation buttons:
   - **Continue**: Move to the next step
   - **Back**: Return to the previous step
   - **Reset**: Start over from step 1
   - **This didn't work**: Provide feedback about the step
   - **Open full article**: View all steps at once

## Knowledge Base

The extension includes two knowledge base implementations:

### Simple Knowledge Base (`src/kb.js`)
A basic implementation with 5 sample support articles for:
- Email sending issues
- Password reset problems
- Application crashes
- Slow internet connection
- Printer troubleshooting

### Enhanced Knowledge Base (`src/kb.mock.js`)
A comprehensive data model with 8 realistic support articles featuring:

- **Detailed Step Information**: Each step includes internal description, expected outcome, and customer-facing instructions
- **Step Types**: Distinguish between action steps and verification checks
- **Prechecks**: Pre-flight validations before starting troubleshooting
- **Fallback Paths**: Alternative troubleshooting routes with trigger keywords and reason categories
- **Stop Conditions**: Clear success criteria for issue resolution
- **Escalation Procedures**: When and where to escalate unresolved issues

**Article Coverage:**
1. Email Not Sending - Outlook (2 fallback paths)
2. Email Not Sending - Gmail Web (1 fallback path)
3. Cannot Connect to WiFi Network (1 fallback path) - shares initial steps with #4
4. Ethernet Connection Not Working (1 fallback path) - shares initial steps with #3
5. Application Crashing on Startup (2 fallback paths)
6. Password Reset Link Not Working (1 fallback path)
7. Computer Running Slowly (1 fallback path)
8. Printer Not Responding (2 fallback paths)

**Special Features:**
- Articles #1 & #2 have overlapping content (email troubleshooting) for deduplication testing
- Articles #3 & #4 share the first 3 steps (network connectivity basics)
- Articles #1, #5, and #8 have multiple fallback paths for complex troubleshooting

See [docs/KB_DATA_MODEL.md](docs/KB_DATA_MODEL.md) for complete schema documentation and usage examples.

See [docs/RETRIEVAL_SYSTEM.md](docs/RETRIEVAL_SYSTEM.md) for details on the article retrieval and scoring algorithm.

You can extend either knowledge base by adding more articles following the respective formats.

## Development

### Project Structure

```
Stepper/
├── manifest.json          # Extension manifest
├── src/
│   ├── background.js      # Background service worker
│   ├── kb.js             # Simple knowledge base module
│   ├── kb.mock.js        # Enhanced knowledge base with detailed model
│   ├── validate-kb.js    # Validation script for enhanced KB
│   ├── stepper.js        # Step navigation logic
│   ├── sidepanel.html    # Side panel HTML
│   ├── sidepanel.css     # Styling
│   └── sidepanel.js      # UI controller
├── assets/
│   ├── icon16.png        # Extension icons
│   ├── icon48.png
│   └── icon128.png
├── docs/
│   └── KB_DATA_MODEL.md  # Enhanced data model documentation
└── README.md
```

### Extending the Knowledge Base

#### Simple Knowledge Base (`src/kb.js`)

To add new support articles, edit `src/kb.js` and add objects to the `knowledgeBase` array:

```javascript
{
  id: 6,
  title: "Your Article Title",
  keywords: ["keyword1", "keyword2", "keyword3"],
  summary: "Brief summary of the solution",
  steps: [
    "Step 1 instructions",
    "Step 2 instructions",
    // ... more steps
  ]
}
```

#### Enhanced Knowledge Base (`src/kb.mock.js`)

For the enhanced model, use the detailed schema:

```javascript
{
  id: 9,
  title: "Article Title",
  tags: ["tag1", "tag2"],
  product: "Product Name",
  version: "1.0",  // optional
  summary: "Brief summary",
  prechecks: ["Precheck 1", "Precheck 2"],
  steps: [
    {
      id: "step-9-1",
      text: "Internal description",
      expected: "Expected outcome",
      say_to_customer: "Customer-facing instruction",
      type: "action"  // or "check"
    }
  ],
  fallbacks: [
    {
      id: "fallback-9-1",
      trigger_keywords: ["keyword1", "keyword2"],
      reason_category: "category_name",
      steps: [/* step objects */]
    }
  ],
  stop_conditions: ["Condition 1", "Condition 2"],
  escalation: {
    when: "After X minutes or condition",
    target: "Team Name"
  }
}
```

Run `node src/validate-kb.js` to validate your changes.

### Customizing the UI

The UI styling can be customized by modifying the CSS variables in `src/sidepanel.css`:

```css
:root {
  --primary-color: #4f46e5;
  --primary-hover: #4338ca;
  /* ... more variables */
}
```

## Browser Compatibility

- ✅ Chrome 114+
- ✅ Edge 114+
- ✅ Other Chromium-based browsers with Manifest V3 support

## License

MIT License - Feel free to use and modify as needed.
