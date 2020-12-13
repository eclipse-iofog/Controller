import { Context } from '../../context/context';
import { FilterImplOptions } from './filter-impl-options';
import { FilterArg } from '../../parser/filter-arg';
import { Liquid } from '../../liquid';
export declare class Filter {
    name: string;
    args: FilterArg[];
    private impl;
    private liquid;
    constructor(name: string, impl: FilterImplOptions, args: FilterArg[], liquid: Liquid);
    render(value: any, context: Context): IterableIterator<any>;
}
