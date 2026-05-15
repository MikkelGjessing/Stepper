# Bundled JSON Knowledge Base

Place your exported JSON article files in this folder.

## Default file

The default expected file is `articles.json` in this folder.

## Usage

1. Export your knowledge base articles as a JSON file.
2. Rename the file to `articles.json` (or keep any name and update the import URL).
3. Place the file in this `knowledge-json/` folder.
4. In the Stepper extension, open **Options → Bundled JSON Knowledge** and click **Import bundled JSON knowledge**.
5. Articles become available in Stepper search after the import completes.

## Supported JSON formats

The importer accepts three shapes:

### 1. Array root

```json
[
  {
    "id": "KB00123",
    "title": "How to reset a password",
    "body": "<p>Step 1 ...</p>",
    "summary": "Guide for password reset",
    "tags": ["password", "account"]
  }
]
```

### 2. Object root with `articles` key

```json
{
  "articles": [
    {
      "id": "KB00123",
      "title": "How to reset a password",
      "body": "<p>Step 1 ...</p>"
    }
  ]
}
```

### 3. ServiceNow-like result shape

```json
{
  "result": [
    {
      "sys_id": "abc123",
      "number": "KB00123",
      "short_description": "How to reset a password",
      "text": "<p>Step 1 ...</p>",
      "workflow_state": "published"
    }
  ]
}
```

## Supported fields

| Purpose  | Accepted field names (in priority order) |
|----------|------------------------------------------|
| ID       | `id`, `articleId`, `sys_id`, `number`, `kb_number` |
| Title    | `title`, `articleTitle`, `short_description`, `name`, `heading` |
| Body     | `body`, `bodyHtml`, `text`, `html`, `content`, `description`, `article`, `procedure` |
| Summary  | `summary`, `description`, `short_description` |
| Tags     | `tags`, `keywords`, `sys_tags` |

## Notes

- Images embedded as data URIs in the HTML body are preserved.
- Remote image URLs inside article body HTML are preserved as-is.
- Standalone image files are **not** required.
- Repeated imports upsert existing articles by ID — no duplicates are created.
- If `articles.json` is missing or invalid, the extension continues to work normally.
