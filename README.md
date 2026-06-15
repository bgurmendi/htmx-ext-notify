# htmx-ext-notify

[Repository](https://github.com/bgurmendi/htmx-ext-notify) · [Online demo](https://bgurmendi.github.io/htmx-ext-notify/demo.html)

[![Tests](https://github.com/bgurmendi/htmx-ext-notify/actions/workflows/test.yml/badge.svg)](https://github.com/bgurmendi/htmx-ext-notify/actions/workflows/test.yml)
[![Coverage](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/bgurmendi/htmx-ext-notify/develop/badges/coverage.json)](#code-coverage)
[![npm version](https://img.shields.io/npm/v/htmx-ext-notify.svg)](https://www.npmjs.com/package/htmx-ext-notify)

A lightweight notification extension for htmx.

`htmx-notify` provides toast-style notifications that can be triggered from:

* HTML attributes (`hx-notify`, `hx-notify-fail`)
* JavaScript (`htmx.notify(...)`)
* Server-side events (`HX-Trigger`)

Notifications appear at the top-center of the screen, stack automatically, support actions, auto-dismiss, and can be dismissed individually or all at once.

No framework required.

---

# Installation

The extension is a single, dependency-free JavaScript file (besides htmx itself).

### Via `<script>` tag

```html
<script src="https://unpkg.com/htmx.org"></script>
<script src="https://unpkg.com/htmx-ext-notify/src/htmx-ext-notify.js"></script>
```

### Via npm

```bash
npm install htmx-ext-notify
```

```html
<script src="https://unpkg.com/htmx.org"></script>
<script src="/node_modules/htmx-ext-notify/src/htmx-ext-notify.js"></script>
```

### Enable the extension

```html
<body hx-ext="notify">
```

---

# Quick Start

Show a notification when a request succeeds:

```html
<button
    hx-post="/save"
    hx-notify="Document saved">
    Save
</button>
```

Show a different notification when the request fails:

```html
<button
    hx-post="/save"
    hx-notify="Document saved"
    hx-notify-fail="Unable to save document">
    Save
</button>
```

The server only returns the updated HTML.

```html
<div id="document">
    ...
</div>
```

No notification markup is required.

---

# Success Notifications

```html
<form
    hx-post="/profile"
    hx-notify="Profile updated">
</form>
```

After a successful request:

```txt
Profile updated
```

is displayed automatically.

---

# Failure Notifications

```html
<form
    hx-post="/profile"
    hx-notify-fail="Failed to update profile">
</form>
```

When the request fails:

```txt
Failed to update profile
```

is displayed automatically.

---

# Notification Types

Success:

```html
<button
    hx-post="/save"
    hx-notify="Saved"
    hx-notify-type="success">
</button>
```

Failure:

```html
<button
    hx-post="/save"
    hx-notify-fail="Save failed"
    hx-notify-fail-type="error">
</button>
```

Supported types:

```txt
success
error
warning
info
```

---

# Notification Titles

```html
<button
    hx-post="/save"
    hx-notify="Document saved"
    hx-notify-title="Saved">
</button>
```

Displays:

```txt
Saved
Document saved
```

---

# Custom Timeout

Default timeout:

```txt
5000 ms
```

Custom timeout:

```html
<button
    hx-post="/save"
    hx-notify="Saved"
    hx-notify-timeout="10000">
</button>
```

Disable auto-dismiss:

```js
htmx.notify({
    message: "Persistent notification",
    timeout: 0
});
```

---

# JavaScript API

Simple form:

```js
htmx.notify("Document saved");
```

Full form:

```js
htmx.notify({
    type: "success",
    title: "Saved",
    message: "Document saved successfully",
    timeout: 5000
});
```

---

# Notification Actions

Actions can trigger navigation, htmx requests, or custom behavior.

```js
htmx.notify({
    title: "Import complete",
    message: "Review imported records",
    actionText: "View",
    actionHref: "/imports/123"
});
```

Or:

```js
htmx.notify({
    title: "Import complete",
    message: "Review imported records",
    actionText: "Open",
    actionHxGet: "/imports/123",
    actionHxTarget: "#main"
});
```

---

# Server-Side Notifications

The recommended server integration uses htmx events.

Response:

```http
HX-Trigger: {
  "hx-notify": {
    "message": "Document saved",
    "type": "success"
  }
}
```

The extension automatically listens for:

```txt
hx-notify
```

and creates the notification.

Full example:

```http
HX-Trigger: {
  "hx-notify": {
    "title": "Saved",
    "message": "Document saved successfully",
    "type": "success"
  }
}
```

---

# Alternative Header-Based Notifications

You may also use direct response headers.

```http
HX-Notify: Document saved
HX-Notify-Type: success
HX-Notify-Title: Saved
HX-Notify-Timeout: 5000
```

Supported headers:

```txt
HX-Notify
HX-Notify-Type
HX-Notify-Title
HX-Notify-Timeout
```

---

# Triggering Notifications from Server Events

Any server event can be converted into a notification.

Response:

```http
HX-Trigger: {
  "user-created": {
    "id": 15
  }
}
```

Client:

```js
document.body.addEventListener("user-created", function () {
    htmx.notify("User created");
});
```

---

# Dismissing Notifications

Each notification has its own × button to dismiss it individually.

When at least one notification is visible, a "dismiss all" button (trash
icon) is pinned above the stack. Hovering over it shows a tooltip
("Dismiss all notifications") and clicking it dismisses every visible
notification at once.

```txt
                    (🗑) ← dismiss all

┌─────────────────────┐
│ Notification      × │
└─────────────────────┘

┌─────────────────────┐
│ Notification      × │
└─────────────────────┘
```

---

# Stacking Behavior

Notifications appear at the top-center of the screen.

New notifications appear at the top.

Existing notifications move downward automatically.

When a notification is dismissed:

* it animates out
* remaining notifications slide up smoothly

---

# Accessibility

Notifications use:

```txt
role="status"
```

for informational messages and:

```txt
role="alert"
```

for error messages.

The notification layer uses:

```txt
aria-live="polite"
```

to announce updates without interrupting the user.

---

# Design Goals

* Small
* No dependencies
* htmx-first
* Server-friendly
* Progressive enhancement
* Works with plain HTML
* Works with JavaScript
* Works with HX-Trigger events
* Supports multiple concurrent notifications
* Supports actions
* Supports persistent notifications
* Supports dismissing notifications individually or all at once

---

# Tests

End-to-end tests use [Playwright](https://playwright.dev) (via Node's built-in test runner) to drive the demo in a real browser and check that notifications behave as documented above: success/failure attributes, `HX-Trigger`/`HX-Notify` headers, the JS API, timeouts, actions, rich HTML, dismissing, and stacking.

1. Install dependencies (only needed once):
   ```bash
   npm install
   npx playwright install chromium
   ```
2. Run the tests:
   ```bash
   npm test
   ```

The tests spin up a local static server for the repository and open `demo.html` in headless Chromium — no manual server setup needed.

To watch the tests run in a visible browser window (useful while debugging), set `HEADED=1`. Each action is slowed down by 1 second by default; override with `SLOWMO` (milliseconds):

```bash
HEADED=1 npm test
HEADED=1 SLOWMO=300 npm test
```

Each run writes screenshots taken at key points plus the page's console output to `test/artifacts/<test-name>/`. These are git-ignored, regenerated on every run, and are the quickest way to check what a test actually saw on screen.

## Code coverage

Each run also collects V8 coverage of [`src/htmx-ext-notify.js`](src/htmx-ext-notify.js) and writes a report to `coverage/` (git-ignored):

- `coverage/index.html` — open in a browser for an annotated, line-by-line view.
- `coverage/lcov.info` — for tooling/CI integrations that consume LCOV.

A summary table is also printed at the end of `npm test`.

---

# License

[MIT](LICENSE).
