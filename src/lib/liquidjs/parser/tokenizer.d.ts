import { IdentifierToken } from '../tokens/identifier-token';
import { OperatorToken } from '../tokens/operator-token';
import { TopLevelToken } from '../tokens/toplevel-token';
import { FilterArg } from './filter-arg';
import { FilterToken } from '../tokens/filter-token';
import { HashToken } from '../tokens/hash-token';
import { QuotedToken } from '../tokens/quoted-token';
import { HTMLToken } from '../tokens/html-token';
import { TagToken } from '../tokens/tag-token';
import { Token } from '../tokens/token';
import { RangeToken } from '../tokens/range-token';
import { ValueToken } from '../tokens/value-token';
import { OutputToken } from '../tokens/output-token';
import { TokenizationError } from '../util/error';
import { NormalizedFullOptions } from '../liquid-options';
export declare class Tokenizer {
    private input;
    private file;
    p: number;
    N: number;
    private rawBeginAt;
    constructor(input: string, file?: string);
    readExpression(): IterableIterator<Token>;
    readOperator(): OperatorToken | undefined;
    readFilters(): FilterToken[];
    readFilter(): FilterToken | null;
    readFilterArg(): FilterArg | undefined;
    readTopLevelTokens(options?: NormalizedFullOptions): TopLevelToken[];
    readTopLevelToken(options: NormalizedFullOptions): TopLevelToken;
    readHTMLToken(options: NormalizedFullOptions): HTMLToken;
    readTagToken(options: NormalizedFullOptions): TagToken;
    readOutputToken(options: NormalizedFullOptions): OutputToken;
    readEndrawOrRawContent(options: NormalizedFullOptions): HTMLToken | TagToken;
    mkError(msg: string, begin: number): TokenizationError;
    snapshot(begin?: number): string;
    /**
     * @deprecated
     */
    readWord(): IdentifierToken;
    readIdentifier(): IdentifierToken;
    readHashes(): HashToken[];
    readHash(): HashToken | undefined;
    remaining(): string;
    advance(i?: number): void;
    end(): boolean;
    readTo(end: string): number;
    readValue(): ValueToken | undefined;
    readRange(): RangeToken | undefined;
    readValueOrThrow(): ValueToken;
    readQuoted(): QuotedToken | undefined;
    readFileName(): IdentifierToken;
    match(word: string): boolean;
    rmatch(pattern: string): boolean;
    peekType(n?: number): number;
    peek(n?: number): string;
    skipBlank(): void;
}
