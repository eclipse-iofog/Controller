import { TagImplOptions } from './tag-impl-options';
export declare class TagMap {
    private impls;
    get(name: string): TagImplOptions;
    set(name: string, impl: TagImplOptions): void;
}
