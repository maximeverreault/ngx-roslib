import { Injectable, OnDestroy } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Observable, Subject, Subscription } from 'rxjs';
import { filter, pluck, take, tap } from 'rxjs/operators';

@Injectable({
    providedIn: 'root',
})
export class NgxRoslibService implements OnDestroy {
    connection$: WebSocketSubject<any> | undefined;
    onOpen: Observable<any> | undefined;
    onClose: Observable<CloseEvent> | undefined;
    onError: Observable<any> | undefined;
    isConnected = false;
    private ros: Rosbridge | undefined;

    constructor() {}

    set statusLevel(level: StatusMessageLevel) {
        if (this.ros) this.ros.statusLevel = level;
    }

    connect(
        url: string,
        transportLibrary: RosLibTransportLibrary = 'websocket',
        transportOptions?: RTCConfiguration
    ): Rosbridge {
        const ros = (this.ros = new Rosbridge());
        this.connection$ = ros.connect(url, transportLibrary, transportOptions);
        this.onOpen = ros.onOpen;
        this.onClose = ros.onClose;
        this.onError = ros.onError;
        return ros;
    }

    ngOnDestroy() {
        this.connection$?.complete();
    }
}

interface GetTopicsServiceResponse {
    topics: string[];
    types: string[];
}

interface GetNodesServiceResponse {
    nodes: string[];
    types: string[];
}

export class Rosbridge {
    isConnected = false;
    transportLibrary: RosLibTransportLibrary = 'websocket';
    transportOptions: RTCConfiguration | undefined;
    connection$: WebSocketSubject<any> | undefined;
    private connectionOpened$ = new Subject<Event>();
    onOpen = this.connectionOpened$.asObservable();
    private connectionClosed$ = new Subject<CloseEvent>();
    onClose = this.connectionClosed$.asObservable();
    private connectionError$ = new Subject<any>();
    onError: Observable<any> | undefined = this.connectionError$.asObservable();

    constructor(
        url?: string,
        transportLibrary?: RosLibTransportLibrary,
        transportOptions?: RTCConfiguration
    ) {
        if (url) {
            this.connection$ = this.connect(
                url,
                transportLibrary ?? 'websocket',
                transportOptions
            );
        }
    }

    set statusLevel(level: StatusMessageLevel) {
        const setStateLevelRequest = new SetStatusLevel(level);
        this.sendRequest(setStateLevelRequest);
    }

    connect(
        url: string,
        transportLibrary: RosLibTransportLibrary = 'websocket',
        transportOptions?: RTCConfiguration
    ): WebSocketSubject<any> | undefined {
        this.transportOptions = transportOptions;
        this.transportLibrary = transportLibrary;
        let wsUrl: string;
        if (transportLibrary === 'websocket') {
            wsUrl = url.replace(/(http)(s)?:\/\//, 'ws$2://');
            if (!this.connection$ || this.connection$.closed) {
                this.connection$ = webSocket({
                    url: wsUrl,
                    binaryType: 'arraybuffer',
                    openObserver: {
                        next: (value) => {
                            this.isConnected = true;
                            this.connectionOpened$.next(value);
                        },
                    },
                    closeObserver: {
                        next: (closeEvent) => {
                            this.isConnected = false;
                            this.connectionClosed$.next(closeEvent);
                        },
                    },
                    closingObserver: {
                        next: () => {},
                    },
                });
            }
        } else if (transportLibrary === 'workerSocket') {
            // TODO: add websocket in web worker implementation for the connect method
            //
        }
        this.connection$?.subscribe(
            () => {},
            () => {}
        ); // Needed to open the websocket
        return this.connection$;
    }

    authenticate(
        mac: string,
        client: string,
        dest: string,
        rand: string,
        t: number,
        level: string,
        end: number
    ) {
        this.sendRequest({
            op: 'auth',
            mac: mac,
            client: client,
            dest: dest,
            rand: rand,
            t: t,
            level: level,
            end: end,
        });
    }

    sendRequest(message: any) {
        if (!this.isConnected) {
            console.log(
                'Trying to send request, but not connected. Waiting...'
            );
            this.onOpen
                ?.pipe(take(1))
                .subscribe(() => this.connection$?.next(message));
        } else {
            this.connection$?.next(message);
        }
    }

    getTopics(
        callback: (topics: string[]) => void,
        failedCallback?: (error: any) => void
    ): void {
        const topicsService = new RosService<Object, GetTopicsServiceResponse>({
            ros: this,
            name: '/rosapi/topics',
            serviceType: 'rosapi/Topics',
        });

        if (failedCallback) {
            topicsService.call(
                {},
                (msg) => {
                    callback(msg.topics);
                },
                failedCallback
            );
        } else {
            topicsService.call({}, (msg) => {
                callback(msg.topics);
            });
        }
    }

    getNodes(
        callback: (nodes: string[]) => void,
        failedCallback?: (error: any) => void
    ): void {
        const topicsService = new RosService<Object, GetNodesServiceResponse>({
            ros: this,
            name: '/rosapi/nodes',
            serviceType: 'rosapi/Nodes',
        });

        if (failedCallback) {
            topicsService.call(
                {},
                (msg) => {
                    callback(msg.nodes);
                },
                failedCallback
            );
        } else {
            topicsService.call({}, (msg) => {
                callback(msg.nodes);
            });
        }
    }
}

let idCounter: number = 0;

class RosbridgeProtocol {
    op: RosbridgeOperation | undefined;
}

class SetStatusLevel extends RosbridgeProtocol {
    private id: string | undefined;
    private level: StatusMessageLevel;

