# Context Extraction Feature

## Overview

The Context Extraction feature automatically detects and extracts label-value pairs from scanned page content and intelligently augments step instructions with relevant contextual information.

## How It Works

### 1. Page Scanning

When `ENABLE_PAGE_SCAN=true`, the extension scans the active tab and extracts structured information:

```javascript
// Example scanned content
{
  url: 'https://example.com/support',
  title: 'Customer Support - Email Issue',
  text: `
    Customer ID: ABC123
    Terminal ID: T-456789
    SMTP Server: smtp.gmail.com
    Port Number: 587
    Account Type: Business
  `,
  extractedContext: Map {
    'Customer ID' => 'ABC123',
    'Terminal ID' => 'T-456789',
    'SMTP Server' => 'smtp.gmail.com',
    'Port Number' => '587',
    'Account Type' => 'Business'
  }
}
```

### 2. Label-Value Extraction

The system recognizes multiple separator patterns:

| Pattern | Example | Extracted |
|---------|---------|-----------|
| Colon | `Customer ID: ABC123` | `Customer ID` → `ABC123` |
| Equals | `Status = Active` | `Status` → `Active` |
| Dash | `Account Type - Premium` | `Account Type` → `Premium` |

**Supported Label Characters:**
- Letters (A-Z, a-z)
- Numbers (0-9)
- Spaces
- Hyphens (-)
- Underscores (_)

Examples of valid labels:
- `Customer ID`
- `IPv4 Address`
- `2FA Code`
- `Account-Type`
- `Node_01`

### 3. Step Augmentation

When displaying steps, the system:
1. Checks if any extracted labels are mentioned in the step text (case-insensitive)
2. Appends the found values in a styled hint

**Example:**

**Step Text (Original):**
```
Verify SMTP Server and Port Number match requirements
```

**Step Text (Augmented):**
```
Verify SMTP Server and Port Number match requirements
(Stepper found: SMTP Server: smtp.gmail.com, Port Number: 587)
```

The hint appears in blue, italic text to distinguish it from the original step instructions.

### 4. Case-Insensitive Matching

The system detects label mentions regardless of case:

| Step Text | Detected Label | Context Hint |
|-----------|----------------|--------------|
| "Check SMTP server" | `SMTP Server` | ✓ |
| "Verify customer id" | `Customer ID` | ✓ |
| "Use terminal ID" | `Terminal ID` | ✓ |

## Configuration

### Enabling the Feature

Set the feature flag in `src/modules/config.js`:

```javascript
export const FeatureFlags = {
  ENABLE_PAGE_SCAN: true  // Enable context extraction
};
```

Or toggle programmatically:

```javascript
import { setFeatureFlag } from './modules/config.js';
setFeatureFlag('ENABLE_PAGE_SCAN', true);
```

### Default State

**Default: `false` (disabled)**

The feature is disabled by default for:
- **Security**: Prevents unauthorized page access
- **Performance**: Avoids unnecessary scanning
- **Privacy**: No content extraction without explicit user consent

## UI Display

### Context Hints

Context hints appear inline with step text:

```css
.context-hint {
  display: inline;
  font-size: 14px;
  font-weight: 400;
  color: var(--primary-color);  /* Blue */
  font-style: italic;
  opacity: 0.9;
}
```

### Visual Example

```
┌─────────────────────────────────────────────────────────┐
│ Step 2 of 6                                             │
├─────────────────────────────────────────────────────────┤
│ Verify SMTP Server and Port Number match requirements  │
│ (Stepper found: SMTP Server: smtp.gmail.com,           │
│  Port Number: 587)                                      │
│                                                         │
│ Expected Outcome:                                       │
│ SMTP Server should be smtp.gmail.com and Port Number   │
│ should be 587                                           │
│ (Stepper found: SMTP Server: smtp.gmail.com,           │
│  Port Number: 587)                                      │
└─────────────────────────────────────────────────────────┘
```

