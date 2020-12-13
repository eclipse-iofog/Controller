import { Drop } from '../drop/drop';
export interface PlainObject {
    [key: string]: any;
    toLiquid?: () => any;
}
export declare type Scope = PlainObject | Drop;
