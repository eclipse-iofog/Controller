import { Context } from '../../context/context';
/**
 * Key-Value Pairs Representing Tag Arguments
 * Example:
 *    For the markup `, foo:'bar', coo:2 reversed %}`,
 *    hash['foo'] === 'bar'
 *    hash['coo'] === 2
 *    hash['reversed'] === undefined
 */
export declare class Hash {
    hash: {
        [key: string]: any;
    };
    constructor(markup: string);
    render(ctx: Context): IterableIterator<any>;
}
