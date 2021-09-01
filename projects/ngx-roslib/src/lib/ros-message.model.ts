export interface NumberMessage {
    data: number;
}

export interface NumberArrayMessage {
    data: number[];
}

export interface BoolMessage {
    data: boolean;
}

export interface StringMessage {
    data: string;
}

export interface ImuMessage {
    header: RosMsgHeader;
    orientation?: QuaternionMessage | null;
    orientation_covariance?: number[] | null;
    angular_velocity?: Vector3Message | null;
    angular_velocity_covariance?: number[] | null;
    linear_acceleration?: Vector3Message | null;
    linear_acceleration_covariance?: number[] | null;
}

export interface PointStampedMessage {
    header: RosMsgHeader;
    point?: Vector3Message;
}

export interface Vector3Message {
    x?: number | null;
    y?: number | null;
    z?: number | null;
}

export interface QuaternionMessage {
    x?: number | null;
    y?: number | null;
    z?: number | null;
    w?: number | null;
}

export interface JoyMessage {
    header: RosMsgHeader;
    axes?: number[] | null;
    buttons?: number[] | null;
}

export interface RosoutMessage {
    header: RosMsgHeader;
    level?: RosoutLevel | null;
    name?: string | null;
    msg?: string | null;
    file?: string | null;
    func?: string | null;
    line?: number | null;
    topics?: string[] | null;
}

export interface RosMsgHeader {
    seq?: number | null;
    stamp?: RosTime | null;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    frame_id?: string | null;
}

export interface RosTime {
    secs?: number | null;
    nsecs?: number | null;
}

export enum RosoutLevel {
    DEBUG = 1,
    INFO = 2,
    WARN = 4,
    ERROR = 8,
    FATAL = 16,
}
