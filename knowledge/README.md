# Knowledge Base Folder

Add DOCX, PDF, Markdown, TXT or JSON files here.
Update `index.json` to include them.
They will automatically become searchable in Stepper.

## How to add knowledge files

1. Upload your file(s) to this folder via the GitHub UI (click **Add file → Upload files**)
2. Edit `index.json` and add the filename to the `"files"` array
3. Commit the changes

The next time the Stepper extension settings page is opened, or the **Reload Knowledge** button is clicked, the files will be ingested automatically.

## Supported file types

| Extension | Description |
|-----------|-------------|
| `.docx`   | Microsoft Word documents |
| `.pdf`    | PDF files (text-based; scanned PDFs are not supported) |
| `.md`     | Markdown documents |
| `.txt`    | Plain text files |
| `.json`   | Structured article import (see format below) |

## JSON article format

```json
{
  "title": "Article title",
  "summary": "Short description",
  "tags": ["tag1", "tag2"],
  "steps": [
    {
      "title": "Step 1 title",
      "bodyHtml": "<p>Step content</p>"
    }
  ]
}
```

## Notes

- Files listed in `index.json` but not present in this folder will be skipped with a warning.
- DOCX and PDF parsing is performed in the Stepper settings page context where the required libraries are available.  Plain-text formats (`.md`, `.txt`, `.json`) are also loaded when the side panel opens.
- Re-opening the settings page or clicking **Reload Knowledge** will re-ingest all listed files (updating existing articles).
