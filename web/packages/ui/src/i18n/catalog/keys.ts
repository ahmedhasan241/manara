import type ar from "./ar";

/**
 * Every message the product uses. The Arabic catalog is the list of record:
 * using a string in code that it doesn't contain is a type error, and so is
 * a language missing any of them.
 */
export type MessageKey = keyof typeof ar extends never ? string : keyof typeof ar;