    constructor(level: StatusMessageLevel, id?: string) {
        super();
        this.op = 'set_level';
        this.level = level;
        this.id = id;
    }
}

class StatusMessage extends RosbridgeProtocol {
    private id: string | undefined;
    private level: StatusMessageLevel;
    private msg: string;

    constructor(level: StatusMessageLevel, msg: string, id?: string) {
        super();
        this.op = 'status';
        this.level = level;
        this.id = id;
        this.msg = msg;
    }
}

class Authenticate extends RosbridgeProtocol {
    private mac: string;
    private client: string;
    private dest: string;
    private rand: string;
    private t: number;
    private level: string;
    private end: number;

    constructor(
        mac: string,
        client: string,
        dest: string,
        rand: string,
        t: number,
        level: string,
        end: number
    ) {
        super();
        this.op = 'auth';
        this.mac = mac;
        this.client = client;
        this.dest = dest;
        this.rand = rand;
        this.t = t;
        this.level = level;
        this.end = end;
    }
}

class Advertise extends RosbridgeProtocol {
    id: string | undefined;
    private topic: string;
    private type: string;
    private latch: boolean;
    private queue_size: number;

    constructor(
        topic: string,
        type: string,
        id?: string,
        latch?: boolean,
        queue_size?: number
    ) {
        super();
        this.op = 'advertise';
        this.topic = topic;
        this.id = `advertise:${this.topic}:${++idCounter}`;
        this.type = type;
        this.latch = latch ?? false;
        if (queue_size) {
            this.queue_size = Math.max(0, queue_size);
        } else {
            this.queue_size = 100;
        }
    }
}

class Unadvertise extends RosbridgeProtocol {
    private id: string | undefined;
    private topic: string;

    constructor(topic: string, id?: string) {
        super();
        this.op = 'unadvertise';
        this.id = id;
        this.topic = topic;
    }
}

class Publish extends RosbridgeProtocol {
    private id: string | undefined;
    private topic: string;
    private msg: string;
    private latch: boolean;
    private queue_size: number;

    constructor(
        topic: string,
        msg: any,
        id?: string,
        latch?: boolean,
        queue_size?: number
    ) {
        super();
        this.op = 'publish';
        this.topic = topic;
        this.id = `publish:${this.topic}:${++idCounter}`;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        this.msg = msg;
        this.latch = latch ?? false;
        if (queue_size) {
            this.queue_size = Math.max(0, queue_size);
        } else {
            this.queue_size = 100;
        }
    }
}

class Subscribe extends RosbridgeProtocol {
    id: string | undefined;
    private topic: string;
    private type: string | undefined;
    private throttle_rate: number | undefined;
    private queue_length: number | undefined;
    private fragment_size: number | undefined;
    private compression: RosTopicCompression | undefined;

