import { Liquid } from '../liquid';
import { ParseStream } from './parse-stream';
import { Tag } from '../template/tag/tag';
import { Output } from '../template/output';
import { HTML } from '../template/html';
import { Template } from '../template/template';
import { TopLevelToken } from '../tokens/toplevel-token';
export default class Parser {
    private liquid;
    constructor(liquid: Liquid);
    parse(tokens: TopLevelToken[]): Template[];
    parseToken(token: TopLevelToken, remainTokens: TopLevelToken[]): Tag | Output | HTML;
    parseStream(tokens: TopLevelToken[]): ParseStream<TopLevelToken>;
}
