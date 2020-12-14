export declare function isString(value: any): value is string;
export declare function isFunction(value: any): value is Function;
export declare function promisify<T1, T2>(fn: (arg1: T1, cb: (err: Error | null, result: T2) => void) => void): (arg1: T1) => Promise<T2>;
export declare function promisify<T1, T2, T3>(fn: (arg1: T1, arg2: T2, cb: (err: Error | null, result: T3) => void) => void): (arg1: T1, arg2: T2) => Promise<T3>;
export declare function stringify(value: any): string;
export declare function toValue(value: any): any;
export declare function isNumber(value: any): value is number;
export declare function toLiquid(value: any): any;
export declare function isNil(value: any): boolean;
export declare function isArray(value: any): value is any[];
export declare function forOwn<T>(object: {
    [key: string]: T;
} | undefined, iteratee: ((val: T, key: string, obj: {
    [key: string]: T;
}) => boolean | void)): {
    [key: string]: T;
};
export declare function last<T>(arr: T[]): T;
export declare function last(arr: string): string;
export declare function isObject(value: any): value is object;
export declare function range(start: number, stop: number, step?: number): number[];
export declare function padStart(str: any, length: number, ch?: string): any;
export declare function padEnd(str: any, length: number, ch?: string): any;
export declare function pad(str: any, length: number, ch: string, add: (str: string, ch: string) => string): any;
export declare function identify<T>(val: T): T;
export declare function snakeCase(str: string): string;
export declare function changeCase(str: string): string;
export declare function ellipsis(str: string, N: number): string;
export declare function caseInsensitiveCompare(a: any, b: any): 1 | 0 | -1;
