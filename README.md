# CoursePilot Pro

CoursePilot Pro is an original Manifest V3 Chrome extension for Coursera learning productivity. It focuses on supported playback controls, transparent progress tracking, and an optional Gemini study assistant.

## What it does

- Modern compact dashboard with dark/light themes.
- Playback speeds from 1× to 4× where the page exposes a standard HTML5 video element.
- Optional automatic speed application to newly discovered videos.
- Optional auto-next when a clearly identifiable next-lesson control exists.
- Course item discovery from supported page information.
- Progress calculated only from verified page statuses or explicit manual checklist confirmations.
- AI Tutor modes for explanations, note summaries, conceptual hints, and practice walkthroughs.
- MV3 service worker with minimal permissions and message-based page communication.

## What it intentionally does not do

- It does not automatically answer, select, or submit active graded Coursera assessments.
- It does not fabricate completion records or claim a lesson is complete when status cannot be verified.
- It does not spoof document visibility or bypass browser/platform access controls.
- It does not ship a real Gemini API key.

## Installation

1. Unzip the release archive.
2. Open `chrome://extensions/` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the extracted `CoursePilot-Pro` directory.
6. Open a Coursera lesson and click the CoursePilot icon.
7. Reload the Coursera tab if Chrome reports that the content script is not connected.

## Gemini configuration

The extension uses a provider module rather than hard-coding a vendor-specific secret. For public distribution, deploy a small backend proxy that authenticates requests server-side and forwards them to Gemini. Configure that endpoint through your own settings mechanism; never commit an API key to the extension source or ZIP.

The provider expects a JSON POST body similar to:

```json
{"model":"gemini-2.5-flash","mode":"explain","prompt":"..."}
```

and accepts a response such as:

```json
{"text":"..."}
```

A proxy should enforce authentication, rate limits, logging policy, and prompt-size limits.

## Testing

Run:

```bash
npm test
npm run check
```

The automated suite covers status normalization, progress calculation, manual checklist merging, playback speed bounds, prompt safety wording, missing AI endpoint errors, and HTTP 429 handling.

## Manual verification still required

Because Coursera is a live third-party application with dynamic UI and account-specific pages, manually verify:

- A real Coursera lesson exposes a compatible HTML5 `<video>` element.
- Preferred playback speed is applied after SPA lesson navigation.
- Auto-next only activates when enabled and a next control is genuinely present.
- Course item/status selectors continue to match the current Coursera UI.
- Minimized/background playback behavior remains available under the browser/OS/player's normal rules.
- A deployed Gemini proxy returns the expected response shape.

## Privacy & security

CoursePilot stores settings locally using `chrome.storage.local`. It does not require Coursera credentials, does not ask for passwords, and does not inject authentication tokens. AI requests occur only when the user invokes the AI Tutor and configures a provider endpoint. Review and adapt the proxy's retention/logging policy before public deployment.

## Architecture

- `src/popup.html`, `popup.css`, `popup.js`: popup UI and interaction.
- `src/content.js`: Coursera page bridge and supported DOM interactions.
- `src/playback.js`: video discovery, speed application, auto-next.
- `src/progress.js`: status normalization and progress calculations.
- `src/gemini.js`: provider abstraction and study prompt construction.
- `src/storage.js`: local settings persistence.
- `src/background.js`: lightweight MV3 service worker.
- `tests/test.js`: Node-based automated tests.

## Reference

The project was designed after reviewing the general feature/workflow ideas in the public `sauravhathi/coursera-automation-extension` repository, while intentionally using an original UI and a safer learning-assistant scope. The reference advertises automation for lectures, reading materials, quizzes, discussions, and video skipping; CoursePilot Pro does not copy its implementation and does not automate active graded answers/submissions.

## License

MIT. See `LICENSE`.
