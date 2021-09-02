# ROSLIB library as an Angular service

This package is an Angular service created to be an efficient ROSLIB interface in an Angular application. For more information about ROS, see [the official documentation](http://wiki.ros.org/). This package is based on the official Rosbridge Protocol 2.0 specified [here](https://github.com/RobotWebTools/rosbridge_suite/blob/ros1/ROSBRIDGE_PROTOCOL.md)

## How to use the package

Install the package.

```shell script
npm install ngx-roslib
```

Import the service from `ngx-roslib` and add `NgxRoslibService` in the provider list of your module.

```typescript
import { NgxRoslibService } from 'ngx-roslib';

@NgModule({
    declarations: [
    ],
    imports: [
    ],
    providers: [
        NgxRoslibService,  // Add NgxRosLibService in the provider list
    ],
    bootstrap: [YourAppComponent],
})
export class YourModule {}
````

### How to connect to Rosbridge

Inject the service in the service/component where you want to use ngx-roslib. I suggest to create a service to have a single endpoint to communicate with Rosbridge. Using `Observable` and `Subject` to pass data from the service to your components.

```typescript
import { NgxRoslibService, Rosbridge } from 'ngx-roslib';

@Injectable({
    providedIn: 'root',
})
export class RosService {
    rbServer: Rosbridge;

    constructor(public roslibService: NgxRoslibService) {
        this.rbServer = this.roslibService.connect('http://localhost:9090');  // Enter your Rosbridge URL here
        this.roslibService.onOpen.subscribe(() => console.log('Connected to Rosbridge!'));
        this.roslibService.onClose.subscribe(() => console.log('Connection to Rosbridge closed'));
        this.roslibService.onError.subscribe(() => console.error('Error occurred with Rosbridge websocket'));
    }
}
```

### How to subscribe to a topic

NgxRoslib works with types in mind. When trying to subscribe or publish a topic, you need to pass the `interface` representing the type of the received/published information. For the sake of simplicity, basic types are provided in this package. For example, to subscribe to `/rosout` (topic present in a typical ROS deployment), you can use the provided interface `RosoutMessage`.

```typescript
import { Rostopic, RosoutMessage } from 'ngx-roslib';

...

const rosout = new RosTopic<RosoutMessage>({
    ros: this.rbServer,
    name: '/rosout',
    messageType: 'rosgraph_msgs/Log',
});
rosout.subscribe((msg) => {
    console.log('Received a /rosout message:', msg);
});
```

Here is a list of the provided interfaces:

- RosMsgHeader
- RosTime
- RosoutMessage
- JoyMessage
- ImuMessage
- BoolMessage
- NumberMessage (All variants of a number: uint, int, float, etc)
- NumberArrayMessage (All variants of number array: uint, int, float, etc)

### How to publish a message on a topic

```typescript
import { RosTopic, JoyMessage } from 'ngx-roslib';

...

const joy = new RosTopic<JoyMessage>({
    ros: this.rbServer,
    name: '/dashboard/gamepad',
    messageType: 'sensor_msgs/Joy',
});
joy.advertise();
this.joyData.subscribe((joyData) => {
    joy.publish(joyData);
});
```

Note: In this example, an `Observable` containing gamepad data (pre-formatted for a `JoyMessage`) is required. In this example, the `Observable` is within `this.joyData`

### How to call a service

The class `RosService` is instantiated with 3 things: the typing details for the request, the typing details for the response and the information about the service (Ros object, name of the service and type of the service in ROS). In this example, the service called is a basic service provided by ROS which returns all currently available topics in a list of strings with the associated topic types in a separate list of strings (more info [here](http://docs.ros.org/en/indigo/api/rosapi/html/srv/Topics.html)). The format of the request and response must match what is defined in the `.srv` file describing the called service.

```typescript
import { RosService } from 'ngx-roslib';

...

const service = new RosService<{},{ topics: string[]; types: string[]; }>({
    ros: this.rbServer,
    name: '/rosapi/topics',
    serviceType: 'rosapi/Topics',
});

service.call({}, (msg) => {
    console.log(`ROS listed these topics ${msg.topics} with these topic types ${msg.types}`);
});
```

### How to advertise a service and respond to requests

*This requires that the service is defined beforehand in ROS. Otherwise, the service can't be advertised.*

The Roslib library can also advertise its own service to receive requests and respond to them accordingly. In this example, the service is using the same definition as the `/rosapi/topics` service for the sake of demonstration.

```typescript
import { RosService } from 'ngx-roslib';

...

const service= new RosService<{}, { topics: string[]; types: string[]; }>({
    ros: this.rbServer,
    name: '/example/service', // Give the service a meaningful name. This is what the caller will use to call the service
    serviceType: 'rosapi/Topics',   // Using the same serviceType as the '/rosapi/topics' service 
});

service.advertise(({}) => { // Empty request body. If some request arguments are used, they will be written as 'service.advertise(({ argument1, argument2 }) => {'
    return {
        topics: ['stringInList1', 'stringInList2'], // These are what the caller will receive as the response. The value can be determined by some kind of logic instead of hard-coded values. Again, just an example
        types: ['otherStringInList1', 'otherStringInList2'],
    };
});
```

### Read the value of a RosParam

```typescript
import { RosParam } from 'ngx-roslib';

...

const param = new RosParam<number>({
    ros: this.rbServer,
    name: '/rosbridge_websocket/port',
});
param.get((res) => {
    console.log('The port for rosbridge_websocket is: ', res); // By default the port is set to 9090
});
```

### Change the value of a RosParam

```typescript
import { RosParam } from 'ngx-roslib';

...

const param = new RosParam<number>({
    ros: this.rbServer,
    name: '/rosbridge_websocket/port',
});
param.set(9091, () => {
    console.log('The port for rosbridge_websocket is now set to 9091'); // By default the port is set to 9090. This would take effect on the next rosbridge_websocket launch
});
```

## What is implemented?

Topics: 

- [X] Subscribe
- [X] Advertise
- [X] Unsubscribe
- [X] Unadvertise
- [X] Publish

Services:

- [X] Call service
- [X] Response
- [X] Advertise
- [X] Unadvertise

Params:

- [X] Get
- [X] Set
- [X] Delete

Miscellaneous:

- [X] Get Node list
- [X] Get Topic list
- [ ] Authentication
- [ ] Get Service list
- [ ] Get Param list
- [ ] Get Service Request details
- [ ] Get Message details
- [ ] Action Server client


