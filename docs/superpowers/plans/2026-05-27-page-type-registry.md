# Page Type Registry Refactor

## Scope

- Introduce a single `PAGE_TYPES` registry for labels, creation, migration, rendering, editor rendering, and conversion behavior.
- Replace page-type condition clusters in `templateDefault`, `elementsFromContent`, `defaultPage`, `migratePage`, `templateHTML`, `editorBody`, `convertPageToCanvas`, and import labels.
- Generate add-page buttons from the registry so a new page type has one primary declaration point.

## Out Of Scope

- Splitting the server or static app into modules.
- Rewriting the canvas interaction state.
- Mechanically changing all long parameter lists.
- Introducing a build step or framework.

## Verification

- [x] `node --check app.js`
- [x] No remaining `TYPE_LABEL` or page-type switch dispatches.
- [x] Local browser check confirms generated add-page buttons and page creation still work.
