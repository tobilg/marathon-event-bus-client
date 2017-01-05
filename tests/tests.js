"use strict";

const http = require("http");
const crypto = require("crypto");

const express = require("express");
const SSE = require("sse");

// Testing require
const expect = require("chai").expect;
const sinon = require("sinon");

const MarathonEventBusClient = require("../index");
const exampleEvents = require("./exampleEvents");

/**
 * TestSSEServer test server.
 */
class TestSSEServer {

    constructor(port) {
        this.port = port;
        this.connectionCache = {};
        this.server = http.createServer();

        this.app = express();

        this.server = this.app.listen(this.port, function (err) {
            if (err) throw err;
            console.log("SSE server ready on http://localhost:" + port)
        });

        this.sse = new SSE(this.server, { path: "/v2/events" });

        let self = this;

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
            })
        }
    }
}

describe("MarathonEventBusClient tests", function() {

    it("Create the MarathonEventBusClient with default options", function () {
        let mebc = MarathonEventBusClient({});
        expect(mebc).to.be.instanceOf(MarathonEventBusClient);
        expect(mebc.options.eventTypes).to.be.an("array");
        expect(mebc.options.marathonUrl).to.equal("master.mesos");
        expect(mebc.options.marathonPort).to.equal(8080);
        expect(mebc.options.marathonProtocol).to.equal("http");
    });

    describe("Using TestSSEServer", function () {

        this.timeout(5000);

        const port = 8080;
        const server = new TestSSEServer(port);

        before(server.listen.bind(server));
        after(server.close.bind(server));

        it("Should connect and receive a 'deployment_info' event", (done) => {
            let mebc = MarathonEventBusClient({
                marathonUrl: "localhost",
                marathonPort: port,
                enableConnectionEvent: true
            });

            expect(mebc).to.be.instanceOf(MarathonEventBusClient);

            mebc.subscribe();

            mebc.on("connected", function () {
                mebc.logger.info("connected!");
            });

            mebc.on("connectionId", function (connectionId) {
                mebc.logger.info("Using connectionId " + connectionId);

                const EVENT_TYPE = "deployment_info";

                mebc.on(EVENT_TYPE, function (data) {
                    expect(JSON.stringify(data)).to.equal(JSON.stringify(exampleEvents[EVENT_TYPE]));
                    server.closeConnection(connectionId);
                    done();
                });

                server.requestEvent(EVENT_TYPE);
            });
        });

    });

});