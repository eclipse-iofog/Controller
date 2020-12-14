import { Context } from '../context/context';
import { Template } from '../template/template';
import { Emitter } from './emitter';
export declare class Render {
    renderTemplates(templates: Template[], ctx: Context, emitter: Emitter): IterableIterator<any>;
}
