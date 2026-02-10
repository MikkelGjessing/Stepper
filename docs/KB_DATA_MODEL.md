# Enhanced Knowledge Article Data Model

## Overview

This document describes the enhanced data model for knowledge articles in the Stepper application. The model supports advanced troubleshooting workflows including prechecks, detailed steps, fallback paths, and escalation procedures.

## Data Model Schema

### KnowledgeArticle

The main article object containing all information needed for a support article.

```javascript
{
  id: number,                    // Unique identifier
  title: string,                 // Article title
  tags: string[],                // Searchable tags for categorization
  product: string,               // Product name this article applies to
  version?: string,              // Optional product version
  summary: string,               // Brief summary of issue and solution
  prechecks: string[],           // Pre-flight checks before troubleshooting
  steps: Step[],                 // Main troubleshooting steps
  fallbacks: FallbackPath[],     // Alternative paths if main steps fail
  stop_conditions: string[],     // Conditions indicating resolution
  escalation: Escalation         // Escalation information
}
```

### Step

Individual troubleshooting steps with detailed information.

```javascript
{
  id: string,                    // Unique step identifier (e.g., "step-1-1")
  text: string,                  // Internal step description
  expected?: string,             // Expected outcome after step
  say_to_customer?: string,      // Customer-facing instruction
  type?: 'action' | 'check'      // Type of step
}
```

**Step Types:**
- `action`: Step requires the customer to perform an action
- `check`: Step is a verification or diagnostic check

### FallbackPath

Alternative troubleshooting paths when the main steps don't resolve the issue.

```javascript
{
  id: string,                    // Unique fallback identifier
  trigger_keywords: string[],    // Keywords that trigger this path
  reason_category: string,       // Category of why main path failed
  steps: Step[]                  // Alternative steps to try
}
```

**Common Reason Categories:**
- `emails_stuck_in_outbox`
- `server_configuration_issue`
- `attachment_too_large`
- `authentication_failure`
- `hardware_failure`
- `missing_dependencies`
- `compatibility_issue`
- `email_not_received`
- `resource_exhaustion`
- `printer_offline`
- `driver_issue`

### Escalation

Information about when and how to escalate the issue.

```javascript
{
  when: string,                  // Condition triggering escalation
  target: string                 // Team or person to escalate to
}
```

## Mock Dataset Overview

The mock dataset in `kb.mock.js` contains **8 realistic support articles** with the following characteristics:

### Articles Included

