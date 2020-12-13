import { TokenKind } from '../parser/token-kind';
export declare abstract class Token {
    kind: TokenKind;
    input: string;
    begin: number;
    end: number;
    file?: string | undefined;
    constructor(kind: TokenKind, input: string, begin: number, end: number, file?: string | undefined);
    getText(): string;
    getPosition(): number[];
    size(): number;
}
