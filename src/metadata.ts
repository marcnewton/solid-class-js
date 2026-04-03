// A global registry for class metadata, mimicking reflect-metadata without prototype pollution or dependencies
const metadataRegistry = new WeakMap<any, Map<symbol, Map<string | symbol, any>>>();

const CLASS_LEVEL_SYMBOL = Symbol.for('solid-class:class-level');

/**
 * Defines metadata on a target prototype based on a specific key.
 */
export function defineMetadata(key: symbol, value: any, target: any, propertyKey?: string | symbol): void {
    let targetMetadata = metadataRegistry.get(target);
    if (!targetMetadata) {
        targetMetadata = new Map();
        metadataRegistry.set(target, targetMetadata);
    }

    let keyMetadata = targetMetadata.get(key);
    if (!keyMetadata) {
        keyMetadata = new Map();
        targetMetadata.set(key, keyMetadata);
    }

    keyMetadata.set(propertyKey || CLASS_LEVEL_SYMBOL, value);
}

/**
 * Retrieves metadata directly attached to the target object, disregarding inheritance.
 */
export function getOwnMetadata(key: symbol, target: any, propertyKey?: string | symbol): any {
    const targetMetadata = metadataRegistry.get(target);
    if (!targetMetadata) return undefined;

    const keyMetadata = targetMetadata.get(key);
    if (!keyMetadata) return undefined;

    return keyMetadata.get(propertyKey || CLASS_LEVEL_SYMBOL);
}

/**
 * Retrieves metadata attached to the target object, walking up the prototype chain if undefined on the direct target.
 */
export function getMetadata(key: symbol, target: any, propertyKey?: string | symbol): any {
    let currentTarget = target;
    while (currentTarget && currentTarget !== Object.prototype) {
        const value = getOwnMetadata(key, currentTarget, propertyKey);
        if (value !== undefined) {
            return value;
        }
        currentTarget = Object.getPrototypeOf(currentTarget);
    }
    return undefined;
}
