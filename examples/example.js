"use strict";

// Use the SSE test server (not needed for real-world usage)
const TestSSEServer = require("../tests/TestSSEServer");

// Start the SSE test server
const server = new TestSSEServer();

// Use the MarathonEventBusClient
const MarathonEventBusClient = require("../index");

// Define relevant event types
const eventTypes = ["deployment_info", "deployment_success", "deployment_failed", "deployment_step_success", "deployment_step_failure"];

// Use the request module to show that we can send event data to external services (not needed for real-world usage)
const request = require("request");

// Create MarathonEventBusClient instance
const mebc = new MarathonEventBusClient({
    marathonHost: "localhost", // Use SSE test server
    eventTypes: eventTypes,
    marathonHeaders: { // When using the Marathon Event Bus outside the cluster, otherwise just omit the marathonHeaders
        "Authorization": "token=<authentication-token>" // Replace <authentication-token> with a real authentication token
    },
    handlers: { // Specify the custom event handlers
        "deployment_info": function (name, data) {
            console.log("Custom handler for " + name);
            // Send information of the "deployment_info" event to an external service (here: Just an echo service)
            request("https://echo.getpostman.com/get?name=" + name + "&startTime=" + data.timestamp, function (error, response, body) {
                body = JSON.parse(body);
                if (!error && response.statusCode == 200) {
                    console.log("Here's the data we have just sent to the echo service:");
                    console.log("--------------------");
                    console.log(JSON.stringify(body.args)); // Show the sent data
                    console.log("--------------------");
                }
            });
        }
    }
});

// Wait for "subscribed" event
mebc.on("subscribed", function () {

    console.log("Subscribed to the Marathon Event Bus");

    // For example purposes: Log all events we receive
    // In real-world usage, you should define what needs to be done when
    // receiving specific events in the `handlers` property for each event type
    eventTypes.forEach(function (eventType) {
        mebc.on(eventType, function (data) {
            console.log("Caught '" + eventType + "' event!");
        });
    });

    // Request test events from SSE test server (not needed for real-world usage)
    const eventsInterval = setInterval(function () {
        // Choose random event type from relevant events
        let eventToSend = eventTypes[Math.floor(Math.random()*eventTypes.length)];
        server.requestEvent(eventToSend);
    }, 1000);

    // Shutdown after 30 seconds
    setTimeout(function () {
        console.log("Shutting down");
        // Unsubscribe from Event Bus
        mebc.unsubscribe();
        // Shutdown SSE test server
        server.close();
    }, 30000);

});

// Wait for "unsubscribed" event
mebc.on("unsubscribed", function () {
    console.log("Unsubscribed from the Marathon Event Bus");
});

// Catch error events
mebc.on("error", function (errorObj) {
    console.log("Got an error on " + errorObj.timestamp + ":");
    console.log(JSON.stringify(errorObj.error));
});

// Subscribe to Marathon Event Bus
mebc.subscribe();
