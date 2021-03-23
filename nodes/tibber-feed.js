const TibberFeed = require('tibber-api').TibberFeed;

module.exports = function (RED) {
    function TibberFeedNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        var _config = config;
        node.status({ fill: "red", shape: "ring", text: "disconnected" });

        _config.apiEndpoint = RED.nodes.getNode(_config.apiEndpointRef);

        var credentials = RED.nodes.getCredentials(_config.apiEndpointRef);
        if (!_config.apiEndpoint.feedUrl || !credentials || !credentials.accessToken || !_config.homeId) {
            node.error('Missing mandatory parameters. Execution will halt. Please reconfigure and publish again.');
            return;
        }

        if (!_config.active) {
            return;
        }

        // Assign access token to api key to meintain compatibility. This will not cause the access token to be exported.
        _config.apiEndpoint.apiKey = credentials.accessToken;

        if (!TibberFeedNode.instances[_config.apiEndpoint.apiKey]) {
            TibberFeedNode.instances[_config.apiEndpoint.apiKey] = new TibberFeed(config);
        }
        node._feed = TibberFeedNode.instances[_config.apiEndpoint.apiKey];

        node.listeners = {};
        node.listeners.onDataReceived = function onDataReceived(data) {
            var msg = {
                payload: data
            };
            if (_config.active && node._feed.connected) {
                node.status({ fill: "green", shape: "dot", text: "connected" });
                node.send(msg);
                node._feed.heartbeat();
            } else {
                node.status({ fill: "red", shape: "ring", text: "disconnected" });
            }
        };
        node.listeners.onConnected = function onConnected(data) {
            node.status({ fill: "green", shape: "dot", text: "connected" });
            node.log(data);
        };
        node.listeners.onDisconnected = function onDisconnected(data) {
            node.status({ fill: "red", shape: "ring", text: "disconnected" });
            node.log(data);
            node._feed.heartbeat();
        };
        node.listeners.onError = function onError(data) {
            node.error(data);
        };
        node.listeners.onWarn = function onWarn(data) {
            node.warn(data);
        };
        node.listeners.onLog = function onLog(data) {
            node.log(data);
        };

        if (_config.active) {
            node._feed.on('data', node.listeners.onDataReceived);
            node._feed.on('connected', node.listeners.onConnected);
            node._feed.on('connection_ack', node.listeners.onConnected);
            node._feed.on('disconnected', node.listeners.onDisconnected);
            node._feed.on('error', node.listeners.onError);
            node._feed.on('warn', node.listeners.onWarn);
            node._feed.on('log', node.listeners.onLog);
        }
        node.on('close', function () {
            node.status({ fill: "red", shape: "ring", text: "disconnected" });
            if (!node._feed)
                return;
            node._feed.off('data', node.listeners.onDataReceived);
            node._feed.off('connected', node.listeners.onConnected);
            node._feed.off('connection_ack', node.listeners.onConnected);
            node._feed.off('disconnected', node.listeners.onDisconnected);
            node._feed.off('error', node.listeners.onError);
            node._feed.off('warn', node.listeners.onWarn);
            node._feed.off('log', node.listeners.onLog);
            node._feed = null;
            node.listeners = null;
        });

        if (!node._feed.connected) {
            node._feed.connect();
        }

    }
    TibberFeedNode.instances = {};
    TibberFeedNode.functions = {};

    RED.nodes.registerType("tibber-feed", TibberFeedNode);
};