    constructor(
        topic: string,
        type?: string,
        throttle_rate?: number,
        queue_length?: number,
        fragment_size?: number,
        compression?: RosTopicCompression,
        id?: string
    ) {
        super();
        this.op = 'subscribe';
        this.topic = topic;
        this.id = `subscribe:${this.topic}:${++idCounter}`;
        this.type = type;
        this.throttle_rate = throttle_rate ?? 0;
        this.queue_length = queue_length ?? 0;
        this.fragment_size = fragment_size;
        this.compression = compression ?? 'none';
    }
}

class ServiceCall extends RosbridgeProtocol {
    id: string | undefined;
    private service: string;
    private args: Object | undefined = {};
    private fragment_size: number | undefined;
    private compression: 'none' | 'png' | undefined;

    constructor(
        service: string,
        args?: Object,
        id?: string,
        fragment_size?: number,
        compression?: 'none' | 'png'
    ) {
        super();
        this.op = 'call_service';
        this.service = service;
        this.id = id ?? `call_service:${this.service}:${++idCounter}`;
        this.args = checkJsonCompatible(args) ? args : {};
        this.fragment_size = fragment_size;
        this.compression = compression;
    }
}

class AdvertiseService extends RosbridgeProtocol {
    private type: string;
    private service: string;

    constructor(type: string, service: string) {
        super();
        this.op = 'advertise_service';
        this.type = type;
        this.service = service;
    }
}

class UnadvertiseService extends RosbridgeProtocol {
    private service: string;

    constructor(service: string) {
        super();
        this.op = 'unadvertise_service';
        this.service = service;
    }
}

class ServiceRequest extends RosbridgeProtocol {}

class ServiceResponse extends RosbridgeProtocol {
    private id: string | undefined;
    private service: string;
    private values: Object | undefined = {};
    private result: boolean;

    constructor(
        service: string,
        result: boolean,
        id?: string,
        values?: Object
    ) {
        super();
        this.op = 'service_response';
        this.id = id;
        this.service = service;
        this.values = checkJsonCompatible(values) ? values : {};
        this.result = result;
    }
}

class Unsubscribe extends RosbridgeProtocol {
    private id: string | undefined;
    private topic: string;

