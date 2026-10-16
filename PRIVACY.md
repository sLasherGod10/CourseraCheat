# Privacy & Security Notes

## Data handling

- Extension preferences are stored in Chrome local extension storage.
- Course titles, URLs, and discovered item labels are held in memory for the current session unless a manual checklist is stored locally.
- No Coursera password or session token is requested or persisted by CoursePilot Pro.
- AI requests are user initiated. If a provider endpoint is configured, the entered prompt is sent to that endpoint.

## API keys

No real API key is included in this repository or release ZIP. For production/public use, prefer a backend proxy that keeps the Gemini credential server-side.

## Permissions

- `storage`: persist user settings and manual checklist entries.
- `activeTab`: communicate with the active course tab.
- `scripting`: reserved for supported page interaction and future narrowly scoped enhancements.
- Coursera host permissions: allow the content script to operate on Coursera pages.

## Security principles

The extension does not alter document visibility, bypass access controls, or automatically submit graded work. Error messages avoid exposing secrets. Provider errors are surfaced without logging API keys.
