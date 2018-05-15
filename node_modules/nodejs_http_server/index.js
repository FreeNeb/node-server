
var server = require("./server");
var router = require("./router");
var requestHandlers =require("./requestHandlers");

var handle = {}
handle["/"] = requestHandlers.hello;
handle["/get"] = requestHandlers.get;

module.exports = {
    server: server,
    router: router,
    handle: handle
};

// server.start(router.route, handle);
