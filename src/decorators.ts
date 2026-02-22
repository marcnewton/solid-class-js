import 'reflect-metadata';

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

export interface ValidationRule {
    type: 'required' | 'min-length' | 'max-length' | 'min' | 'max' | 'matches' | 'email' | 'url' | 'custom';
    value?: any;
}

function registerProperty(target: any, propertyKey: string) {
    const properties: string[] = Reflect.getOwnMetadata(METADATA_KEYS.PROPERTIES, target) || [];
    if (!properties.includes(propertyKey)) {
        properties.push(propertyKey);
        Reflect.defineMetadata(METADATA_KEYS.PROPERTIES, properties, target);
    }
}

export function Cast(type: CastType): PropertyDecorator {
    return function (target: any, propertyKey: string | symbol) {
        if (typeof propertyKey === 'string') {
            registerProperty(target, propertyKey);
            Reflect.defineMetadata(METADATA_KEYS.CAST, type, target, propertyKey);
        }
    };
}

export function CastObject(classFn: ClassFactory): PropertyDecorator {
    return function (target: any, propertyKey: string | symbol) {
        if (typeof propertyKey === 'string') {
            registerProperty(target, propertyKey);
            Reflect.defineMetadata(METADATA_KEYS.CAST_OBJECT, classFn, target, propertyKey);
        }
    };
}

export function CastArray(classFn: ClassFactory): PropertyDecorator {
    return function (target: any, propertyKey: string | symbol) {
        if (typeof propertyKey === 'string') {
            registerProperty(target, propertyKey);
            Reflect.defineMetadata(METADATA_KEYS.CAST_ARRAY, classFn, target, propertyKey);
        }
    };
}

export function Enrich(callback: EnrichCallback): PropertyDecorator {
    return function (target: any, propertyKey: string | symbol) {
        if (typeof propertyKey === 'string') {
            registerProperty(target, propertyKey);
            Reflect.defineMetadata(METADATA_KEYS.ENRICH, callback, target, propertyKey);
        }
    };
}

function addValidationRule(target: any, propertyKey: string, rule: ValidationRule) {
    registerProperty(target, propertyKey);
    const rules: ValidationRule[] = Reflect.getMetadata(METADATA_KEYS.VALIDATION, target, propertyKey) || [];
    rules.push(rule);
    Reflect.defineMetadata(METADATA_KEYS.VALIDATION, rules, target, propertyKey);
}

export function IsRequired(): PropertyDecorator {
    return function (target: any, propertyKey: string | symbol) {
        if (typeof propertyKey === 'string') {
            addValidationRule(target, propertyKey, { type: 'required' });
        }
    };
}

export function MinLength(length: number): PropertyDecorator {
    return function (target: any, propertyKey: string | symbol) {
        if (typeof propertyKey === 'string') {
            addValidationRule(target, propertyKey, { type: 'min-length', value: length });
        }
    };
}

export function MaxLength(length: number): PropertyDecorator {
    return function (target: any, propertyKey: string | symbol) {
        if (typeof propertyKey === 'string') {
            addValidationRule(target, propertyKey, { type: 'max-length', value: length });
        }
    };
}

export function Min(value: number): PropertyDecorator {
    return function (target: any, propertyKey: string | symbol) {
        if (typeof propertyKey === 'string') {
            addValidationRule(target, propertyKey, { type: 'min', value });
        }
    };
}

export function Max(value: number): PropertyDecorator {
    return function (target: any, propertyKey: string | symbol) {
        if (typeof propertyKey === 'string') {
            addValidationRule(target, propertyKey, { type: 'max', value });
        }
    };
}

export function Matches(pattern: RegExp): PropertyDecorator {
    return function (target: any, propertyKey: string | symbol) {
        if (typeof propertyKey === 'string') {
            addValidationRule(target, propertyKey, { type: 'matches', value: pattern });
        }
    };
}

export function IsEmail(): PropertyDecorator {
    return function (target: any, propertyKey: string | symbol) {
        if (typeof propertyKey === 'string') {
            addValidationRule(target, propertyKey, { type: 'email' });
        }
    };
}

export function IsUrl(): PropertyDecorator {
    return function (target: any, propertyKey: string | symbol) {
        if (typeof propertyKey === 'string') {
            addValidationRule(target, propertyKey, { type: 'url' });
        }
    };
}

export function Default(value: any): PropertyDecorator {
    return function (target: any, propertyKey: string | symbol) {
        if (typeof propertyKey === 'string') {
            registerProperty(target, propertyKey);
            Reflect.defineMetadata(METADATA_KEYS.DEFAULT, value, target, propertyKey);
        }
    };
}

export function CastDate(): PropertyDecorator {
    return function (target: any, propertyKey: string | symbol) {
        if (typeof propertyKey === 'string') {
            registerProperty(target, propertyKey);
            Reflect.defineMetadata(METADATA_KEYS.CAST_DATE, true, target, propertyKey);
        }
    };
}

export function MapFrom(alias: string): PropertyDecorator {
    return function (target: any, propertyKey: string | symbol) {
        if (typeof propertyKey === 'string') {
            registerProperty(target, propertyKey);
            Reflect.defineMetadata(METADATA_KEYS.MAP_FROM, alias, target, propertyKey);
        }
    };
}

export function CustomValidator(callback: CustomValidatorCallback): PropertyDecorator {
    return function (target: any, propertyKey: string | symbol) {
        if (typeof propertyKey === 'string') {
            addValidationRule(target, propertyKey, { type: 'custom', value: callback });
        }
    };
}

export function Exclude(...contexts: string[]): PropertyDecorator {
    return function (target: any, propertyKey: string | symbol) {
        if (typeof propertyKey === 'string') {
            registerProperty(target, propertyKey);
            Reflect.defineMetadata(METADATA_KEYS.EXCLUDE, contexts, target, propertyKey);
        }
    };
}
