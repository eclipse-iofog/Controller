import { Token } from './token';
import { IdentifierToken } from './identifier-token';
export declare class HashToken extends Token {
    input: string;
    begin: number;
    end: number;
    name: IdentifierToken;
    value?: import("./range-token").RangeToken | import("./literal-token").LiteralToken | import("./quoted-token").QuotedToken | import("./property-access-token").PropertyAccessToken | undefined;
    file?: string | undefined;
    constructor(input: string, begin: number, end: number, name: IdentifierToken, value?: import("./range-token").RangeToken | import("./literal-token").LiteralToken | import("./quoted-token").QuotedToken | import("./property-access-token").PropertyAccessToken | undefined, file?: string | undefined);
}