## Implementation Details

### PageScanner Module

```javascript
class DefaultPageScanner extends PageScanner {
  _extractLabelValuePairs(text) {
    // Extracts label-value pairs using regex patterns
    // Returns Map<string, string>
  }
  
  async scanActivePage() {
    // Scans page and returns PageContent with extractedContext
  }
}
```

### UI Module

```javascript
function augmentTextWithContext(text) {
  // Pre-compiles regexes for efficiency
  // Tests each label against text (case-insensitive)
  // Returns HTML with context hints
}
```

### Data Flow

```
Page Content
    ↓
_extractLabelValuePairs()
    ↓
extractedContext Map
    ↓
initializePageScanning()
    ↓
Global extractedContext
    ↓
renderCurrentStep()
    ↓
augmentTextWithContext()
    ↓
Step HTML with Hints
```

## Use Cases

### 1. CRM Systems

Automatically extract customer information:
- Customer ID
- Case Number
- Account Type
- Priority Level
- Product Name

### 2. Technical Support

Extract technical details:
- Server addresses
- Port numbers
- IP addresses
- Error codes
- Configuration values

### 3. SAP CRM Integration

Future integration can parse SAP-specific fields:
- Transaction IDs
- Material Numbers
- Plant Codes
- Sales Orders
- Document Numbers

## Testing

### Unit Tests

Run the test suite:

```bash
node test-context-extraction.mjs
```

**Test Coverage:**
- ✓ Extract context from sample text (6 fields)
- ✓ Augment step text with context hints
- ✓ Case-insensitive matching
- ✓ Different separator patterns
- ✓ Empty context handling

### Manual Testing

1. Enable `ENABLE_PAGE_SCAN` in config.js
2. Navigate to a page with info box fields
3. Open the Stepper extension
4. Select an article
5. Verify context hints appear in step text

### Example Test Page

```html
<div class="info-box">
  <p>Customer ID: ABC123</p>
  <p>Terminal ID: T-456789</p>
  <p>SMTP Server: smtp.gmail.com</p>
  <p>Port Number: 587</p>
</div>
```

## Performance

### Optimization

**Regex Pre-compilation:**
- Regexes are compiled once per step render
- Cached in a Map for reuse
- Avoids repeated compilation in loops

**Extraction Limits:**
- Labels: 2-50 characters
- First match is preferred (no duplicates)
- Text scan limit: 10,000 characters

### Benchmarks

- Context extraction: <5ms for typical page
- Step augmentation: <1ms per step
- Regex compilation: ~0.1ms per label

## Security

### XSS Protection

All context values are escaped before display:

```javascript
html += ` <span class="context-hint">(Stepper found: ${escapeHtml(label)}: ${escapeHtml(value)})</span>`;
```

### Privacy

- Scanning is disabled by default
- Requires explicit flag enablement
- No data leaves the extension
- Context is stored in memory only

### Permissions

Required permissions (from manifest.json):
```json
{
  "permissions": ["sidePanel", "activeTab", "scripting"],
  "host_permissions": ["<all_urls>"]
}
```

## Limitations

### Current Limitations

1. **Pattern-based extraction**: Only recognizes specific separator patterns (`:`, `=`, `-`)
2. **Single-line values**: Doesn't handle multi-line values
3. **English-centric**: Regex patterns assume English-style labels
4. **No semantic understanding**: Doesn't understand meaning of fields

### Future Enhancements

- [ ] Multi-line value support
- [ ] Table extraction (HTML `<table>` elements)
- [ ] Custom pattern configuration
- [ ] LLM-based semantic extraction
- [ ] Field type detection (email, phone, ID, etc.)
- [ ] Confidence scoring for matches

## Examples

### Example 1: Email Support

**Page Content:**
```
Customer ID: C-12345
Email: user@example.com
SMTP Server: smtp.gmail.com
Port Number: 587
```

