import { QuotedToken } from '../tokens/quoted-token';
import { Token } from '../tokens/token';
import { Context } from '../context/context';
export declare class Expression {
    private operands;
    private postfix;
    private lenient;
    constructor(str: string, lenient?: boolean);
    evaluate(ctx: Context): any;
    value(ctx: Context): IterableIterator<any>;
}
export declare function evalToken(token: Token | undefined, ctx: Context, lenient?: boolean): any;
export declare function evalQuotedToken(token: QuotedToken): string;
