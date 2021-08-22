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

## What is implemented?

Topics: 

- [X] Subscribe
- [X] Advertise
- [X] Unsubscribe
- [X] Unadvertise
- [X] Publish

Services:

- [ ] Call service
- [ ] Response
- [ ] Advertise
- [ ] Unadvertise

Params:

- [ ] Get
- [ ] Set
- [ ] Delete

Miscellaneous:

- [ ] Get Node list
- [ ] Get Topic list
- [ ] Authentication
- [ ] Get Service list
- [ ] Get Param list
- [ ] Get Service Request details
- [ ] Get Message details
- [ ] Action Server client


