# Article Retrieval System Documentation

## Overview

The article retrieval system intelligently matches user queries to knowledge base articles using a weighted scoring algorithm. It returns the top 3 matches and indicates when confidence is low, prompting agents to carefully review all options.

## Architecture

The retrieval system is designed as a **separate, swappable module** (`src/retrieval.js`) that can be easily replaced with an API call in the future without changing the UI layer.

```
User Query → Retrieval Module → Top 3 Matches → UI Display → Agent Selection
```

## Scoring Algorithm

The system uses a simple but effective scoring algorithm:

| Match Type | Points | Description |
|------------|--------|-------------|
| Tag match | +3 | Query contains a term from the article's tags array |
| Product match | +2 | Query contains a word from the product name |
| Title match | +1 | Query contains a word from the article title |

### Example Scoring

Query: `"outlook email not sending smtp"`

**Email Not Sending - Outlook** (Score: 18)
- Tags: `email` (+3), `outlook` (+3), `send` (+3), `smtp` (+3), `not-working` (+3)
- Product: `outlook` (+2)
- Title: `email` (+1), `sending` (+1), `outlook` (+1)

## Query Normalization

Before matching, queries are normalized through these steps:

1. **Lowercase conversion**: `"Outlook Email"` → `"outlook email"`
2. **Punctuation removal**: `"can't send!"` → `"cant send"`
3. **Tokenization**: `"outlook email"` → `["outlook", "email"]`

This ensures consistent matching regardless of user input formatting.

## Low Confidence Detection

**Threshold**: Top score < 9

When the highest-scoring article has a score below 9, the system displays a "Low Confidence Match" warning. This prompts agents to:
- Review all 3 options carefully
- Consider the possibility that none might be perfect
- Use judgment in selecting the best match

### Confidence Levels

Based on typical scores:

- **High Confidence** (Score ≥ 9): Strong match, top result likely correct
- **Low Confidence** (Score < 9): Weaker match, agent should review all options
- **No Match** (Score = 0): No articles found, show "no results" message

## Return Format

The `retrieveArticles()` function returns:

```javascript
{
  matches: [
    {
      id: 1,
      title: "Article Title",
      summary: "Article summary",
      product: "Product Name",
      score: 15,
      article: { /* full article object */ }
    },
    // ... up to 3 matches
  ],
  lowConfidence: false,  // true if top score < 9
  topScore: 15,
  query: "original query"
}
```

## UI Integration

### Article Selection Display

When matches are found, the UI shows:

1. **Low Confidence Warning** (if applicable)
   - Info banner explaining results may not be exact
   - Encourages careful review

2. **Article Cards** (Top 3)
   - Title (clickable)
   - Product name
   - Summary
   - Score badge (color-coded)
   - "TOP MATCH" badge on first result

3. **Score Badges**
   - Green (Score ≥ 6): High confidence match
   - Yellow (Score 3-5): Medium confidence match
   - Red (Score 1-2): Low confidence match

### User Flow

```
1. User enters query
2. System retrieves top 3 matches
3. UI displays selection screen
4. Agent clicks preferred article
5. System loads article into step runner
```

## API Integration (Future)

To swap with a backend API:

1. **Keep the same interface**:
   ```javascript
   export async function retrieveArticles(query, topN = 3) {
     const response = await fetch(`/api/search?q=${query}&limit=${topN}`);
     const data = await response.json();
     return {
       matches: data.results,
       lowConfidence: data.topScore < 9,
       topScore: data.topScore,
       query: query
     };
   }
   ```

2. **No UI changes needed** - the return format remains the same
3. **Backward compatible** - existing `findBestMatch()` function still works

## Testing

### Test Queries

Use these queries to test different scenarios:

**High Confidence (Score ≥ 9)**
- `"outlook email not sending smtp"` → Score: 18
- `"printer offline not printing spooler"` → Score: 15

**Low Confidence (Score < 9)**
- `"wifi not working on windows pc"` → Score: 8
- `"my computer is slow"` → Score: 4

**No Match (Score = 0)**
- `"xyz abc def"` → No results

### Running Tests

```bash
node src/test-retrieval.js
```

## Configuration

### Adjusting Weights

To modify scoring weights, edit `src/retrieval.js`:

```javascript
function scoreArticle(article, queryTokens) {
  // Change these values:
  const TAG_WEIGHT = 3;
  const PRODUCT_WEIGHT = 2;
  const TITLE_WEIGHT = 1;
  
  // ... scoring logic
}
```

### Adjusting Threshold

To change the low confidence threshold:

```javascript
const lowConfidence = topScore < 9;  // Change 9 to desired threshold
```

**Recommendations**:
- Lower threshold (5-7): More warnings, safer for critical applications
- Higher threshold (10-12): Fewer warnings, better for high-quality KBs
- Current (9): Balanced approach

## Performance Considerations

### Current Implementation (Local KB)
- **Time Complexity**: O(n × m) where n = articles, m = query tokens
- **Space Complexity**: O(n) for scoring array
- **Typical Response**: < 1ms for 8 articles

### Scaling to API
- Use pagination for large result sets
- Implement caching for common queries
- Consider debouncing user input
- Add loading states in UI

## Future Enhancements

Potential improvements:

1. **Fuzzy Matching**: Handle typos and misspellings
2. **Synonym Support**: Map related terms (e.g., "PC" = "computer")
3. **Context Awareness**: Consider user history or role
4. **Machine Learning**: Train on successful/unsuccessful matches
5. **Multi-language**: Support queries in different languages
6. **Relevance Feedback**: Learn from agent selections

## Troubleshooting

### Issue: All results show low confidence

**Cause**: Threshold too high or KB tags don't match query terms

**Solution**: 
- Lower the threshold
- Add more tags to articles
- Implement synonym matching

### Issue: Wrong articles ranked highest

**Cause**: Scoring weights don't match importance

**Solution**:
- Adjust tag/product/title weights
- Add more specific tags to articles
- Consider adding negative scoring for mismatches

### Issue: No results found

**Cause**: Query terms don't match any article metadata

**Solution**:
- Add more comprehensive tags to articles
- Implement fuzzy matching
- Show "similar" articles even with score 0
