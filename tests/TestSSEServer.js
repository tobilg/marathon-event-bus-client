"use strict";

const http = require("http");
const crypto = require("crypto");

const express = require("express");
const SSE = require("sse");

// Testing require
const exampleEvents = require("./exampleEvents");

/**
 * TestSSEServer test server.
 */
class TestSSEServer {

    constructor(port) {
        this.port = port || 8080;
        this.connectionCache = {};
        this.server = http.createServer();

        this.app = express();

        let self = this;

        this.server = this.app.listen(this.port, function (err) {
            if (err) throw err;
            console.log("SSE server ready on http://localhost:" + self.port)
        });

        this.sse = new SSE(this.server, { path: "/v2/events" });

        //
        this.sse.on("connection", function (connection) {
            let connectionId = crypto.randomBytes(16).toString("hex");

            // Store connection in connectionCache
            self.connectionCache[connectionId] = connection;

            self.connectionCache[connectionId].send({
                event: "connectionId",
                data: JSON.stringify(connectionId)
            });

            console.log("new connection with id "+ connectionId);

            self.connectionCache[connectionId].on("close", function () {
                console.log("Closed connection " + connectionId);
            });
        });

    }

    listen() {
        console.log("Listening for SSE requests on port " + this.port);
        this.server.listen(this.port);
    }

    close() {
        this.server.close();
    }

    closeConnection(connectionId) {
        if (this.connectionCache.hasOwnProperty(connectionId)) {
            console.log("Closing connectionId " + connectionId);
            this.connectionCache[connectionId].close();
        } else {
            console.log("Connection with connectionId " + connectionId + " doesn't exist!");
        }
    }

    requestEvent(eventType) {
        var self = this;
        if (exampleEvents.hasOwnProperty(eventType)) {
            Object.getOwnPropertyNames(this.connectionCache).forEach(function (connectionId) {
                self.connectionCache[connectionId].send({
                    event: eventType,
                    data: JSON.stringify(exampleEvents[eventType])
                });
            });
        }
    }
}

module.exports = TestSSEServer;
