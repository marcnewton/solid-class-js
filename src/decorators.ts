import { defineMetadata, getMetadata, getOwnMetadata } from './metadata';
import { ValidationError } from './errors';

export const METADATA_KEYS = {
    CAST: Symbol('solid-class:cast'),
    CAST_OBJECT: Symbol('solid-class:cast-object'),
    CAST_ARRAY: Symbol('solid-class:cast-array'),
    ENRICH: Symbol('solid-class:enrich'),
    PROPERTIES: Symbol('solid-class:properties'),
    VALIDATION: Symbol('solid-class:validation'),
    DEFAULT: Symbol('solid-class:default'),
    CAST_DATE: Symbol('solid-class:cast-date'),
    MAP_FROM: Symbol('solid-class:map-from'),
    EXCLUDE: Symbol('solid-class:exclude')
};

export type CastType = 'string' | 'number' | 'boolean';
export type ClassConstructor<T = any> = new (...args: any[]) => T;
export type ClassFactory = () => ClassConstructor;
export type EnrichCallback = (data: any) => any;
export type CustomValidatorCallback = (value: any, instance: any) => boolean | string;
export type ValidatorFunction = (value: any, instance: any, propertyKey: string) => ValidationError | null;

// Keep ValidationRule as an alias to ValidatorFunction for backwards compatibility if exported externally
export type ValidationRule = ValidatorFunction;

function registerProperty(target: any, propertyKey: string) {
    const properties: string[] = getOwnMetadata(METADATA_KEYS.PROPERTIES, target) || [];
    if (!properties.includes(propertyKey)) {
        properties.push(propertyKey);
        defineMetadata(METADATA_KEYS.PROPERTIES, properties, target);
    }
}

export function Cast(type: CastType): PropertyDecorator {
    return function (target: any, propertyKey: string | symbol) {
        if (typeof propertyKey === 'string') {
            registerProperty(target, propertyKey);
            defineMetadata(METADATA_KEYS.CAST, type, target, propertyKey);
        }
    };
}

export function CastObject(classFn: ClassFactory): PropertyDecorator {
    return function (target: any, propertyKey: string | symbol) {
        if (typeof propertyKey === 'string') {
            registerProperty(target, propertyKey);
            defineMetadata(METADATA_KEYS.CAST_OBJECT, classFn, target, propertyKey);
        }
    };
}

export function CastArray(classFn: ClassFactory): PropertyDecorator {
    return function (target: any, propertyKey: string | symbol) {
        if (typeof propertyKey === 'string') {
            registerProperty(target, propertyKey);
            defineMetadata(METADATA_KEYS.CAST_ARRAY, classFn, target, propertyKey);
        }
    };
}

export function Enrich(callback: EnrichCallback): PropertyDecorator {
    return function (target: any, propertyKey: string | symbol) {
        if (typeof propertyKey === 'string') {
            registerProperty(target, propertyKey);
            defineMetadata(METADATA_KEYS.ENRICH, callback, target, propertyKey);
        }
    };
}

function addValidationRule(target: any, propertyKey: string, rule: ValidatorFunction) {
    registerProperty(target, propertyKey);
    const rules: ValidatorFunction[] = getMetadata(METADATA_KEYS.VALIDATION, target, propertyKey) || [];
    rules.push(rule);
    defineMetadata(METADATA_KEYS.VALIDATION, rules, target, propertyKey);
}

export function IsRequired(): PropertyDecorator {
    return function (target: any, propertyKey: string | symbol) {
        if (typeof propertyKey === 'string') {
            addValidationRule(target, propertyKey, (value: any, instance: any, prop: string) => {
                if (value === undefined || value === null || value === '') {
                    return new ValidationError(prop, 'required', undefined, `Property '${prop}' is required.`);
                }
                return null;
            });
        }
    };
}

export function MinLength(length: number): PropertyDecorator {
    return function (target: any, propertyKey: string | symbol) {
        if (typeof propertyKey === 'string') {
            addValidationRule(target, propertyKey, (value: any, instance: any, prop: string) => {
                if (value !== undefined && value !== null && value !== '') {
                    if (typeof value === 'string' || Array.isArray(value)) {
                        if (value.length < length) {
                            return new ValidationError(prop, 'min-length', length, `Property '${prop}' must be at least ${length} characters/items long.`);
                        }
                    }
                }
                return null;
            });
        }
    };
}

export function MaxLength(length: number): PropertyDecorator {
    return function (target: any, propertyKey: string | symbol) {
        if (typeof propertyKey === 'string') {
            addValidationRule(target, propertyKey, (value: any, instance: any, prop: string) => {
                if (value !== undefined && value !== null && value !== '') {
                    if (typeof value === 'string' || Array.isArray(value)) {
                        if (value.length > length) {
                            return new ValidationError(prop, 'max-length', length, `Property '${prop}' must not exceed ${length} characters/items.`);
                        }
                    }
                }
                return null;
            });
        }
    };
}

