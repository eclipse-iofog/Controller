import { Token } from './token';
export declare class LiteralToken extends Token {
    input: string;
    begin: number;
    end: number;
    file?: string | undefined;
    literal: string;
    constructor(input: string, begin: number, end: number, file?: string | undefined);
}