1. **Email Not Sending - Outlook** (Article #1)
   - Product: Microsoft Outlook
   - 5 main steps, 2 fallback paths
   - Tags: email, outlook, send, smtp, not-working, delivery

2. **Email Not Sending - Gmail Web** (Article #2)
   - Product: Gmail
   - 5 main steps, 1 fallback path
   - Tags: email, gmail, send, web, browser, not-working
   - **Overlaps with Article #1** (shared email troubleshooting concepts)

3. **Cannot Connect to WiFi Network** (Article #3)
   - Product: Windows PC
   - 5 main steps, 1 fallback path
   - Tags: wifi, network, connection, wireless, internet, connectivity
   - **Shares steps 1-3 with Article #4** (network connectivity basics)

4. **Ethernet Connection Not Working** (Article #4)
   - Product: Windows PC
   - 5 main steps, 1 fallback path
   - Tags: ethernet, wired, network, lan, connection, cable
   - **Shares steps 1-3 with Article #4** (network connectivity basics)

5. **Application Crashing on Startup** (Article #5)
   - Product: Desktop Applications
   - 6 main steps, 2 fallback paths
   - Tags: crash, startup, launch, application, error, freeze

6. **Password Reset Link Not Working** (Article #6)
   - Product: Web Applications
   - 5 main steps, 1 fallback path
   - Tags: password, reset, forgot, login, account, authentication

7. **Computer Running Slowly** (Article #7)
   - Product: Windows PC
   - 6 main steps, 1 fallback path
   - Tags: slow, performance, lag, freeze, speed, sluggish

8. **Printer Not Responding** (Article #8)
   - Product: Network Printers
   - 6 main steps, 2 fallback paths
   - Tags: printer, print, printing, offline, spooler, queue

### Special Characteristics

#### Overlapping Content (Deduplication Testing)

**Email-related articles (Articles #1 and #2):**
- Both address email sending issues
- Share common troubleshooting concepts (connectivity, recipient validation)
- Different products (Outlook vs Gmail) but similar workflows
- Useful for testing deduplication logic

**Network connectivity articles (Articles #3 and #4):**
- Articles #3 and #4 share the first 3 steps:
  1. Check adapter/connection status
  2. Toggle airplane mode
  3. Restart network equipment
- Demonstrates common initial diagnostic steps
- After step 3, paths diverge based on connection type (WiFi vs Ethernet)

#### Multiple Fallback Paths

**Article #1 (Email Not Sending - Outlook):**
- Fallback #1: Emails stuck in outbox
- Fallback #2: Server configuration issues

**Article #5 (Application Crashing):**
- Fallback #1: Missing dependencies (DLL files)
- Fallback #2: Compatibility issues

**Article #8 (Printer Not Responding):**
- Fallback #1: Printer offline mode
- Fallback #2: Driver issues

## Usage Examples

### Import the knowledge base

```javascript
import {
  enhancedKnowledgeBase,
  getAllEnhancedArticles,
  getArticleById,
  findArticlesByTags,
  findArticlesByProduct
} from './kb.mock.js';
```

### Get all articles

```javascript
const allArticles = getAllEnhancedArticles();
console.log(`Total articles: ${allArticles.length}`);
```

### Find article by ID

```javascript
const article = getArticleById(1);
console.log(article.title); // "Email Not Sending - Outlook"
```

### Search by tags

```javascript
const emailArticles = findArticlesByTags(['email', 'send']);
// Returns articles #1 and #2
```

### Search by product

```javascript
const windowsArticles = findArticlesByProduct('Windows PC');
// Returns articles #3, #4, and #7
```

### Access step information

```javascript
const article = getArticleById(1);

// Get main steps
article.steps.forEach(step => {
  console.log(`${step.id}: ${step.say_to_customer}`);
});

// Get fallback paths
article.fallbacks.forEach(fallback => {
  console.log(`Fallback: ${fallback.reason_category}`);
  console.log(`Triggers: ${fallback.trigger_keywords.join(', ')}`);
});
```

## Design Decisions

### Why These Specific Articles?

1. **Common Support Scenarios**: Articles cover the most frequent technical support issues
2. **Variety of Products**: Mix of email clients, operating systems, and hardware
3. **Different Complexity Levels**: From simple (WiFi) to complex (application crashes)
4. **Real-world Accuracy**: Steps based on actual troubleshooting procedures

### Step Granularity

- Each step is atomic and actionable
- Steps include both customer-facing language and internal descriptions
- Expected outcomes help agents verify step completion
- Type field (action/check) enables UI to show appropriate icons

### Fallback Paths

- Triggered by specific keywords or failure patterns
- Categorized by failure reason for analytics
- Each fallback has its own step sequence
- Allows for branching troubleshooting workflows

### Prechecks

- Quick validations before starting main troubleshooting
- Saves time by eliminating obvious issues
- Examples: "Is it plugged in?", "Is the service active?"

### Stop Conditions

- Clear success criteria
- Help agents know when to stop troubleshooting
- Multiple conditions provide flexibility

### Escalation

- Defines when human expertise is needed
- Specifies which team to escalate to
- Includes time-based triggers (e.g., "after 30 minutes")

## Future Enhancements

Potential additions to the data model:

- **Prerequisites**: Required tools, permissions, or access
- **Related Articles**: Links to related troubleshooting guides
- **Troubleshooting Time Estimate**: Expected duration
- **Success Rate**: Historical resolution percentage
- **Customer Feedback**: Ratings and comments
- **Multimedia**: Screenshots, videos, or diagrams
- **Localization**: Multi-language support
- **Version History**: Track article updates over time

## Validation Rules

When adding new articles, ensure:

1. **Unique IDs**: Each article must have a unique numeric ID
2. **Step IDs**: Follow format "step-{article}-{number}" or "fb-{article}-{fallback}-{number}"
3. **Required Fields**: id, title, tags, product, summary must be present
4. **Array Fields**: tags, prechecks, steps, fallbacks, stop_conditions must be arrays
5. **Escalation**: Must include both 'when' and 'target' fields
6. **Step Types**: If specified, must be either 'action' or 'check'
7. **Tag Conventions**: Use lowercase, hyphenated tags for consistency

## Testing Considerations

### Deduplication Testing

Use Articles #1 & #2 (email) or #3 & #4 (network) to test:
- Article similarity detection
- Step overlap identification
- Smart routing to prevent showing duplicate articles

### Fallback Flow Testing

Use Articles #1, #5, or #8 to test:
- Keyword-based fallback triggering
- Multi-path navigation
- User choice between fallbacks

### Complex Workflow Testing

Use Article #5 (Application Crashing) to test:
- Long step sequences (6 main steps)
- Multiple fallback paths
- Different step types (action vs check)

## Notes

- This is a mock dataset for development and testing
- In production, articles would be stored in a database
- The enhanced model is backward compatible with the simple model
- Articles can be converted to the simple format if needed
