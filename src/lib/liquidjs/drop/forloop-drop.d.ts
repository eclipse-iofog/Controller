import { Drop } from './drop';
export declare class ForloopDrop extends Drop {
    protected i: number;
    length: number;
    constructor(length: number);
    next(): void;
    index0(): number;
    index(): number;
    first(): boolean;
    last(): boolean;
    rindex(): number;
    rindex0(): number;
    valueOf(): string;
}
