# marathon-event-bus-client

[![Package version](https://img.shields.io/npm/v/marathon-event-bus-client.svg)](https://www.npmjs.com/package/marathon-event-bus-client) [![Package downloads](https://img.shields.io/npm/dt/marathon-event-bus-client.svg)](https://www.npmjs.com/package/marathon-event-bus-client) [![Package license](https://img.shields.io/npm/l/marathon-event-bus-client.svg)](https://www.npmjs.com/package/marathon-event-bus-client) [![Build Status](https://travis-ci.org/tobilg/marathon-event-bus-client.svg?branch=master)](https://travis-ci.org/tobilg/marathon-event-bus-client)

A generic client to listen to Marathon's (Server Sent) Event Bus.

## Usage

Install as a dependency like this:

```bash
npm install marathon-event-bus-client --save
```

## Events

### Known Marathon events

As of the [Marathon sources](https://github.com/mesosphere/marathon/blob/master/src/main/scala/mesosphere/marathon/core/event/Events.scala) there are currently the following events:

 * `pod_created_event`
 * `pod_updated_event`
 * `pod_deleted_event`
 * `scheduler_registered_event`
 * `scheduler_reregistered_event`
 * `scheduler_disconnected_event`
 * `subscribe_event`
 * `unsubscribe_event`
 * `event_stream_attached`
 * `event_stream_detached`
 * `add_health_check_event`
 * `remove_health_check_event`
 * `failed_health_check_event`
 * `health_status_changed_event`
 * `unhealthy_task_kill_event`
 * `group_change_success`
 * `group_change_failed`
 * `deployment_info`
 * `deployment_success`
 * `deployment_failed`
 * `deployment_step_success`
 * `deployment_step_failure`
 * `app_terminated_event`
 * `status_update_event`
 * `instance_changed_event`
 * `unknown_instance_terminated_event`
 * `instance_health_changed_event`
 * `framework_message_event`

### Internal events

The Marathon Event Bus Client itself emits the following events:

 * `subscribed`: Is emitted after a successful subscription to the Marathon Event Bus.
 * `unsubscribed`: Is emitted after `unsubscribe()` is called.
 * `error`: Is emitted in case of internal or upstream errors.

## Using the client

### Options

You can specify the following properties when instantiating the Marathon Event Bus Client:

 * `marathonHost`: The Marathon base URL. Default is `master.mesos`.
 * `marathonPort`: The Marathon port. Default is `8080`.
 * `marathonProtocol`: The Marathon protocol (`http` or `https`). Default is `http`.
 * `marathonUri`: The relative path where the Marathon Event Bus endpoint can be found. Default is `/v2/events`.
 * `marathonHeaders`: Allows you to add headers to Marathon's API requests. Default is an empty object `{}`
 Example: `marathonHeaders = {'Authorization': 'token=API_ACCESS_TOKEN', 'Content-Type': 'application/json'}`
 * `eventTypes`: An `array` of event types emitted by Marathon (see above for a list). Default is `["deployment_info", "deployment_success", "deployment_failed"]`.
 * `handlers`: A map object consisting of handler functions for the individual Marathon events. See [below](#handler-functions) for an explanation. No defaults.

### Methods

The Marathon Event Bus Client only exposes the `subscribe()` and the `unsubscribe()` methods. You can catch all above events via `on(<eventType>, function (data) { ... }`.

### Handler functions

The custom event handler functions can be configured by setting a map object as `handlers` property during the instantiation. Each map object's property represents a event handling function. The property name needs to match on of the Marathon event types from the [list of known Marathon events](#known-marathon-events).

This is an example `handlers` map object:

```javascript
{ // Specify the custom event handlers
    "deployment_info": function (name, data) {
        console.log("We have a new deployment info!");
    },
    "deployment_success": function (name, data) {
        console.log("Our deployment was successful!");
    }
}
```

The function arguments are:

 * `name`: The name of the emitted event
 * `data`: The emitted data for the event

### Example code

For a complete example, have a look at [examples/example.js](examples/example.js). Also, for a "real-life example", you can refer to [marathon-slack](https://github.com/tobilg/marathon-slack).

```javascript
// Use the MarathonEventBusClient
const MarathonEventBusClient = require("marathon-event-bus-client");

// Define relevant event types
const eventTypes = ["deployment_info", "deployment_success", "deployment_failed"];

// Create MarathonEventBusClient instance
const mebc = new MarathonEventBusClient({
    marathonHost: "localhost", // Use SSE test server
    eventTypes: eventTypes,
    marathonHeaders: {'Authorization': 'token=API_ACCESS_TOKEN'} // if you are using the api outisde the cluster
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
        },
        "deployment_success": function (name, data) {
            console.log("Custom handler for " + name);
        }
    }
});

// Wait for "connected" event
mebc.on("connected", function () {

    console.log("Subscribed to the Marathon Event Bus");

    // For example purposes: Log all events we receive
    // In real-world usage, you should define what needs to be done when
    // receiving specific events in the `handlers` property for each event type
    eventTypes.forEach(function (eventType) {
        mebc.on(eventType, function (data) {
            console.log("Caught '" + eventType + "' event!");
        });
    });

    // Shutdown after 30 seconds
    setTimeout(function () {
        console.log("Shutting down");
        // Unsubscribe from Event Bus
        mebc.unsubscribe();
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
```
