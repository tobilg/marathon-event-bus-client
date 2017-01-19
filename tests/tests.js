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
const TestSSEServer = require("./TestSSEServer");

describe("MarathonEventBusClient tests", function() {

    it("Create the MarathonEventBusClient with default options", function () {
        let mebc = MarathonEventBusClient({});
        expect(mebc).to.be.instanceOf(MarathonEventBusClient);
        expect(mebc.options.eventTypes).to.be.an("array");
        expect(mebc.options.marathonHost).to.equal("master.mesos");
        expect(mebc.options.marathonPort).to.equal(8080);
        expect(mebc.options.marathonProtocol).to.equal("http");
        expect(mebc.options.marathonHeaders).to.eql({});
    });

    describe("Using TestSSEServer", function () {

        this.timeout(5000);

        const port = 8080;
        const server = new TestSSEServer(port);

        before(server.listen.bind(server));
        after(server.close.bind(server));

        it("Should connect and receive a 'deployment_info' event", (done) => {
            let mebc = MarathonEventBusClient({
                marathonHost: "localhost",
                marathonPort: port,
                enableConnectionEvent: true
            });

            expect(mebc).to.be.instanceOf(MarathonEventBusClient);

            mebc.subscribe();

            mebc.on("subscribed", function () {
                console.log("subscribed!");
            });

            mebc.on("connectionId", function (connectionId) {
                console.log("Using connectionId " + connectionId);

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
