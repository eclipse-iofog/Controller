import { Token } from '../tokens/token';
import { Template } from '../template/template';
declare abstract class LiquidError extends Error {
    private token;
    private originalError;
    constructor(err: Error, token: Token);
    protected update(): void;
}
export declare class TokenizationError extends LiquidError {
    constructor(message: string, token: Token);
}
export declare class ParseError extends LiquidError {
    constructor(err: Error, token: Token);
}
export declare class RenderError extends LiquidError {
    constructor(err: Error, tpl: Template);
    static is(obj: any): obj is RenderError;
}
export declare class UndefinedVariableError extends LiquidError {
    constructor(err: Error, token: Token);
}
export declare class InternalUndefinedVariableError extends Error {
    variableName: string;
    constructor(variableName: string);
}
export declare class AssertionError extends Error {
    constructor(message: string);
}
export {};
