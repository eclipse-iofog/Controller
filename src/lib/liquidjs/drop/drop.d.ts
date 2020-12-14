export declare abstract class Drop {
    valueOf(): any;
    liquidMethodMissing(key: string): Promise<string | undefined> | string | undefined;
}
