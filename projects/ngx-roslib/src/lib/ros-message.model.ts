export interface NumberMessage {
    data: number;
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
