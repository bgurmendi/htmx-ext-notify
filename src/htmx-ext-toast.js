(function () {
  const EXTENSION_NAME = "toast";

  const DEFAULTS = {
    timeout: 5000,
    position: "top-center",
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
    layer.className = "hx-toast-layer";
    layer.setAttribute("aria-live", "polite");

    layer.innerHTML = `
      <div class="hx-toast-wrapper" data-hx-toast-position="${DEFAULTS.position}">
        <button type="button" class="hx-toast-dismiss-all" aria-label="Dismiss all notifications">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 6h18"/>
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <line x1="10" y1="11" x2="10" y2="17"/>
            <line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
          <span class="hx-toast-dismiss-all-tooltip">Dismiss all</span>
        </button>

        <div class="hx-toast-stack"></div>
      </div>
    `;

    document.body.appendChild(layer);

    stack = layer.querySelector(".hx-toast-stack");

    layer.addEventListener("click", function (event) {
      if (event.target.closest(".hx-toast-dismiss-all")) {
        dismissAll();
        return;
      }

      const button = event.target.closest("[data-hx-toast-dismiss]");
      if (!button) return;

      const notification = button.closest(".hx-toast");
      if (notification) dismiss(notification);
    });
  }

  function openLayer() {
    if (!layer.open) {
      layer.show();
      return;
    }

    layer.close();
    layer.show();
  }

  function toast(input) {
    install();
    openLayer();

    const options = normalize(input);
    const item = render(options);

    animateStackChange(function () {
      stack.insertBefore(item, stack.firstChild);
      limit();
    });

    requestAnimationFrame(function () {
      item.classList.add("hx-toast-visible");
    });

    if (options.timeout > 0) {
      item._hxToastTimer = setTimeout(function () {
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
    item.className = "hx-toast";
    item.dataset.hxToastType = options.type;
    item.setAttribute("role", options.type === "error" ? "alert" : "status");

    const body = document.createElement("div");
    body.className = "hx-toast-body";

    if (options.title) {
      const title = document.createElement("strong");
      title.className = "hx-toast-title";
      title.textContent = options.title;
      body.appendChild(title);
    }

    if (options.html) {
      const content = document.createElement("div");
      content.className = "hx-toast-message";
      content.innerHTML = options.html;
      body.appendChild(content);
    } else {
      const message = document.createElement("p");
      message.className = "hx-toast-message";
      message.textContent = options.message;
      body.appendChild(message);
    }

    item.appendChild(body);

    const close = document.createElement("button");
    close.type = "button";
    close.className = "hx-toast-close";
    close.setAttribute("aria-label", "Dismiss");
    close.setAttribute("data-hx-toast-dismiss", "");
    close.textContent = "×";
    item.appendChild(close);

    if (options.actionText && (options.actionHref || options.actionHxGet)) {
      const actions = document.createElement("div");
      actions.className = "hx-toast-actions";

      const action = document.createElement(
        options.actionHref ? "a" : "button",
      );
      action.className = "hx-toast-action";
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
    if (!item || item.classList.contains("hx-toast-leaving")) return;

    clearTimeout(item._hxToastTimer);

    item.classList.add("hx-toast-leaving");

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
    stack.querySelectorAll(".hx-toast").forEach(dismiss);
  }

  function limit() {
    const items = [...stack.querySelectorAll(".hx-toast")];
    const excess = items.length - DEFAULTS.max;

    if (excess <= 0) return;

    items.slice(-excess).forEach(function (item) {
      item.remove();
    });
  }

  function animateStackChange(mutator) {
    const before = new Map();

    stack.querySelectorAll(".hx-toast").forEach(function (el) {
      before.set(el, el.getBoundingClientRect());
    });

    mutator();

    stack.querySelectorAll(".hx-toast").forEach(function (el) {
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

    const headerToast = xhr.getResponseHeader("HX-Toast");

    if (headerToast) {
      toast({
        message: headerToast,
        type:
          xhr.getResponseHeader("HX-Toast-Type") || (ok ? "success" : "error"),
        title: xhr.getResponseHeader("HX-Toast-Title") || "",
        timeout:
          Number(xhr.getResponseHeader("HX-Toast-Timeout")) ||
          DEFAULTS.timeout,
      });
      return;
    }

    const message = ok ? attr(elt, "hx-toast") : attr(elt, "hx-toast-fail");
    if (!message) return;

    toast({
      message,
      type: ok
        ? attr(elt, "hx-toast-type") || "success"
        : attr(elt, "hx-toast-fail-type") || "error",
      title: ok
        ? attr(elt, "hx-toast-title") || ""
        : attr(elt, "hx-toast-fail-title") || "",
      timeout: Number(attr(elt, "hx-toast-timeout")) || DEFAULTS.timeout,
    });
  }

  function injectStyles() {
    if (document.querySelector("#hx-toast-styles")) return;

    const style = document.createElement("style");
    style.id = "hx-toast-styles";

    style.textContent = `
      .hx-toast-layer {
        position: fixed;
        inset: 0;
        z-index: 2000;
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

      .hx-toast-layer::backdrop {
        display: none;
      }

      .hx-toast-wrapper {
        position: fixed;
        top: 1rem;
        left: 50%;
        transform: translateX(-50%);
        width: min(26rem, calc(100vw - 2rem));
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        pointer-events: none;
      }

      .hx-toast-stack {
        display: flex;
        flex-direction: column;
        width: 100%;
        gap: 0.75rem;
        pointer-events: none;
      }

      .hx-toast {
        position: relative;
        pointer-events: auto;
        padding: 0.875rem 2.5rem 0.875rem 1rem;
        border: 1px solid color-mix(in srgb, CanvasText 18%, transparent);
        border-radius: 0.85rem;
        background: Canvas;
        color: CanvasText;
        box-shadow: 0 0.75rem 2rem rgb(0 0 0 / 18%);
        opacity: 0;
        transform: translateY(-0.75rem) scale(0.98);
      }

      .hx-toast-visible {
        animation: hx-toast-enter 170ms ease-out forwards;
      }

      .hx-toast-leaving {
        pointer-events: none;
        animation: hx-toast-leave 140ms ease-in forwards;
      }

      .hx-toast-title {
        display: block;
        margin-bottom: 0.25rem;
      }

      .hx-toast-message {
        margin: 0;
      }

      .hx-toast-close {
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

      .hx-toast-close:hover {
        background: color-mix(in srgb, CanvasText 10%, transparent);
      }

      .hx-toast-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        margin-top: 0.75rem;
      }

      .hx-toast-action {
        cursor: pointer;
      }

      .hx-toast-dismiss-all {
        align-self: flex-end;
        position: relative;
        margin-right: 0.55rem;
        pointer-events: auto;
        cursor: pointer;
        width: 1.75rem;
        height: 1.75rem;
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

      .hx-toast-dismiss-all:has(~ .hx-toast-stack .hx-toast:nth-child(2)) {
        display: inline-flex;
      }

      .hx-toast-dismiss-all:hover {
        background: color-mix(in srgb, CanvasText 10%, transparent);
      }

      .hx-toast-dismiss-all-tooltip {
        position: absolute;
        top: 50%;
        right: calc(100% + 0.5rem);
        transform: translateY(-50%);
        white-space: nowrap;
        font-size: 0.75rem;
        font-weight: normal;
        padding: 0.25rem 0.5rem;
        border-radius: 0.4rem;
        background: CanvasText;
        color: Canvas;
        opacity: 0;
        pointer-events: none;
        transition: opacity 120ms ease;
      }

      .hx-toast-dismiss-all:hover .hx-toast-dismiss-all-tooltip,
      .hx-toast-dismiss-all:focus-visible .hx-toast-dismiss-all-tooltip {
        opacity: 1;
      }

      .hx-toast[data-hx-toast-type="success"] {
        border-left: 0.35rem solid #22c55e;
      }

      .hx-toast[data-hx-toast-type="error"] {
        border-left: 0.35rem solid #ef4444;
      }

      .hx-toast[data-hx-toast-type="warning"] {
        border-left: 0.35rem solid #f59e0b;
      }

      .hx-toast[data-hx-toast-type="info"] {
        border-left: 0.35rem solid #3b82f6;
      }

      @keyframes hx-toast-enter {
        from {
          opacity: 0;
          transform: translateY(-0.75rem) scale(0.98);
        }

        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes hx-toast-leave {
        from {
          opacity: 1;
          transform: translateY(0) scale(1);
        }

        to {
          opacity: 0;
          transform: translateY(-0.5rem) scale(0.98);
        }
      }

      @media (max-width: 640px) {
        .hx-toast-wrapper {
          left: 1rem;
          right: 1rem;
          transform: none;
          width: auto;
        }
      }
    `;

    document.head.appendChild(style);
  }

  window.htmxToast = toast;

  document.addEventListener("hx-toast", function (event) {
    toast(event.detail || {});
  });

  if (window.htmx) {
    window.htmx.toast = toast;

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
