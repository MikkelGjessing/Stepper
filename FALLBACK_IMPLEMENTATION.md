# Fallback Selection Implementation Summary

## Overview
Implemented deterministic fallback selection with automatic step deduplication to improve support efficiency and reduce redundant steps when switching to alternative solutions.

## Features Implemented

### 1. Updated Failure Modal

**New Reason Categories:**
- `cant-find-option` - "Customer can't find option/button"
- `system-error` - "System error message"
- `permission-issue` - "Permission/access issue"
- `no-change` - "Outcome didn't change"
- `other` - "Other"

These categories replace the previous generic failure reasons and enable intelligent fallback matching.

### 2. Deterministic Fallback Selection Algorithm

**Three-Tier Selection Strategy:**

1. **Same-Article Fallbacks**
   - Search current article for fallbacks matching `reason_category`
   - If multiple matches found, rank by keyword overlap score
   - Uses tokenized failure note to match against `trigger_keywords`

2. **Cross-Article Fallbacks**
   - If no match in current article, search other articles
   - Returns first matching fallback from another article
   - Offers user choice to switch articles

3. **Escalation Guidance**
   - If no fallback found anywhere, show escalation info
   - Displays `article.escalation.when` and `article.escalation.target`

**Keyword Matching:**
- Tokenizes failure note (lowercase, remove punctuation)
- Counts overlaps with fallback's `trigger_keywords` array
- Selects fallback with highest overlap count

### 3. Step Deduplication

**Similarity Detection:**
- Normalizes text to tokens (remove punctuation, lowercase)
- Calculates Jaccard similarity: `intersection / union`
- Threshold: `STEP_SIMILARITY_THRESHOLD = 0.6` (configurable)
- Considers exact matches as similar regardless of threshold

**Deduplication Process:**
1. When switching to fallback, compare each fallback step with completed steps
2. Mark steps as "to skip" if Jaccard > 0.6 OR exact match
3. Find first non-skipped step in fallback sequence
4. Count consecutive skipped steps from beginning
5. Start at first non-skipped step

**UI Feedback:**
- Shows banner: "Skipped N steps already completed"
- Banner displayed only on first step after switch
- Automatically cleared after display

### 4. Enhanced Knowledge Base Schema

**Fallback Object Structure:**
```javascript
{
  id: "fallback1",
  condition: "If step2 fails",
  reason_category: "system-error",        // NEW: matches failure modal
  trigger_keywords: ["smtp", "settings"], // NEW: for keyword matching
  steps: [...]
}
```

**Sample Fallbacks Added:**
- **Gmail**: 1 system-error fallback (SMTP issues)
- **Outlook**: 2 fallbacks (quota/system-error, offline/no-change)
- **Windows Network**: 1 no-change fallback (adapter driver)
- **Mac Network**: 2 fallbacks (WiFi/no-change, permissions/permission-issue)

## User Experience Flow

### Before (Original)
1. Step fails
2. Agent clicks "This didn't work"
3. Records failure with generic reason
4. Agent manually continues or resets
5. No automatic alternative offered

### After (New)
1. Step fails
2. Agent clicks "This didn't work"
3. Selects specific reason category + adds note
4. **System automatically finds matching fallback**
5. **Deduplicates steps already completed**
6. Shows "Skipped N steps" banner
7. Continues at first non-duplicate step
8. Falls back to escalation if no automated solution

## Technical Implementation

### New Methods in `stepper.js`

**Text Processing:**
- `normalizeToTokens(text)` - Tokenize for comparison
- `calculateJaccardSimilarity(tokens1, tokens2)` - Similarity score
- `areStepsSimilar(text1, text2)` - Boolean similarity check

**Deduplication:**
- `findStepsToSkip(fallbackSteps, completedTexts)` - Identify duplicates
- Modified `switchToFallback()` - Accept completed texts, skip duplicates

**Fallback Selection:**
- `calculateKeywordOverlap(keywords, tokens)` - Score keyword match
- `findFallbackInArticle(article, category, tokens)` - Same-article search
- `findFallbackAcrossArticles(articles, category, tokens, currentId)` - Cross-article
- `selectFallback(article, articles, category, note)` - Main algorithm

