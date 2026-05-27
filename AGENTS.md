# AGENTS.md

This file is the project guide for AI coding agents working on this repository.

## Project Nature

This is a small static frontend tool built with plain HTML, CSS, and JavaScript.

- Do not introduce React, Vue, Next.js, bundlers, package managers, or a build step unless the user explicitly asks for that change.
- Prefer small, focused edits over broad rewrites.
- Keep the app usable by opening the static files through a local static server.

## Project Structure

- `index.html`: page structure and static controls.
- `styles.css`: main layout and component styles.
- `themes.css`: theme and font related styles.
- `app.js`: application state, rendering, editing, import/export, and interaction logic.
- `assets/`: optional fonts and image assets.

## Local Run

Use any local static file server. Example:

```bash
python3 -m http.server <PORT>
```

Then open the corresponding local address in a browser. The port is not fixed; use another port if one is occupied.

Do not write personal proxy settings, VPN details, private IPs, API keys, tokens, or account information into this repository.

## Engineering Principles

- YAGNI: Build only what the current requirement needs. Do not add abstraction layers, plugin systems, or architecture for imagined future needs.
- KISS: Use the simplest readable implementation. Prefer ordinary functions over classes when functions are enough. Prefer clear conditionals over design patterns when conditionals are enough.
- Precise naming: Names should describe exactly what a value contains or what a function does. Avoid vague names such as `data`, `temp`, `helper`, `manager`, or `thing`.
- Fail fast: Do not silently swallow errors. Avoid empty `catch` blocks. Validate external input at boundaries and show or throw specific errors with enough context to identify the bad value or failing operation.

## Project Rules

- Page types are maintained through the `PAGE_TYPES` registry in `app.js`.
- When adding or changing a page type, update the registry first instead of scattering new `if page.type` or `switch page.type` logic across the file.
- Preserve core user workflows: preview rendering, page editing, local saving, platform switching, image export, and share/download behavior.
- Do not perform unrelated refactors while implementing a requested change.
- Keep optional asset fallbacks working. Missing optional files under `assets/` should not break the app when fallback assets exist.

## Verification

After editing `app.js`, run:

```bash
node --check app.js
```

For UI, preview, page creation, import/export, or download changes, also open the app in a browser through a local static server and verify the affected workflow manually or with browser automation.
