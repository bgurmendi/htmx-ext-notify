# htmx-notify

A lightweight notification extension for htmx.

`htmx-notify` provides toast-style notifications that can be triggered from:

* HTML attributes (`hx-notify`, `hx-notify-fail`)
* JavaScript (`htmx.notify(...)`)
* Server-side events (`HX-Trigger`)

Notifications appear in the bottom-right corner of the screen, stack automatically, support actions, auto-dismiss, and can be collapsed into a compact notification icon.

No framework required.

---

# Installation

```html
<script src="https://unpkg.com/htmx.org"></script>
<script src="htmx-notify.js"></script>
```

Enable the extension:

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

# Collapsible Notification Center

Notifications can be collapsed into a compact icon.

When expanded:

```txt
┌─────────────────────┐
│ Notification        │
└─────────────────────┘

┌─────────────────────┐
│ Notification        │
└─────────────────────┘
```

When collapsed:

```txt
🔔 2
```

The notification count remains visible.

Notifications continue accumulating while collapsed.

---

# Stacking Behavior

Notifications appear in the bottom-right corner.

New notifications appear at the bottom.

Existing notifications move upward automatically.

When a notification is dismissed:

* it animates out
* remaining notifications slide down smoothly

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
* Supports notification center collapse
