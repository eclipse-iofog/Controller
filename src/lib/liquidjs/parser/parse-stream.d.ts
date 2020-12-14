import { Token } from '../tokens/token';
import { Template } from '../template/template';
import { TopLevelToken } from '../tokens/toplevel-token';
declare type ParseToken<T extends Token> = ((token: T, remainTokens: T[]) => Template);
export declare class ParseStream<T extends Token = TopLevelToken> {
    private tokens;
    private handlers;
    private stopRequested;
    private parseToken;
    constructor(tokens: T[], parseToken: ParseToken<T>);
    on<T2 extends Template | T | undefined>(name: string, cb: (arg: T2) => void): ParseStream<T>;
    private trigger;
    start(): this;
    stop(): this;
}
export {};
