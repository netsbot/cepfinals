// ../../.cache/pnpm/dlx/94c27c819572b8cb9067fcc4ee5c636f8329e53cb2428c4efa3a3087deb247de/19fefa0587e-cddc5/node_modules/.pnpm/wrangler@4.120.1/node_modules/wrangler/templates/no-op-worker.js
var no_op_worker_default = {
  fetch() {
    return new Response("Not found", {
      status: 404,
      headers: {
        "Content-Type": "text/html"
      }
    });
  }
};
export {
  no_op_worker_default as default
};
//# sourceMappingURL=no-op-worker.js.map
