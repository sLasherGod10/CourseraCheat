# Known limitations

1. Coursera's UI is dynamic and can change. DOM selectors are intentionally conservative.
2. Only standard HTML5 video elements can be controlled reliably; embedded/proprietary players may not expose the required API.
3. Auto-next requires an identifiable, enabled next-lesson control and will not guess by clicking arbitrary elements.
4. Progress is not inferred from video watch time. It uses verifiable page statuses and optional manual checklist confirmations.
5. Background playback remains subject to browser, OS, player, and Coursera behavior. The extension does not spoof visibility state.
6. Gemini functionality requires a configured endpoint. Public deployments should use a server-side proxy.
7. The popup's compact size limits how much course content can be displayed at once.
