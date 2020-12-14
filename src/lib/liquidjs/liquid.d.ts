import { Context } from './context/context';
import { Template } from './template/template';
import { Render } from './render/render';
import Parser from './parser/parser';
import { TagImplOptions } from './template/tag/tag-impl-options';
import { TagMap } from './template/tag/tag-map';
import { FilterMap } from './template/filter/filter-map';
import { LiquidOptions, NormalizedFullOptions } from './liquid-options';
import { FilterImplOptions } from './template/filter/filter-impl-options';
export * from './types';
export declare class Liquid {
    options: NormalizedFullOptions;
    renderer: Render;
    parser: Parser;
    filters: FilterMap;
    tags: TagMap;
    private fs;
    constructor(opts?: LiquidOptions);
    parse(html: string, filepath?: string): Template[];
    _render(tpl: Template[], scope?: object, opts?: LiquidOptions, sync?: boolean): IterableIterator<any>;
    render(tpl: Template[], scope?: object, opts?: LiquidOptions): Promise<any>;
    renderSync(tpl: Template[], scope?: object, opts?: LiquidOptions): any;
    _parseAndRender(html: string, scope?: object, opts?: LiquidOptions, sync?: boolean): IterableIterator<any>;
    parseAndRender(html: string, scope?: object, opts?: LiquidOptions): Promise<any>;
    parseAndRenderSync(html: string, scope?: object, opts?: LiquidOptions): any;
    _parseFile(file: string, opts?: LiquidOptions, sync?: boolean): IterableIterator<any>;
    parseFile(file: string, opts?: LiquidOptions): Promise<Template[]>;
    parseFileSync(file: string, opts?: LiquidOptions): Template[];
    renderFile(file: string, ctx?: object, opts?: LiquidOptions): Promise<any>;
    renderFileSync(file: string, ctx?: object, opts?: LiquidOptions): any;
    _evalValue(str: string, ctx: Context): IterableIterator<any>;
    evalValue(str: string, ctx: Context): Promise<any>;
    evalValueSync(str: string, ctx: Context): any;
    registerFilter(name: string, filter: FilterImplOptions): void;
    registerTag(name: string, tag: TagImplOptions): void;
    plugin(plugin: (this: Liquid, L: typeof Liquid) => void): void;
    express(): (this: any, filePath: string, ctx: object, callback: (err: Error | null, rendered: string) => void) => void;
    private lookupError;
    /**
     * @deprecated use parseFile instead
     */
    getTemplate(file: string, opts?: LiquidOptions): Promise<Template[]>;
    /**
     * @deprecated use parseFileSync instead
     */
    getTemplateSync(file: string, opts?: LiquidOptions): Template[];
}
