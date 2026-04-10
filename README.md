# AI Sessions Agenda

Static GitHub Pages site that extracts AI-related accepted sessions from `Accepted Sessions with Submitter Info.xlsx` and displays them in an agenda layout.

## What it shows

- Session ID
- Session Title
- Session Type
- Main submitter
- Citation
- Location
- Time

## AI filtering

The generator includes a session when:

- the title contains AI-related terms such as `AI`, `LLM`, `machine learning`, `generative AI`, or `automation`
- or either `Primary Content Area` or `Secondary Content Area` is `Technology/Artificial Intelligence`

## Regenerate data

Run:

```powershell
py -3 scripts/generate_ai_sessions.py
```

Then open `index.html` locally or publish the repository to GitHub Pages.
