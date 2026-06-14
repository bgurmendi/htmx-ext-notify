(function () {
  const EXTENSION_NAME = "notify";

  const DEFAULTS = {
    timeout: 5000,
    position: "bottom-right",
    max: 6,
  };

  let layer;
  let stack;
  let toggle;
  let bubble;
  let bubbleCount;
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
      <input class="hx-notify-toggle" id="hx-notify-toggle" type="checkbox">

      <div class="hx-notify-stack" data-hx-notify-position="${DEFAULTS.position}"></div>

      <label class="hx-notify-collapse" for="hx-notify-toggle" aria-label="Ocultar notificaciones">
        ×
      </label>

      <label class="hx-notify-bubble" for="hx-notify-toggle" aria-label="Mostrar notificaciones">
        <span class="hx-notify-bubble-icon">🔔</span>
        <span class="hx-notify-bubble-count">0</span>
      </label>
    `;

    document.body.appendChild(layer);

    toggle = layer.querySelector(".hx-notify-toggle");
    stack = layer.querySelector(".hx-notify-stack");
    bubble = layer.querySelector(".hx-notify-bubble");
    bubbleCount = layer.querySelector(".hx-notify-bubble-count");

    layer.addEventListener("click", function (event) {
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
      updateCount();
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
          updateCount();
        });
      },
      { once: true },
    );
  }

  function limit() {
    const items = [...stack.querySelectorAll(".hx-notify")];
    const excess = items.length - DEFAULTS.max;

    if (excess <= 0) return;

    items.slice(0, excess).forEach(function (item) {
      item.remove();
    });
  }

  function updateCount() {
    const count = stack.querySelectorAll(".hx-notify").length;
    bubbleCount.textContent = String(count);
    bubble.dataset.count = String(count);
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
    const elt = event.detail.elt;
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

      .hx-notify-toggle {
        position: absolute;
        opacity: 0;
        pointer-events: none;
      }

      .hx-notify-stack {
        position: fixed;
        right: 1rem;
        bottom: 1rem;
        width: min(26rem, calc(100vw - 2rem));
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        pointer-events: none;
        transition: transform 180ms ease, opacity 180ms ease;
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

      .hx-notify-collapse {
        position: fixed;
        right: 1rem;
        bottom: calc(1rem + 0.25rem);
        transform: translateY(calc(-100% - 0.5rem));
        pointer-events: auto;
        cursor: pointer;
        width: 2rem;
        height: 2rem;
        display: grid;
        place-items: center;
        border-radius: 999px;
        background: Canvas;
        color: CanvasText;
        border: 1px solid color-mix(in srgb, CanvasText 18%, transparent);
        box-shadow: 0 0.5rem 1.5rem rgb(0 0 0 / 18%);
      }

      .hx-notify-bubble {
        position: fixed;
        right: 1rem;
        bottom: 1rem;
        pointer-events: auto;
        cursor: pointer;
        min-width: 3rem;
        height: 3rem;
        padding: 0 0.75rem;
        display: none;
        align-items: center;
        justify-content: center;
        gap: 0.35rem;
        border-radius: 999px;
        background: Canvas;
        color: CanvasText;
        border: 1px solid color-mix(in srgb, CanvasText 18%, transparent);
        box-shadow: 0 0.5rem 1.5rem rgb(0 0 0 / 18%);
      }

      .hx-notify-bubble-count {
        font-size: 0.85rem;
        font-weight: 700;
      }

      .hx-notify-toggle:checked ~ .hx-notify-stack,
      .hx-notify-toggle:checked ~ .hx-notify-collapse {
        opacity: 0;
        transform: translateX(120%);
        pointer-events: none;
      }

      .hx-notify-toggle:checked ~ .hx-notify-bubble {
        display: inline-flex;
      }

      .hx-notify-toggle:not(:checked) ~ .hx-notify-bubble {
        display: none;
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
        .hx-notify-stack {
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
