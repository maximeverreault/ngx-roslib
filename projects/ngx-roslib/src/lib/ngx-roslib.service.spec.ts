import { TestBed } from '@angular/core/testing';

import { NgxRoslibService, RosTopic } from './ngx-roslib.service';
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
            topic.subscribe((msg) => {
                expect(msg.data).toEqual(42069); // eslint-disable-line @typescript-eslint/no-unsafe-member-access
                done();
            });

            topic.publish({ data: 42069 });
        });
    });
});