    constructor(topic: string, id?: string) {
        super();
        this.op = 'unsubscribe';
        this.topic = topic;
        this.id = id;
    }
}

interface RosTopicParam {
    name: string;
    messageType: string;
    compression?: RosTopicCompression;
    throttleRate?: number;
    latch?: boolean;
    queueSize?: number;
    queueLength?: number;
    reconnectOnClose?: boolean;
    ros: Rosbridge;
}

/**
 * RosTopic class used to instantiate a topic, subscribe to its event and advertise future events regarding the topic
 */
export class RosTopic<T extends { toString: () => string }>
    implements RosTopicParam
{
    name: string;
    messageType: string;
    compression?: RosTopicCompression;
    throttleRate?: number;
    latch?: boolean;
    queueSize?: number;
    queueLength?: number;
    reconnectOnClose?: boolean;
    ros: Rosbridge;
    private observable$: Observable<T> | undefined;
    private id: string | undefined;
    private sub: Subscription | undefined;

    constructor({
        ros,
        name,
        messageType,
        compression = 'none',
        throttleRate = 0,
        latch = false,
        queueSize = 100,
        queueLength = 0,
        reconnectOnClose = true,
    }: RosTopicParam) {
        this.ros = ros;
        this.name = name;
        this.messageType = messageType;
        this.compression = compression;
        this.throttleRate = throttleRate;
        this.latch = latch;
        this.queueSize = queueSize;
        this.queueLength = queueLength;
        this.reconnectOnClose = reconnectOnClose;

        this.throttleRate = Math.max(this.throttleRate, 0);
    }

    subscribe(callback: (message: T) => void) {
        const subRequest = new Subscribe(this.name, this.messageType);
        this.observable$ = this.ros.connection$?.pipe(
            filter(
                (data) => data?.topic === this.name && data?.op === 'publish' // eslint-disable-line @typescript-eslint/no-unsafe-member-access
            ),
            pluck('msg')
        );
        this.sub = this.observable$?.subscribe((message: T) =>
            callback(message)
        );
        this.id = subRequest.id;
        this.ros.sendRequest(subRequest);
    }

    unsubscribe() {
        const unsubRequest = new Unsubscribe(this.name, this.id);
        this.ros.sendRequest(unsubRequest);
        this.sub?.unsubscribe();
    }

    advertise() {
        const advertiseRequest = new Advertise(
            this.name,
            this.messageType,
            this.id,
            this.latch,
            this.queueSize
        );
        this.id = advertiseRequest.id;
        this.ros.sendRequest(advertiseRequest);
    }

    publish(msg: T) {
        const publishRequest = new Publish(
            this.name,
            msg,
            this.id,
            this.latch,
            this.queueSize
        );
        this.ros.sendRequest(publishRequest);
    }

    unadvertise() {
        const unadvertiseRequest = new Unadvertise(this.name, this.id);
        this.ros.sendRequest(unadvertiseRequest);
    }
}

interface RosServiceParams {
    name: string;
    serviceType: string;
    ros: Rosbridge;
}

class RosService<
    T_REQ extends { toString: () => string },
    T_RES extends { toString: () => string }
> implements RosServiceParams
{
    name: string;
    ros: Rosbridge;
    serviceType: string;
    private id: number | undefined;
    private isAdvertised: boolean = false;

    constructor({ ros, name, serviceType }: RosServiceParams) {
        this.ros = ros;
        this.name = name;
        this.serviceType = serviceType;
    }

    advertise() {
        const serviceAdvertiseRequest = new AdvertiseService(
            this.serviceType,
            this.name
        );
        this.ros.sendRequest(serviceAdvertiseRequest);
        this.isAdvertised = true;
    }

    call(
        req: T_REQ,
        callback: (res: T_RES) => void,
        failedCallback?: (res: any) => void
    ) {
        const serviceCallRequest = new ServiceCall(this.name, req);

        this.ros.connection$
            ?.pipe(
                filter(
                    (data) =>
                        data?.service === this.name && // eslint-disable-line @typescript-eslint/no-unsafe-member-access
                        data?.id === serviceCallRequest.id && // eslint-disable-line @typescript-eslint/no-unsafe-member-access
                        data?.op === 'service_response' // eslint-disable-line @typescript-eslint/no-unsafe-member-access
                ),
                tap((msg) => {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    if (msg?.result !== undefined && msg?.result === false)
                        if (failedCallback) {
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                            failedCallback(msg.values);
                        }
                }),
                pluck('values'),
                take(1)
            )
            .subscribe((message: T_RES) => callback(message));
        this.ros.sendRequest(serviceCallRequest);
    }

    unadvertise() {
        if (!this.isAdvertised) return;
        const serviceUnadvertiseRequest = new UnadvertiseService(this.name);
        this.ros.sendRequest(serviceUnadvertiseRequest);
    }
}

function checkJsonCompatible(item: any): boolean {
    item = typeof item !== 'string' ? JSON.stringify(item) : item;

    try {
        JSON.parse(item);
    } catch (e) {
        console.error(item);
        throw new TypeError('The argument is not a JSON compatible object');
    }

    return typeof item === 'object' && item !== null;
}

type StatusMessageLevel = 'info' | 'warning' | 'error' | 'none';

type RosbridgeOperation =
    | 'fragment'
    | 'png'
    | 'set_level'
    | 'status'
    | 'auth'
    | 'advertise'
    | 'unadvertise'
    | 'subscribe'
    | 'unsubscribe'
    | 'call_service'
    | 'advertise_service'
    | 'unadvertise_service'
    | 'service_request'
    | 'service_response'
    | 'publish';

type RosLibTransportLibrary =
    | 'websocket'
    | 'socket.io'
    | 'RTCPeerConnection'
    | 'workerSocket';

type RosTopicCompression = 'png' | 'cbor' | 'cbor-raw' | 'none';
