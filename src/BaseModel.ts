import { METADATA_KEYS, CastType, ClassFactory, EnrichCallback, ValidationRule } from './decorators';
import { ValidationError, ValidationErrorsList } from './errors';

export class BaseModel {
    /**
     * Assigns raw data properties to this instance, strictly respecting defined class properties,
     * data types, relationships, and enrichment callbacks.
     */
    public assign(data: Partial<this> | any): this {
        if (!data || typeof data !== 'object') {
            return this;
        }

        const properties = this.getAllProperties();

        for (const propertyKey of properties) {
            // Handle @Enrich first as it computes value dynamically based on entire raw data payload
            const enrichCallback: EnrichCallback | undefined = Reflect.getMetadata(METADATA_KEYS.ENRICH, this, propertyKey);
            if (enrichCallback) {
                try {
                    // The enrich callback receives the raw unassimilated data payload
                    (this as any)[propertyKey] = enrichCallback(data);
                } catch {
                    // If enrich fails, safely ignore or leave generic error
                    (this as any)[propertyKey] = undefined;
                }
                continue; // Enriched fields do not go through normal processing
            }

            // Handle @MapFrom Alias
            const mapFromAlias: string | undefined = Reflect.getMetadata(METADATA_KEYS.MAP_FROM, this, propertyKey);
            let rawValue = mapFromAlias && data[mapFromAlias] !== undefined ? data[mapFromAlias] : data[propertyKey];

            // Handle @Default fallback if the value doesn't exist
            if (rawValue === undefined) {
                const defaultValue = Reflect.getMetadata(METADATA_KEYS.DEFAULT, this, propertyKey);
                if (defaultValue !== undefined) {
                    rawValue = defaultValue;
                }
            }

            if (rawValue === undefined || rawValue === null) {
                continue;
            }

            // Handle @Cast
            const castType: CastType | undefined = Reflect.getMetadata(METADATA_KEYS.CAST, this, propertyKey);
            if (castType) {
                (this as any)[propertyKey] = this.castPrimitive(rawValue, castType);
                continue;
            }

            // Handle @CastDate
            const castDate: boolean | undefined = Reflect.getMetadata(METADATA_KEYS.CAST_DATE, this, propertyKey);
            if (castDate) {
                if (typeof rawValue === 'string' || typeof rawValue === 'number') {
                    const parsedDate = new Date(rawValue);
                    if (!isNaN(parsedDate.getTime())) {
                        (this as any)[propertyKey] = parsedDate;
                    } else {
                        (this as any)[propertyKey] = undefined;
                    }
                } else if (rawValue instanceof Date && !isNaN(rawValue.getTime())) {
                    (this as any)[propertyKey] = rawValue;
                } else {
                    (this as any)[propertyKey] = undefined;
                }
                continue;
            }

            // Handle @CastObject
            const castObjectFn: ClassFactory | undefined = Reflect.getMetadata(METADATA_KEYS.CAST_OBJECT, this, propertyKey);
            if (castObjectFn) {
                // Must be an object, not null, and not an Array
                if (typeof rawValue === 'object' && rawValue !== null && !Array.isArray(rawValue)) {
                    const ClassConstructor = castObjectFn();
                    const instance = new ClassConstructor();
                    if (instance instanceof BaseModel) {
                        (this as any)[propertyKey] = instance.assign(rawValue);
                    } else {
                        Object.assign(instance, rawValue);
                        (this as any)[propertyKey] = instance;
                    }
                }
                continue;
            }

            // Handle @CastArray
            const castArrayFn: ClassFactory | undefined = Reflect.getMetadata(METADATA_KEYS.CAST_ARRAY, this, propertyKey);
            if (castArrayFn) {
                // Must be an actual Array
                if (Array.isArray(rawValue)) {
                    const ClassConstructor = castArrayFn();
                    const validInstances = rawValue
                        .filter((item: any) => typeof item === 'object' && item !== null && !Array.isArray(item))
                        .map((item: any) => {
                            const instance = new ClassConstructor();
                            if (instance instanceof BaseModel) {
                                return instance.assign(item);
                            }
                            Object.assign(instance, item);
                            return instance;
                        });

                    (this as any)[propertyKey] = validInstances;
                }
                continue;
            }

            // If no decorator matched, we DO NOT assign the property because the spec states:
            // "Unmapped keys will be safely ignored to prevent prototype pollution or data leaks."
        }

        this.validate();

        return this;
    }

    /**
     * Serializes the model strictly into a clean Plain Old Javascript Object mapping mapped values.
     * Evaluates @Exclude targets stripping them safely conditionally based on executing `context`.
     */
    public toJSON(context?: string): Record<string, any> {
        const payload: Record<string, any> = {};
        const properties = this.getAllProperties();

        for (const propertyKey of properties) {
            const excludeContexts: string[] | undefined = Reflect.getMetadata(METADATA_KEYS.EXCLUDE, this, propertyKey);

            if (excludeContexts) {
                // If the decorator is called bare @Exclude() it drops everywhere seamlessly
                if (excludeContexts.length === 0) {
                    continue;
                }

                // If contexts are provided, evaluate if this environment matches
                if (context && excludeContexts.includes(context)) {
                    continue;
                }
            }

            let value = (this as any)[propertyKey];

            // If nested structure exists cascade context rules gracefully
            if (value instanceof BaseModel) {
                value = value.toJSON(context);
            } else if (Array.isArray(value)) {
                value = value.map(item => item instanceof BaseModel ? item.toJSON(context) : item);
            }

            payload[propertyKey] = value;
        }

        return payload;
    }

