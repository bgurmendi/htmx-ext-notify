(function () {
  const EXTENSION_NAME = "notify";

  const DEFAULTS = {
    timeout: 5000,
    position: "bottom-right",
    max: 6,
  };

  let layer;
  let stack;
  let installed = false;

  function install() {
    if (installed) return;
    if (!document.body) return;
    installed = true;

    injectStyles();

    layer = document.createElement("dialog");
    layer.className = "hx-notify-layer";
    layer.setAttribute("aria-live", "polite");

    layer.innerHTML = `
      <div class="hx-notify-wrapper" data-hx-notify-position="${DEFAULTS.position}">
        <div class="hx-notify-stack"></div>

        <button type="button" class="hx-notify-dismiss-all" title="Descartar todas las notificaciones" aria-label="Descartar todas las notificaciones">
          ×
        </button>
      </div>
    `;

    document.body.appendChild(layer);

    stack = layer.querySelector(".hx-notify-stack");

    layer.addEventListener("click", function (event) {
      if (event.target.closest(".hx-notify-dismiss-all")) {
        dismissAll();
        return;
      }

      const button = event.target.closest("[data-hx-notify-dismiss]");
      if (!button) return;

      const notification = button.closest(".hx-notify");
      if (notification) dismiss(notification);
    });
  }

  function openLayer() {
    if (!layer.open) {
      layer.show();
      return;
    }

    // Sube la capa de notificaciones por encima de otros dialogs propios.
    layer.close();
    layer.show();
  }

  function notify(input) {
    install();
    openLayer();

    const options = normalize(input);
    const item = render(options);

    animateStackChange(function () {
      stack.appendChild(item);
      limit();
    });

    requestAnimationFrame(function () {
      item.classList.add("hx-notify-visible");
    });

    if (options.timeout > 0) {
      item._hxNotifyTimer = setTimeout(function () {
        dismiss(item);
      }, options.timeout);
    }

    return item;
  }

  function normalize(input) {
    if (typeof input === "string") {
      return {
        message: input,
        type: "info",
        timeout: DEFAULTS.timeout,
      };
    }

    return {
      type: input.type || "info",
      title: input.title || "",
      message: input.message || input.text || "",
      html: input.html || "",
      timeout: input.timeout ?? DEFAULTS.timeout,
      actionText: input.actionText || "",
      actionHref: input.actionHref || "",
      actionHxGet: input.actionHxGet || "",
      actionHxTarget: input.actionHxTarget || "",
    };
  }

  function render(options) {
    const item = document.createElement("article");
    item.className = "hx-notify";
    item.dataset.hxNotifyType = options.type;
    item.setAttribute("role", options.type === "error" ? "alert" : "status");

    const body = document.createElement("div");
    body.className = "hx-notify-body";

    if (options.title) {
      const title = document.createElement("strong");
      title.className = "hx-notify-title";
      title.textContent = options.title;
      body.appendChild(title);
    }

    if (options.html) {
      const content = document.createElement("div");
      content.className = "hx-notify-message";
      content.innerHTML = options.html;
      body.appendChild(content);
    } else {
      const message = document.createElement("p");
      message.className = "hx-notify-message";
      message.textContent = options.message;
      body.appendChild(message);
    }

    item.appendChild(body);

    const close = document.createElement("button");
    close.type = "button";
    close.className = "hx-notify-close";
    close.setAttribute("aria-label", "Descartar");
    close.setAttribute("data-hx-notify-dismiss", "");
    close.textContent = "×";
    item.appendChild(close);

    if (options.actionText && (options.actionHref || options.actionHxGet)) {
      const actions = document.createElement("div");
      actions.className = "hx-notify-actions";

      const action = document.createElement(
        options.actionHref ? "a" : "button",
      );
      action.className = "hx-notify-action";
      action.textContent = options.actionText;

      if (options.actionHref) {
        action.href = options.actionHref;
      } else {
        action.type = "button";
        action.setAttribute("hx-get", options.actionHxGet);
        if (options.actionHxTarget) {
          action.setAttribute("hx-target", options.actionHxTarget);
        }
        if (window.htmx) {
          window.htmx.process(action);
        }
      }

      actions.appendChild(action);
      item.appendChild(actions);
    }

    return item;
  }

  function dismiss(item) {
    if (!item || item.classList.contains("hx-notify-leaving")) return;

    clearTimeout(item._hxNotifyTimer);

    item.classList.add("hx-notify-leaving");

    item.addEventListener(
      "animationend",
      function () {
        animateStackChange(function () {
          item.remove();
        });
      },
      { once: true },
    );
  }

  function dismissAll() {
    stack.querySelectorAll(".hx-notify").forEach(dismiss);
  }

  function limit() {
    const items = [...stack.querySelectorAll(".hx-notify")];
    const excess = items.length - DEFAULTS.max;

    if (excess <= 0) return;

    items.slice(0, excess).forEach(function (item) {
      item.remove();
    });
  }

  function animateStackChange(mutator) {
    const before = new Map();

    stack.querySelectorAll(".hx-notify").forEach(function (el) {
      before.set(el, el.getBoundingClientRect());
    });

    mutator();

    stack.querySelectorAll(".hx-notify").forEach(function (el) {
      const first = before.get(el);
      if (!first) return;

      const last = el.getBoundingClientRect();
      const dx = first.left - last.left;
      const dy = first.top - last.top;

      if (!dx && !dy) return;

      el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px)` },
          { transform: "translate(0, 0)" },
        ],
        {
          duration: 180,
          easing: "ease-out",
        },
      );
    });
  }

  function attr(elt, name) {
    const found = elt.closest("[" + name + "]");
    return found ? found.getAttribute(name) : null;
  }

  function handleAfterRequest(event) {
    const elt = event.detail.requestConfig?.elt ?? event.detail.elt;
    const xhr = event.detail.xhr;
    const ok = event.detail.successful;

    const headerNotify = xhr.getResponseHeader("HX-Notify");

    if (headerNotify) {
      notify({
        message: headerNotify,
        type:
          xhr.getResponseHeader("HX-Notify-Type") || (ok ? "success" : "error"),
        title: xhr.getResponseHeader("HX-Notify-Title") || "",
        timeout:
          Number(xhr.getResponseHeader("HX-Notify-Timeout")) ||
          DEFAULTS.timeout,
      });
      return;
    }

    const message = ok ? attr(elt, "hx-notify") : attr(elt, "hx-notify-fail");
    if (!message) return;

    notify({
      message,
      type: ok
        ? attr(elt, "hx-notify-type") || "success"
        : attr(elt, "hx-notify-fail-type") || "error",
      title: ok
        ? attr(elt, "hx-notify-title") || ""
        : attr(elt, "hx-notify-fail-title") || "",
      timeout: Number(attr(elt, "hx-notify-timeout")) || DEFAULTS.timeout,
    });
  }

  function injectStyles() {
    if (document.querySelector("#hx-notify-styles")) return;

    const style = document.createElement("style");
    style.id = "hx-notify-styles";

    style.textContent = `
      .hx-notify-layer {
        position: fixed;
        inset: 0;
        width: auto;
        height: auto;
        max-width: none;
        max-height: none;
        margin: 0;
        padding: 0;
        border: 0;
        background: transparent;
        overflow: hidden;
        pointer-events: none;
      }

      .hx-notify-layer::backdrop {
        display: none;
      }

      .hx-notify-wrapper {
        position: fixed;
        right: 1rem;
        bottom: 1rem;
        width: min(26rem, calc(100vw - 2rem));
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        pointer-events: none;
      }

      .hx-notify-stack {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        pointer-events: none;
      }

      .hx-notify {
        position: relative;
        pointer-events: auto;
        padding: 0.875rem 2.5rem 0.875rem 1rem;
        border: 1px solid color-mix(in srgb, CanvasText 18%, transparent);
        border-radius: 0.85rem;
        background: Canvas;
        color: CanvasText;
        box-shadow: 0 0.75rem 2rem rgb(0 0 0 / 18%);
        opacity: 0;
        transform: translateY(0.75rem) scale(0.98);
      }

      .hx-notify-visible {
        animation: hx-notify-enter 170ms ease-out forwards;
      }

      .hx-notify-leaving {
        pointer-events: none;
        animation: hx-notify-leave 140ms ease-in forwards;
      }

      .hx-notify-title {
        display: block;
        margin-bottom: 0.25rem;
      }

      .hx-notify-message {
        margin: 0;
      }

      .hx-notify-close {
        position: absolute;
        top: 0.45rem;
        right: 0.55rem;
        width: 1.75rem;
        height: 1.75rem;
        border: 0;
        border-radius: 999px;
        background: transparent;
        color: inherit;
        cursor: pointer;
        font-size: 1.2rem;
        line-height: 1;
      }

      .hx-notify-close:hover {
        background: color-mix(in srgb, CanvasText 10%, transparent);
      }

      .hx-notify-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        margin-top: 0.75rem;
      }

      .hx-notify-action {
        cursor: pointer;
      }

      .hx-notify-dismiss-all {
        align-self: flex-end;
        pointer-events: auto;
        cursor: pointer;
        width: 2rem;
        height: 2rem;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 0;
        border: 1px solid color-mix(in srgb, CanvasText 18%, transparent);
        border-radius: 999px;
        background: Canvas;
        color: CanvasText;
        font-size: 1.2rem;
        line-height: 1;
        box-shadow: 0 0.5rem 1.5rem rgb(0 0 0 / 18%);
      }

      .hx-notify-stack:has(.hx-notify) ~ .hx-notify-dismiss-all {
        display: inline-flex;
      }

      .hx-notify-dismiss-all:hover {
        background: color-mix(in srgb, CanvasText 10%, transparent);
      }

      .hx-notify[data-hx-notify-type="success"] {
        border-left: 0.35rem solid #22c55e;
      }

      .hx-notify[data-hx-notify-type="error"] {
        border-left: 0.35rem solid #ef4444;
      }

      .hx-notify[data-hx-notify-type="warning"] {
        border-left: 0.35rem solid #f59e0b;
      }

      .hx-notify[data-hx-notify-type="info"] {
        border-left: 0.35rem solid #3b82f6;
      }

      @keyframes hx-notify-enter {
        from {
          opacity: 0;
          transform: translateY(0.75rem) scale(0.98);
        }

        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes hx-notify-leave {
        from {
          opacity: 1;
          transform: translateY(0) scale(1);
        }

        to {
          opacity: 0;
          transform: translateY(0.5rem) scale(0.98);
        }
      }

      @media (max-width: 640px) {
        .hx-notify-wrapper {
          left: 1rem;
          right: 1rem;
          width: auto;
        }
      }
    `;

    document.head.appendChild(style);
  }

  window.htmxNotify = notify;

  document.addEventListener("hx-notify", function (event) {
    notify(event.detail || {});
  });

  if (window.htmx) {
    window.htmx.notify = notify;

    window.htmx.defineExtension(EXTENSION_NAME, {
      init: install,

      onEvent: function (name, event) {
        if (name === "htmx:afterRequest") {
          handleAfterRequest(event);
        }
      },
    });
  }
})();