export function Min(minVal: number): PropertyDecorator {
    return function (target: any, propertyKey: string | symbol) {
        if (typeof propertyKey === 'string') {
            addValidationRule(target, propertyKey, (value: any, instance: any, prop: string) => {
                if (value !== undefined && value !== null && value !== '') {
                    if (typeof value === 'number' && value < minVal) {
                        return new ValidationError(prop, 'min', minVal, `Property '${prop}' must not be less than ${minVal}.`);
                    }
                }
                return null;
            });
        }
    };
}

export function Max(maxVal: number): PropertyDecorator {
    return function (target: any, propertyKey: string | symbol) {
        if (typeof propertyKey === 'string') {
            addValidationRule(target, propertyKey, (value: any, instance: any, prop: string) => {
                if (value !== undefined && value !== null && value !== '') {
                    if (typeof value === 'number' && value > maxVal) {
                        return new ValidationError(prop, 'max', maxVal, `Property '${prop}' must not be greater than ${maxVal}.`);
                    }
                }
                return null;
            });
        }
    };
}

export function Matches(pattern: RegExp): PropertyDecorator {
    return function (target: any, propertyKey: string | symbol) {
        if (typeof propertyKey === 'string') {
            addValidationRule(target, propertyKey, (value: any, instance: any, prop: string) => {
                if (value !== undefined && value !== null && value !== '') {
                    if (typeof value === 'string') {
                        if (!pattern.test(value)) {
                            return new ValidationError(prop, 'matches', pattern, `Property '${prop}' must match the given pattern.`);
                        }
                    }
                }
                return null;
            });
        }
    };
}

export function IsEmail(): PropertyDecorator {
    return function (target: any, propertyKey: string | symbol) {
        if (typeof propertyKey === 'string') {
            addValidationRule(target, propertyKey, (value: any, instance: any, prop: string) => {
                if (value !== undefined && value !== null && value !== '') {
                    if (typeof value === 'string') {
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!emailRegex.test(value)) {
                            return new ValidationError(prop, 'email', undefined, `Property '${prop}' must be a valid email address.`);
                        }
                    }
                }
                return null;
            });
        }
    };
}

export function IsUrl(): PropertyDecorator {
    return function (target: any, propertyKey: string | symbol) {
        if (typeof propertyKey === 'string') {
            addValidationRule(target, propertyKey, (value: any, instance: any, prop: string) => {
                if (value !== undefined && value !== null && value !== '') {
                    if (typeof value === 'string') {
                        try {
                            const url = new URL(value);
                            if (url.protocol !== 'http:' && url.protocol !== 'https:') {
                                throw new Error('Invalid URL protocol');
                            }
                        } catch {
                            return new ValidationError(prop, 'url', undefined, `Property '${prop}' must be a valid URL.`);
                        }
                    }
                }
                return null;
            });
        }
    };
}

export function Default(value: any): PropertyDecorator {
    return function (target: any, propertyKey: string | symbol) {
        if (typeof propertyKey === 'string') {
            registerProperty(target, propertyKey);
            defineMetadata(METADATA_KEYS.DEFAULT, value, target, propertyKey);
        }
    };
}

export function CastDate(): PropertyDecorator {
    return function (target: any, propertyKey: string | symbol) {
        if (typeof propertyKey === 'string') {
            registerProperty(target, propertyKey);
            defineMetadata(METADATA_KEYS.CAST_DATE, true, target, propertyKey);
        }
    };
}

export function MapFrom(alias: string): PropertyDecorator {
    return function (target: any, propertyKey: string | symbol) {
        if (typeof propertyKey === 'string') {
            registerProperty(target, propertyKey);
            defineMetadata(METADATA_KEYS.MAP_FROM, alias, target, propertyKey);
        }
    };
}

export function CustomValidator(callback: CustomValidatorCallback): PropertyDecorator {
    return function (target: any, propertyKey: string | symbol) {
        if (typeof propertyKey === 'string') {
            addValidationRule(target, propertyKey, (value: any, instance: any, prop: string) => {
                if (value !== undefined && value !== null && value !== '') {
                    const isValidOrError = callback(value, instance);
                    if (isValidOrError === false) {
                        return new ValidationError(prop, 'custom', undefined, `Property '${prop}' failed custom validation.`);
                    } else if (typeof isValidOrError === 'string') {
                        return new ValidationError(prop, 'custom', undefined, isValidOrError);
                    }
                }
                return null;
            });
        }
    };
}

export function Exclude(...contexts: string[]): PropertyDecorator {
    return function (target: any, propertyKey: string | symbol) {
        if (typeof propertyKey === 'string') {
            registerProperty(target, propertyKey);
            defineMetadata(METADATA_KEYS.EXCLUDE, contexts, target, propertyKey);
        }
    };
}
