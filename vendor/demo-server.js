// Pequeño helper para simular un servidor con sinon.fakeServer,
// inspirado en https://htmx.org/js/demo.js (usado en los ejemplos de htmx.org).
(function () {
  var server = sinon.fakeServer.create();
  server.autoRespond = true;
  server.autoRespondAfter = 300; // simula la latencia de red

  // Deja pasar peticiones a recursos externos (CDNs, etc.)
  server.xhr.useFilters = true;
  server.xhr.addFilter(function (method, url) {
    return url.indexOf("http") === 0;
  });

  function parseParams(request) {
    var raw =
      request.method === "GET"
        ? request.url.split("?")[1] || ""
        : request.requestBody || "";
    return Object.fromEntries(new URLSearchParams(raw));
  }

  function respond(method, path, status, handler) {
    server.respondWith(method, path, function (request) {
      var headers = {};
      var body = (handler && handler(request, parseParams(request), headers)) || "";
      request.respond(status, headers, body);
    });
  }

  window.demoServer = {
    server: server,
    onGet: function (path, handler) {
      respond("GET", path, 200, handler);
    },
    onPost: function (path, handler) {
      respond("POST", path, 200, handler);
    },
    onPut: function (path, handler) {
      respond("PUT", path, 200, handler);
    },
    onDelete: function (path, handler) {
      respond("DELETE", path, 200, handler);
    },
    fail: function (method, path, status, handler) {
      respond(method, path, status, handler);
    },
  };
})();