    /**
     * Evaluates properties against decorated structural constraints after data assimilation.
     */
    private validate(): void {
        const properties = this.getAllProperties();
        const errors: ValidationError[] = [];

        for (const propertyKey of properties) {
            // Check the current prototype and parents for validation rules map
            let rules: ValidationRule[] | undefined;
            let currentProto = Object.getPrototypeOf(this);

            while (currentProto && currentProto !== Object.prototype) {
                const protoRules: ValidationRule[] | undefined = Reflect.getOwnMetadata(METADATA_KEYS.VALIDATION, currentProto, propertyKey);
                if (protoRules) {
                    rules = protoRules;
                    break;
                }
                currentProto = Object.getPrototypeOf(currentProto);
            }

            const value = (this as any)[propertyKey];

            if (!rules) {
                continue;
            }

            for (const rule of rules) {
                if (rule.type === 'required' && (value === undefined || value === null || value === '')) {
                    errors.push(new ValidationError(propertyKey, rule.type, undefined, `Property '${propertyKey}' is required.`));
                }

                if (value !== undefined && value !== null && value !== '') {
                    if (rule.type === 'min-length') {
                        if (typeof value === 'string' || Array.isArray(value)) {
                            if (value.length < rule.value) {
                                errors.push(new ValidationError(
                                    propertyKey,
                                    rule.type,
                                    rule.value,
                                    `Property '${propertyKey}' must be at least ${rule.value} characters/items long.`
                                ));
                            }
                        }
                    }

                    if (rule.type === 'max-length') {
                        if (typeof value === 'string' || Array.isArray(value)) {
                            if (value.length > rule.value) {
                                errors.push(new ValidationError(
                                    propertyKey,
                                    rule.type,
                                    rule.value,
                                    `Property '${propertyKey}' must not exceed ${rule.value} characters/items.`
                                ));
                            }
                        }
                    }

                    if (rule.type === 'min') {
                        if (typeof value === 'number' && value < rule.value) {
                            errors.push(new ValidationError(
                                propertyKey,
                                rule.type,
                                rule.value,
                                `Property '${propertyKey}' must not be less than ${rule.value}.`
                            ));
                        }
                    }

                    if (rule.type === 'max') {
                        if (typeof value === 'number' && value > rule.value) {
                            errors.push(new ValidationError(
                                propertyKey,
                                rule.type,
                                rule.value,
                                `Property '${propertyKey}' must not be greater than ${rule.value}.`
                            ));
                        }
                    }

                    if (rule.type === 'matches') {
                        if (typeof value === 'string') {
                            const regex = rule.value as RegExp;
                            if (!regex.test(value)) {
                                errors.push(new ValidationError(
                                    propertyKey,
                                    rule.type,
                                    rule.value,
                                    `Property '${propertyKey}' must match the given pattern.`
                                ));
                            }
                        }
                    }

                    if (rule.type === 'email') {
                        if (typeof value === 'string') {
                            // extremely basic email validation that works for 99% of simple string checking usecases
                            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                            if (!emailRegex.test(value)) {
                                errors.push(new ValidationError(
                                    propertyKey,
                                    rule.type,
                                    undefined,
                                    `Property '${propertyKey}' must be a valid email address.`
                                ));
                            }
                        }
                    }

                    if (rule.type === 'url') {
                        if (typeof value === 'string') {
                            try {
                                const url = new URL(value);
                                if (url.protocol !== 'http:' && url.protocol !== 'https:') {
                                    throw new Error('Invalid URL protocol');
                                }
                            } catch {
                                errors.push(new ValidationError(
                                    propertyKey,
                                    rule.type,
                                    undefined,
                                    `Property '${propertyKey}' must be a valid URL.`
                                ));
                            }
                        }
                    }

                    if (rule.type === 'custom') {
                        const isValidOrError = rule.value(value, this);
                        if (isValidOrError === false) {
                            errors.push(new ValidationError(
                                propertyKey,
                                rule.type,
                                undefined,
                                `Property '${propertyKey}' failed custom validation.`
                            ));
                        } else if (typeof isValidOrError === 'string') {
                            errors.push(new ValidationError(
                                propertyKey,
                                rule.type,
                                undefined,
                                isValidOrError
                            ));
                        }
                    }
                }
            }
        }

        if (errors.length > 0) {
            throw new ValidationErrorsList(errors);
        }
    }

    /**
     * Walk the prototype chain to collect all decorated property keys
     */
    private getAllProperties(): string[] {
        const properties = new Set<string>();
        let currentProto = Object.getPrototypeOf(this);

        while (currentProto && currentProto !== Object.prototype) {
            const protoProps: string[] = Reflect.getOwnMetadata(METADATA_KEYS.PROPERTIES, currentProto) || [];
            protoProps.forEach((prop) => properties.add(prop));
            currentProto = Object.getPrototypeOf(currentProto);
        }

        return Array.from(properties);
    }

    /**
     * Cast a raw value into a specific primitive type
     */
    private castPrimitive(value: any, type: CastType): any {
        switch (type) {
            case 'string':
                if (typeof value === 'object' && value !== null) {
                    try {
                        return JSON.stringify(value);
                    } catch {
                        return undefined;
                    }
                }
                return String(value);

            case 'number': {
                // Refuse to implicitly convert Arrays or Objects to numbers.
                if (typeof value === 'object' || Array.isArray(value) || value === '') {
                    return undefined;
                }
                const num = Number(value);
                return isNaN(num) ? undefined : num;
            }

            case 'boolean':
                // Objects/Arrays should not blindly truthify.
                if (typeof value === 'object' || Array.isArray(value)) {
                    return undefined;
                }
                if (value === 'false' || value === '0') return false;
                if (value === 'true' || value === '1') return true;
                return Boolean(value);

            default:
                return value;
        }
    }
}
