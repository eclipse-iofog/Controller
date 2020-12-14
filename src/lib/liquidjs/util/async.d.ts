declare type resolver = (x?: any) => any;
interface Thenable {
    then(resolve: resolver, reject?: resolver): Thenable;
    catch(reject: resolver): Thenable;
}
export declare function toThenable(val: IterableIterator<any> | Thenable | any): Thenable;
export declare function toPromise(val: IterableIterator<any> | Thenable | any): Promise<any>;
export declare function toValue(val: IterableIterator<any> | Thenable | any): any;
export {};
