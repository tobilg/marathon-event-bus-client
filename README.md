# marathon-event-bus-client

A generic client to listen to Marathon's (Server Sent) Event Bus.

## Known Marathon events

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
 
## Using the client
