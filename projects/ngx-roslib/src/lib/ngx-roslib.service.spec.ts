import { TestBed } from '@angular/core/testing';

import {
    NgxRoslibService,
    RosParam,
    RosService,
    RosTopic,
} from './ngx-roslib.service';
import { NumberMessage, RosoutMessage } from './ros-message.model';

describe('NgxRoslibService', () => {
    let service: NgxRoslibService;
    let topic: RosTopic<any>;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(NgxRoslibService);
    });

    afterEach(() => {
        topic?.unsubscribe();
        topic?.unadvertise();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should connect successfully to ROS websocket', (done) => {
        service.connect('ws://localhost:9090');
        service.onOpen?.subscribe((event) => {
            expect(event).toBeTruthy();
            done();
        });
    });

    it('should connect successfully to ROS websocket using a http:// url', (done) => {
        service.connect('http://localhost:9090');
        service.onOpen?.subscribe((event) => {
            expect(event).toBeTruthy();
            done();
        });
    });

    it('should subscribe successfully to /rosout', (done) => {
        const rbServer = service.connect('ws://localhost:9090');
        service.onOpen?.subscribe(() => {
            topic = new RosTopic<RosoutMessage>({
                ros: rbServer,
                name: '/rosout',
                messageType: 'rosgraph_msgs/Log',
            });
            topic.subscribe((msg) => {
                expect(msg).toBeTruthy();
                done();
            });
        });
    });

    it('should publish to an example topic successfully', (done) => {
        const rbServer = service.connect('ws://localhost:9090');
        service.onOpen?.subscribe(() => {
            topic = new RosTopic<NumberMessage>({
                ros: rbServer,
                name: '/test_topic',
                messageType: 'std_msgs/UInt16',
            });
            topic.advertise();
            topic.subscribe((msg: NumberMessage) => {
                expect(msg.data).toEqual(42069);
                done();
            });

            topic.publish({ data: 42069 });
        });
    });

    it('should call a service successfully', (done) => {
        const rbServer = service.connect('ws://localhost:9090');
        service.onOpen?.subscribe(() => {
            const service = new RosService<
                {},
                {
                    topics: string[];
                    types: string[];
                }
            >({
                ros: rbServer,
                name: '/rosapi/topics',
                serviceType: 'rosapi/Topics',
            });

            service.call({}, (msg) => {
                expect(msg.topics).toBeTruthy();
                expect(msg.topics).toContain('/rosout');
                done();
            });
        });
    });

    it('should expose a getTopics method which will return a list of topics and should contain "/rosout"', (done) => {
        const rbServer = service.connect('ws://localhost:9090');
        rbServer.onOpen.subscribe(() => {
            rbServer.getTopics((topics) => {
                expect(topics).toBeTruthy();
                expect(topics).toContain('/rosout');
                done();
            });
        });
    });

    it('should expose a getNodes method which will return a list of nodes and should contain "rosapi"', (done) => {
        const rbServer = service.connect('ws://localhost:9090');
        rbServer.onOpen.subscribe(() => {
            rbServer.getNodes((nodes) => {
                expect(nodes).toBeTruthy();
                expect(nodes).toContain('/rosapi');
                done();
            });
        });
    });

    it('should advertise a service a respond correctly to the request', (done) => {
        const rbServer = service.connect('ws://localhost:9090');
        rbServer.onOpen.subscribe(() => {
            const serviceTesting = new RosService<
                {},
                {
                    topics: string[];
                    types: string[];
                }
            >({
                ros: rbServer,
                name: '/test/topics',
                serviceType: 'rosapi/Topics',
            });

            serviceTesting.advertise(({}) => {
                return {
                    topics: ['plotte1', 'plotte2'],
                    types: ['plottetype1', 'plottetype2'],
                };
            });

            serviceTesting.call({}, (res) => {
                expect(res).toBeTruthy();
                expect(res.topics).toEqual(['plotte1', 'plotte2']);
                expect(res.types).toEqual(['plottetype1', 'plottetype2']);
                serviceTesting.unadvertise();
                done();
            });
        });
    });

    it('should read a RosParam successfully', (done) => {
        const rbServer = service.connect('ws://localhost:9090');
        rbServer.onOpen.subscribe(() => {
            const param = new RosParam<number>({
                ros: rbServer,
                name: '/rosbridge_websocket/port',
            });
            param.get((res) => {
                expect(res).toBeTruthy();
                expect(res).toEqual(9090);
                done();
            });
        });
    });

    it('should overwrite a RosParam successfully', (done) => {
        const rbServer = service.connect('ws://localhost:9090');
        rbServer.onOpen.subscribe(() => {
            const param = new RosParam<number>({
                ros: rbServer,
                name: '/rosbridge_websocket/port',
            });
            param.get((oldValue) => {
                param.set(oldValue + 1, () => {
                    param.get((newValue) => {
                        expect(newValue).toEqual(oldValue + 1);
                        param.set(9090, () => {
                            done();
                        });
                    });
                });
            });
        });
    });
});