**State Management:**
- Added `skippedStepsCount` to state
- `getSkippedStepsCount()` - Retrieve count
- `clearSkippedStepsCount()` - Reset after display

### UI Changes in `sidepanel.js`

**Notification Helper:**
```javascript
showNotification(message, options = {})
// options: { type, requireConfirm }
```

**Failure Handling:**
- Updated `handleFailureSubmit()` to trigger fallback selection
- Integrated three-tier selection with user notifications
- Article switching support for cross-article fallbacks

### Styling in `sidepanel.css`

**Skipped Steps Banner:**
- Yellow/gold background (#fff3cd)
- Gold border (#ffc107)
- Dark text (#856404)
- Centered, prominent placement

## Testing

### Test Coverage (10 scenarios, 100% passing)

1. **Text Normalization** - Tokenization correctness
2. **Jaccard Similarity** - Calculation accuracy
3. **Step Similarity** - Threshold detection
4. **Deduplication** - Skip identification
5. **Keyword Overlap** - Scoring accuracy
6. **Same-Article Search** - Fallback finding
7. **Multi-Match Selection** - Best keyword overlap
8. **Cross-Article Search** - Other article matching
9. **Complete Selection Flow** - All three tiers
10. **Fallback Switching** - Deduplication integration

### Test File
`test-fallback.mjs` - Comprehensive unit tests for all features

## Code Quality

### Improvements Made
- Extracted magic number 0.6 to `STEP_SIMILARITY_THRESHOLD` constant
- Removed duplicate consecutive skip calculation
- Added `showNotification()` helper for consistent UX
- Removed unused parameters

### Security
- CodeQL scan: 0 vulnerabilities
- No external dependencies added
- All processing done client-side

## Performance Considerations

**Efficient Algorithms:**
- Jaccard similarity: O(n + m) where n, m are token counts
- Keyword overlap: O(k * t) where k = keywords, t = tokens
- Fallback search: O(f) where f = number of fallbacks (typically < 5)

**Memory:**
- Token sets created on-demand
- No persistent caching needed
- Minimal state overhead (single integer for skip count)

## Future Enhancements

**Potential Improvements:**
1. Replace `alert()` with toast notification system
2. Add fallback effectiveness tracking (success rate per fallback)
3. Machine learning for keyword extraction from failure notes
4. Configurable similarity threshold per article type
5. Visual indicator for which steps were skipped in completion summary

## Migration Notes

**Breaking Changes:**
None - fully backward compatible

**KB Migration:**
Existing articles work without modification. To enable fallback selection:
1. Add `reason_category` to fallback objects
2. Add `trigger_keywords` array to fallbacks
3. Use new failure modal categories in troubleshooting guides

**Configuration:**
- Similarity threshold: Modify `STEP_SIMILARITY_THRESHOLD` in `stepper.js`
- Add/modify reason categories: Update `sidepanel.html` dropdown + `formatReason()`

## Files Modified

| File | Changes | Lines |
|------|---------|-------|
| `src/stepper.js` | Added fallback selection + deduplication | +180 |
| `src/sidepanel.js` | Integrated fallback flow + notifications | +80 |
| `src/sidepanel.html` | Updated modal, added banner | +10 |
| `src/sidepanel.css` | Banner styling | +15 |
| `src/kb.mock.js` | Enhanced fallbacks | +40 |
| `.gitignore` | Exclude test files | +1 |

**Total**: ~325 lines added

## Success Metrics

**Implemented Successfully:**
✅ All 5 reason categories working
✅ Same-article fallback selection working
✅ Cross-article fallback selection working
✅ Escalation handling working
✅ Step deduplication working (>0.6 threshold)
✅ Skipped steps banner displaying correctly
✅ All 10 unit tests passing
✅ 0 security vulnerabilities
✅ Code review passed

## Documentation

**Updated:**
- This summary document
- Inline code comments
- Test file with examples

**See Also:**
- `DEVELOPMENT.md` - Developer guide
- `README.md` - User guide
- `test-fallback.mjs` - Test examples
