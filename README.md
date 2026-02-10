# Stepper

A step-by-step guiding chat panel for variance reduction - Browser Extension

## Overview

Stepper is a browser extension that provides step-by-step support guidance through a side panel interface. Users can describe their issues, and the extension matches them with relevant support articles from a local knowledge base, presenting solutions one step at a time.

## Features

- 🎯 **Intelligent Article Matching**: Automatically finds the best matching support article based on user's issue description
- 📋 **Step-by-Step Guidance**: Presents solutions one step at a time for better focus and comprehension
- ⬅️ **Navigation Controls**: Continue, Back, and Reset buttons for flexible navigation
- 📄 **Full Article View**: Option to view all steps at once
- ⚠️ **Feedback Mechanism**: "This didn't work" button for user feedback
- 🎨 **Modern UI**: Clean, intuitive interface with visual progress indicators
- 🏗️ **Modular Architecture**: Separate modules for UI, retrieval, and step logic

## Architecture

The extension is built with a clean modular architecture:

- **`src/kb.js`**: Knowledge Base module - handles article storage and retrieval logic
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

The extension includes a mock knowledge base with sample support articles for:

- Email sending issues
- Password reset problems
- Application crashes
- Slow internet connection
- Printer troubleshooting

You can easily extend the knowledge base by editing `src/kb.js` and adding more articles.

## Development

### Project Structure

```
Stepper/
├── manifest.json          # Extension manifest
├── src/
│   ├── background.js      # Background service worker
│   ├── kb.js             # Knowledge base module
│   ├── stepper.js        # Step navigation logic
│   ├── sidepanel.html    # Side panel HTML
│   ├── sidepanel.css     # Styling
│   └── sidepanel.js      # UI controller
├── assets/
│   ├── icon16.png        # Extension icons
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

### Extending the Knowledge Base

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