**Step Text:**
```
Verify SMTP Server and Port Number
```

**Result:**
```
Verify SMTP Server and Port Number
(Stepper found: SMTP Server: smtp.gmail.com, Port Number: 587)
```

### Example 2: Network Issue

**Page Content:**
```
IP Address: 192.168.1.100
Router Model: NetGear R7000
MAC Address: AA:BB:CC:DD:EE:FF
```

**Step Text:**
```
Check the IP Address configuration
```

**Result:**
```
Check the IP Address configuration
(Stepper found: IP Address: 192.168.1.100)
```

### Example 3: Multiple Mentions

**Page Content:**
```
Customer ID: ABC123
Account Type: Business
Terminal ID: T-456789
```

**Step Text:**
```
Verify Customer ID and Account Type are active
```

**Result:**
```
Verify Customer ID and Account Type are active
(Stepper found: Customer ID: ABC123, Account Type: Business)
```

## Best Practices

### For Content Authors

1. **Use consistent labels**: Stick to standard field names
2. **Clear separators**: Use `:`, `=`, or `-` consistently
3. **Meaningful labels**: Use descriptive, searchable labels
4. **Single-line values**: Keep values on the same line as labels

### For Developers

1. **Test with real pages**: Verify extraction with actual content
2. **Monitor performance**: Check extraction time on large pages
3. **Validate security**: Ensure all values are escaped
4. **Log extracted context**: Use console.log for debugging

### For Users

1. **Enable when needed**: Only enable page scanning when necessary
2. **Verify hints**: Check that detected values are correct
3. **Report issues**: Flag incorrect or missing extractions
4. **Privacy aware**: Understand what data is being scanned

## Troubleshooting

### No Context Hints Appearing

**Check:**
1. Is `ENABLE_PAGE_SCAN` set to `true`?
2. Does the page have label-value pairs?
3. Are labels mentioned in step text?
4. Check browser console for logs

### Incorrect Values Extracted

**Possible causes:**
1. Label pattern doesn't match separator used
2. Multi-line values not supported
3. Special characters in labels

**Solutions:**
- Adjust regex patterns in `_extractLabelValuePairs()`
- Check label format matches supported patterns
- Review console logs for extracted context

### Performance Issues

**If extraction is slow:**
1. Check page text length (limit: 10,000 chars)
2. Reduce number of context fields
3. Optimize regex patterns

## API Reference

### PageContent Type

```typescript
type PageContent = {
  url: string;
  title: string;
  text: string;
  metadata: Object;
  extractedContext: Map<string, string>;
  scannedAt: Date;
}
```

### Functions

#### `_extractLabelValuePairs(text: string): Map<string, string>`

Extracts label-value pairs from text.

**Parameters:**
- `text` - Text to extract from

**Returns:**
- Map of label to value

**Example:**
```javascript
const text = "Customer ID: ABC123\nTerminal ID: T-456";
const context = scanner._extractLabelValuePairs(text);
// Map { 'Customer ID' => 'ABC123', 'Terminal ID' => 'T-456' }
```

#### `augmentTextWithContext(text: string): string`

Augments text with context hints.

**Parameters:**
- `text` - Text to augment

**Returns:**
- HTML string with context hints

**Example:**
```javascript
const augmented = augmentTextWithContext("Verify Customer ID");
// "Verify Customer ID <span class='context-hint'>(Stepper found: Customer ID: ABC123)</span>"
```

## Version History

- **v1.0.0** - Initial implementation
  - Basic label-value extraction
  - Case-insensitive matching
  - Three separator patterns (`:`, `=`, `-`)
  - XSS protection
  - Comprehensive test coverage

## Related Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) - Overall system architecture
- [FEATURE_FLAGS_SUMMARY.md](FEATURE_FLAGS_SUMMARY.md) - Feature flags documentation
- [README.md](README.md) - General usage guide
