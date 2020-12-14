import { ValueToken } from '../tokens/value-token';
declare type KeyValuePair = [string?, ValueToken?];
export declare type FilterArg = ValueToken | KeyValuePair;
export declare function isKeyValuePair(arr: FilterArg): arr is KeyValuePair;
export {};
