import { FilterMap } from '../template/filter/filter-map';
import { Filter } from './filter/filter';
import { Context } from '../context/context';
import { ValueToken } from '../tokens/value-token';
import { Liquid } from '../liquid';
export declare class Value {
    private readonly filterMap;
    readonly filters: Filter[];
    readonly initial?: ValueToken;
    /**
     * @param str the value to be valuated, eg.: "foobar" | truncate: 3
     */
    constructor(str: string, filterMap: FilterMap, liquid: Liquid);
    value(ctx: Context): IterableIterator<any>;
}
