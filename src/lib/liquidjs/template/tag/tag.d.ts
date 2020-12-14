import { Liquid } from '../../liquid';
import { TemplateImpl } from '../../template/template-impl';
import { Emitter, Context, TagToken, Template, TopLevelToken } from '../../types';
export declare class Tag extends TemplateImpl<TagToken> implements Template {
    name: string;
    private impl;
    constructor(token: TagToken, tokens: TopLevelToken[], liquid: Liquid);
    render(ctx: Context, emitter: Emitter): IterableIterator<any>;
}
