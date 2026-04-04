import { METADATA_KEYS, CastType, ClassFactory, EnrichCallback, ValidatorFunction } from './decorators';
import { ValidationError, ValidationErrorsList } from './errors';
import { getMetadata, getOwnMetadata } from './metadata';

export class BaseModel {
    private __baseline?: string;

    /**
     * Assigns raw data properties to this instance, strictly respecting defined class properties,
     * data types, relationships, and enrichment callbacks.
     */
    public assign(data: Partial<this> | any, __validateRules: boolean = true): this {
        if (!data || typeof data !== 'object') {
            return this;
        }

        const properties = this.getAllProperties();
        const enrichedProperties: string[] = [];

        for (const propertyKey of properties) {
            // Handle @Enrich by deferring it until after basic properties are assimilated
            const enrichCallback: EnrichCallback | undefined = getMetadata(METADATA_KEYS.ENRICH, this, propertyKey);
            if (enrichCallback) {
                enrichedProperties.push(propertyKey);
                continue; // Enriched fields do not go through normal processing
            }

            // Handle @MapFrom Alias
            const mapFromAlias: string | undefined = getMetadata(METADATA_KEYS.MAP_FROM, this, propertyKey);
            let rawValue = mapFromAlias && data[mapFromAlias] !== undefined ? data[mapFromAlias] : data[propertyKey];

            // Handle @Default fallback if the value doesn't exist
            if (rawValue === undefined) {
                const defaultValue = getMetadata(METADATA_KEYS.DEFAULT, this, propertyKey);
                if (defaultValue !== undefined) {
                    rawValue = defaultValue;
                }
            }

            if (rawValue === undefined || rawValue === null) {
                continue;
            }

            // Handle @Cast
            const castType: CastType | undefined = getMetadata(METADATA_KEYS.CAST, this, propertyKey);
            if (castType) {
                (this as any)[propertyKey] = this.castPrimitive(rawValue, castType);
                continue;
            }

            // Handle @CastDate
            const castDate: boolean | undefined = getMetadata(METADATA_KEYS.CAST_DATE, this, propertyKey);
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
            const castObjectFn: ClassFactory | undefined = getMetadata(METADATA_KEYS.CAST_OBJECT, this, propertyKey);
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
            const castArrayFn: ClassFactory | undefined = getMetadata(METADATA_KEYS.CAST_ARRAY, this, propertyKey);
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

        // Post-process @Enrich hooks providing access to the newly mutated instance state merged with raw payload
        for (const propertyKey of enrichedProperties) {
            const enrichCallback: EnrichCallback | undefined = getMetadata(METADATA_KEYS.ENRICH, this, propertyKey);
            if (enrichCallback) {
                try {
                    // Merged scope ensures patch payloads like `.assign({ age: 25 })` preserve existing `this.firstName` states
                    const mergedScope = Object.assign({}, this, data);

                    // Track if the enrichment callback actually accesses any properties supplied in this specific patch payload.
                    // If it only accesses undefined/missing keys, the payload does not apply to this Enrichment rule natively!
                    let accessedDataKey = false;
                    const proxyScope = new Proxy(mergedScope, {
                        get(target, prop) {
                            if (prop in data) accessedDataKey = true;
                            return target[prop as keyof typeof target];
                        },
                        has(target, prop) {
                            if (prop in data) accessedDataKey = true;
                            return prop in target;
                        },
                        ownKeys(target) {
                            accessedDataKey = true;
                            return Reflect.ownKeys(target);
                        }
                    });

                    const result = enrichCallback(proxyScope);

                    // If this was a partial update (Patch) and the callback didn't access any relevant incoming data, 
                    // we skip assignment to preserve its current valid state (e.g. keeping `fullName` instead of overwriting with undefined)
                    if (accessedDataKey || Object.keys(data).length === 0) {
                        (this as any)[propertyKey] = result;
                    }

                } catch {
                    // If enrich fails entirely, we log undefined instead of corrupting execution
                    (this as any)[propertyKey] = undefined;
                }
            }
        }

        if (__validateRules) {
            this.validate();
        }

        return this;
    }

    /**
     * Snapshots the instance state entirely, establishing a baseline to revert back to if `reset()` is invoked.
     * Useful for capturing clean state after API GETs or successful Database POSTs.
     */
    public commit(): void {
        this.__baseline = JSON.stringify(this.__serialize(undefined, true));
    }

    /**
     * Rolls the internal instance data fully backward to the last explicitly `commit()`ted baseline.
     * If `commit()` was never called, it zeros out properties to their baseline initial definitions natively.
     * Optionally accepts an override object to set a new custom default state baseline.
     */
    public reset(override?: Partial<this> | any): void {
        const properties = this.getAllProperties();

        // Zero-out existing state to drop patch data before hydrating rollback
        for (const propertyKey of properties) {
            (this as any)[propertyKey] = undefined;
        }

        if (override) {
            this.assign(override, false);
            this.commit();
        } else if (this.__baseline) {
            // Re-assign explicitly without throwing nested validation constraint errors
            this.assign(JSON.parse(this.__baseline), false);
        }
    }

    /**
     * Serializes the model strictly into a clean Plain Old Javascript Object mapping mapped values.
     * Evaluates @Exclude targets stripping them safely conditionally based on executing `context`.
     */
    public toJSON(context?: string): Record<string, any> {
        return this.__serialize(context, false);
    }

    /**
     * Internal extraction of serialization avoiding global exposes natively capturing `@Exclude` when required.
     */
    private __serialize(context?: string, ignoreExclusions: boolean = false): Record<string, any> {
        const payload: Record<string, any> = {};
        const properties = this.getAllProperties();

        for (const propertyKey of properties) {
            if (!ignoreExclusions) {
                const excludeContexts: string[] | undefined = getMetadata(METADATA_KEYS.EXCLUDE, this, propertyKey);

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
            }

            let value = (this as any)[propertyKey];

            // If nested structure exists cascade context rules gracefully
            if (value instanceof BaseModel) {
                value = (value as any).__serialize(context, ignoreExclusions);
            } else if (Array.isArray(value)) {
                value = value.map(item => item instanceof BaseModel ? (item as any).__serialize(context, ignoreExclusions) : item);
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
            let rules: ValidatorFunction[] | undefined;
            let currentProto = Object.getPrototypeOf(this);

            while (currentProto && currentProto !== Object.prototype) {
                const protoRules: ValidatorFunction[] | undefined = getOwnMetadata(METADATA_KEYS.VALIDATION, currentProto, propertyKey);
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

            for (const validateFn of rules) {
                const error = validateFn(value, this, propertyKey);
                if (error) {
                    errors.push(error);
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
            const protoProps: string[] = getOwnMetadata(METADATA_KEYS.PROPERTIES, currentProto) || [];
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
