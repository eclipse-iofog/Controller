import { Drop } from '../drop/drop';
import { NormalizedFullOptions } from '../liquid-options';
import { Scope } from './scope';
export declare class Context {
    private scopes;
    private registers;
    environments: Scope;
    globals: Scope;
    sync: boolean;
    opts: NormalizedFullOptions;
    constructor(env?: object, opts?: NormalizedFullOptions, sync?: boolean);
    getRegister(key: string, defaultValue?: {}): any;
    setRegister(key: string, value: any): any;
    saveRegister(...keys: string[]): [string, any][];
    restoreRegister(keyValues: [string, any][]): void;
    getAll(): Scope;
    get(paths: string[]): object;
    getFromScope(scope: object, paths: string[] | string): object;
    push(ctx: object): number;
    pop(): import("./scope").PlainObject | Drop | undefined;
    bottom(): Scope;
    private findScope;
}
export declare function readProperty(obj: Scope, key: string): any;
