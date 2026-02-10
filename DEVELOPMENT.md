# Development Guide

## Testing the Extension

### Manual Testing in Chrome

1. **Load the Extension**
   ```
   1. Open Chrome
   2. Navigate to chrome://extensions/
   3. Enable "Developer mode" (toggle in top right)
   4. Click "Load unpacked"
   5. Select the project directory
   ```

2. **Open the Side Panel**
   - Click the Stepper extension icon in the toolbar
   - The side panel will open on the right

3. **Test Article Selection**
   - You should see a list of 5 sample articles
   - Click on any article to start the stepper

4. **Test Step Navigation**
   - Click "Continue" to advance through steps
   - Click "Back" to return to previous step
   - Verify step counter updates correctly

5. **Test Failure Recording**
   - Click "This didn't work" button
   - Select a reason from dropdown
   - Add optional note
   - Submit and verify it doesn't break navigation

6. **Test Full Article View**
   - Click "Open Full Article"
   - Verify all sections display correctly
   - Close modal and continue

7. **Test Completion**
   - Complete all steps in an article
   - Verify completion summary shows
   - Check completed steps list
   - Check failure notes (if any were recorded)

8. **Test Reset**
   - Click "Reset" button during step execution
   - Confirm the reset prompt
   - Verify return to article list

### Unit Testing

Run the test suite:
```bash
node test-stepper.mjs
```

This tests:
- State initialization
- Article start
- Step navigation (forward/back)
- Failure recording
- Completion summary
- Fallback path switching
- Completion detection

## Code Structure

### State Machine (stepper.js)
- Manages all state transitions
- Handles step navigation
- Tracks completion and failures
- Supports main and fallback paths

### UI Layer (sidepanel.js)
- Renders current state
- Handles user interactions
- Updates DOM based on state changes
- Manages modals

### Knowledge Base (kb.js, kb.mock.js)
- Article storage and retrieval
- Mock data for development
- Schema validation

## Adding New Articles

Edit `src/kb.mock.js` and add to the `mockArticles` array:

```javascript
{
  id: 6,
  title: "Your Title",
  tags: ["tag1", "tag2"],
  product: "Product Name",
  summary: "Brief summary",
  keywords: ["keyword1", "keyword2"],
  prechecks: ["Check 1", "Check 2"],
  steps: [
    {
      id: "step1",
      text: "Do something",
      expectedResult: "What should happen",
      sayToCustomer: "What to tell customer"
    }
  ],
  fallbacks: [],
  stop_conditions: ["When to stop"],
  escalation: {
    when: "When to escalate",
    target: "Who to escalate to"
  }
}
```

## Styling

All styles use CSS custom properties defined in `:root` in `sidepanel.css`.

To change colors:
```css
:root {
  --primary-color: #0066cc;  /* Main blue */
  --primary-hover: #0052a3;  /* Darker blue on hover */
  /* etc. */
}
```

## Debugging

### View Console Logs
1. Right-click the side panel
2. Select "Inspect"
3. View console tab

### View State
Add this to console:
```javascript
// In the side panel console
window.stepper.getState()
```

### Common Issues

**Extension doesn't load:**
- Check manifest.json is valid
- Verify all file paths are correct
- Check browser console for errors

**Side panel doesn't open:**
- Ensure sidePanel permission in manifest
- Check background.js is loaded
- Verify Chrome version supports side panel

**Styles not applying:**
- Hard refresh (Ctrl+Shift+R)
- Check CSS file path in HTML
- Verify CSS syntax

**JavaScript errors:**
- Check all imports use correct paths
- Verify ES modules syntax
- Check browser console

## Browser Compatibility

- **Chrome/Chromium**: Full support (v114+)
- **Edge**: Full support (v114+)
- **Other browsers**: May require Manifest V2 version

## Security Notes

- All data stays local (no external requests)
- No user data collection
- No analytics or tracking
- Read-only article display
