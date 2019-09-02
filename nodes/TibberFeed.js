const WebSocket = require('ws');
const events = require('events');

class TibberFeed {

    constructor(config, timeout = 30000) {

        var node = this;
        node._timeout = timeout;
        node._config = config;
        node._active = config.active;
        node._isClosing = false;

        node.events = new events.EventEmitter();

        if (!config.apiToken || !config.homeId || !config.apiUrl) {
            node._active = false;
            config.active = false;
            node.warn('Missing mandatory parameters. Execution will halt.')
            return;
        }

        var _gql = 'subscription{liveMeasurement(homeId:"' + node._config.homeId + '"){';
        if (node._config.timestamp == 1)
            _gql += 'timestamp ';
        if (node._config.power == 1)
            _gql += 'power ';
        if (node._config.lastMeterConsumption == 1)
            _gql += 'lastMeterConsumption ';
        if (node._config.accumulatedConsumption == 1)
            _gql += 'accumulatedConsumption ';
        if (node._config.accumulatedProduction == 1)
            _gql += 'accumulatedProduction ';
        if (node._config.accumulatedCost == 1)
            _gql += 'accumulatedCost ';
        if (node._config.accumulatedReward == 1)
            _gql += 'accumulatedReward ';
        if (node._config.currency == 1)
            _gql += 'currency ';
        if (node._config.minPower == 1)
            _gql += 'minPower ';
        if (node._config.averagePower == 1)
            _gql += 'averagePower ';
        if (node._config.maxPower == 1)
            _gql += 'maxPower ';
        if (node._config.powerProduction == 1)
            _gql += 'powerProduction ';
        if (node._config.minPowerProduction == 1)
            _gql += 'minPowerProduction ';
        if (node._config.maxPowerProduction == 1)
            _gql += 'maxPowerProduction ';
        if (node._config.lastMeterProduction == 1)
            _gql += 'lastMeterProduction ';
        if (node._config.powerFactor == 1)
            _gql += 'powerFactor ';
        if (node._config.voltagePhase1 == 1)
            _gql += 'voltagePhase1 ';
        if (node._config.voltagePhase2 == 1)
            _gql += 'voltagePhase2 ';
        if (node._config.voltagePhase3 == 1)
            _gql += 'voltagePhase3 ';
        if (node._config.currentPhase1 == 1)
            _gql += 'currentPhase1 ';
        if (node._config.currentPhase2 == 1)
            _gql += 'currentPhase2 ';
        if (node._config.currentPhase3 == 1)
            _gql += 'currentPhase3 ';
        _gql += '}}';
        node._query = {
            id: "1",
            type: "start",
            payload: {
                variables: {},
                extensions: {},
                operationName: null,
                query: _gql
            }
        };
    }

    get active() {
        return this._active;
    }

    set active(active) {
        if (active == this._active)
            return;
        this._active = active;
        if (this._active)
            this.connect();
        else
            this.close();
    }

    connect() {
        var node = this;
        node._isClosing = false;
        node._webSocket = new WebSocket(node._config.apiUrl, ['graphql-ws']);

        node._webSocket.on('open', function () {
            node._webSocket.send('{"type":"connection_init","payload":"token=' + node._config.apiToken + '"}');
            node.events.emit('connected', "Connected to Tibber feed.");
        });

        node._webSocket.on('message', function (message) {
            if (message.startsWith('{')) {
                var msg = JSON.parse(message);
                if (msg.type == 'connection_ack') {
                    node.events.emit('connection_ack', msg);
                    var str = JSON.stringify(node._query);
                    node._webSocket.send(str);
                } else if (msg.type == "connection_error") {
                    node.error(msg);
                    node.close();
                    node.heartbeat();
                } else if (msg.type == "data") {
                    if (!msg.payload.data)
                        return;
                    var data = msg.payload.data.liveMeasurement;
                    node.events.emit('data', data);
                    node.heartbeat();
                }
            }
        });

        node._webSocket.on('close', function () {
            node._isClosing = true;
            node.events.emit('disconnected', "Disconnected from Tibber feed");
            node.heartbeat();
        });

        node._webSocket.on('error', function (error) {
            if (node._isClosing)
                return;
            node.error(error);
            node.close();
            node.heartbeat();
        });
    }

    close() {
        var node = this;
        node._isClosing = true;
        if (node._webSocket) {
            node._webSocket.close();
            node._webSocket.terminate();
            node._webSocket = null;
        }
        clearTimeout(node._pingTimeout);
        node.log('Closed Tibber Feed.');
    }

    heartbeat() {
        var node = this;
        clearTimeout(node._pingTimeout);
        // Use `WebSocket#terminate()`, which immediately destroys the connection,
        // instead of `WebSocket#close()`, which waits for the close timer.
        // Delay should be equal to the interval at which your server
        // sends out pings plus a conservative assumption of the latency.
        node._pingTimeout = setTimeout(() => {
            if (node._webSocket) {
                node._webSocket.terminate();
                node._webSocket = null;
            }
            node.warn('Connection timed out after ' + node._timeout + ' ms. Reconnecting...');
            node.connect();
        }, node._timeout);
    }

    log(message) {
        if (this.events)
            this.events.emit('log', message);
    }

    warn(message) {
        if (this.events)
            this.events.emit('warn', message);
    }

    error(message) {
        if (this.events)
            this.events.emit('error', message);
    }
}

module.exports = TibberFeed;