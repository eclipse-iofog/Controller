import { Token } from './token';
export declare const precedence: {
    '==': number;
    '!=': number;
    '>': number;
    '<': number;
    '>=': number;
    '<=': number;
    'contains': number;
    'and': number;
    'or': number;
};
export declare class OperatorToken extends Token {
    input: string;
    begin: number;
    end: number;
    file?: string | undefined;
    operator: string;
    constructor(input: string, begin: number, end: number, file?: string | undefined);
    getPrecedence(): any;
}
