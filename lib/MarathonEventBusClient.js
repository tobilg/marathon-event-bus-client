"use strict";

const EventEmitter = require("events").EventEmitter;
const util = require("util");
const EventSource = require("eventsource");

/**
 * Represents a Marathon Event Bus Client
 * @constructor
 * @param {object} options - The option map object.
 */
function MarathonEventBusClient (options) {

    if (!(this instanceof MarathonEventBusClient)) {
        return new MarathonEventBusClient(options);
    }

    // Inherit from EventEmitter
    EventEmitter.call(this);

    let self = this;

    // See https://github.com/mesosphere/marathon/blob/master/src/main/scala/mesosphere/marathon/core/event/Events.scala
    self.allowedEventTypes = ["pod_created_event", "pod_updated_event", "pod_deleted_event", "scheduler_registered_event", "scheduler_reregistered_event", "scheduler_disconnected_event", "subscribe_event", "unsubscribe_event", "event_stream_attached", "event_stream_detached", "add_health_check_event", "remove_health_check_event", "failed_health_check_event", "health_status_changed_event", "unhealthy_task_kill_event", "group_change_success", "group_change_failed", "deployment_info", "deployment_success", "deployment_failed", "deployment_step_success", "deployment_step_failure", "app_terminated_event", "status_update_event", "instance_changed_event", "unknown_instance_terminated_event", "instance_health_changed_event", "framework_message_event"];

    self.options = {};

    // Marathon endpoint discovery
    self.options.marathonHost = options.marathonHost || "master.mesos";
    self.options.marathonPort = parseInt(options.marathonPort) || 8080;
    self.options.marathonProtocol = options.marathonProtocol || "http";
    self.options.marathonUri = options.marathonUri || "/v2/events";
    
    // Whether to emit a "connectionId" event
    self.options.enableConnectionEvent = options.enableConnectionEvent || false;

    // Set the used eventTypes
    if (options.eventTypes && options.eventTypes.length > 0) {
        self.options.eventTypes = [];
            options.eventTypes.forEach(function (eventType) {
            if (self.allowedEventTypes.indexOf(eventType) > -1) {
                self.options.eventTypes.push(eventType);
            }
        });
    } else {
        // Just use the deployment events by default, to avoid channel flooding
        self.options.eventTypes = ["deployment_info", "deployment_success", "deployment_failed"];
    }

    if (self.options.enableConnectionEvent) {
        self.options.eventTypes.push("connectionId");
    }

    function isFunction(obj) {
        return !!(obj && obj.constructor && obj.call && obj.apply);
    }

    // Event handlers
    self.options.eventHandlers = {};

    // Add custom event handlers if present
    if (options.handlers && Object.getOwnPropertyNames(options.handlers).length > 0) {
        Object.getOwnPropertyNames(options.handlers).forEach(function (handlerName) {
            const lcHandlerName = handlerName.toLowerCase();
            // Check if name is in defined event types, is a function
            if (self.options.eventTypes.indexOf(lcHandlerName) > -1 && isFunction(options.handlers[handlerName])) {
                self.options.eventHandlers[lcHandlerName] = function (name, data) {
                    // Emit according event
                    self.emit(name, data);
                    // Call custom event handler
                    options.handlers[handlerName](name, data);
                }
            }
        });
    }

    // Check if an event handlers has been defined for each event type
    self.options.eventTypes.forEach(function (eventType) {
        // If there's no event handler defined yet, set a default event handler which just prints the event name
        if (!self.options.eventHandlers.hasOwnProperty(eventType)) {
            self.options.eventHandlers[eventType] = function (name, data) {
                // Emit according event
                self.emit(name, data);
                // Log event name
                console.log("Default handler for " + name + ". Do nothing.");
            }
        }
    });
    
}

// Inherit from EventEmitter
util.inherits(MarathonEventBusClient, EventEmitter);

/**
 * Subscribes the MarathonEventBusClient to the Marathon Event Bus
 */
MarathonEventBusClient.prototype.subscribe = function () {

    let self = this,
        url = self.options.marathonProtocol + "://" + self.options.marathonHost + ":" + self.options.marathonPort+self.options.marathonUri;

    // Allow unauthorized HTTPS requests
    let eventSourceInitDict = { rejectUnauthorized: false };

    // Create EventSource for Marathon /v2/events endpoint
    self.es = new EventSource(url, eventSourceInitDict);

    self.es.on("open", function () {
        self.emit("subscribed", { "timestamp": ((new Date().getTime())/1000) })
    });

    self.es.on("error", function (error) {
        self.emit("error", { "timestamp": ((new Date().getTime())/1000), error: error })
    });

    // Iterate over event types
    self.options.eventTypes.forEach(function (type) {
        // Add event listeners
        self.es.addEventListener(type, function (e) {
            self.options.eventHandlers[type](e.type, JSON.parse(e.data));
        });

    });

};

/**
 * Unsubscribes from the Marathon Event Bus
 */
MarathonEventBusClient.prototype.unsubscribe = function () {
    let self = this;
    self.emit("unsubscribed");
    setTimeout(function () {
        self.es.close();
    }, 100);
};

module.exports = MarathonEventBusClient;
