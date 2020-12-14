export declare class Emitter {
    html: any;
    break: boolean;
    continue: boolean;
    private keepOutputType?;
    constructor(keepOutputType: boolean | undefined);
    write(html: any): void;
}
