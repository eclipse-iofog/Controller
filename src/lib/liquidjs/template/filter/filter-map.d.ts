import { FilterImplOptions } from './filter-impl-options';
import { Filter } from './filter';
import { FilterArg } from '../../parser/filter-arg';
import { Liquid } from '../../liquid';
export declare class FilterMap {
    private readonly strictFilters;
    private readonly liquid;
    private impls;
    constructor(strictFilters: boolean, liquid: Liquid);
    get(name: string): FilterImplOptions;
    set(name: string, impl: FilterImplOptions): void;
    create(name: string, args: FilterArg[]): Filter;
}
