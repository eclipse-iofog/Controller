import { TemplateImpl } from '../template/template-impl';
import { Template } from '../template/template';
import { HTMLToken } from '../tokens/html-token';
import { Context } from '../context/context';
import { Emitter } from '../render/emitter';
export declare class HTML extends TemplateImpl<HTMLToken> implements Template {
    private str;
    constructor(token: HTMLToken);
    render(ctx: Context, emitter: Emitter): IterableIterator<void>;
}
