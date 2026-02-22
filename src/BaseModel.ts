import { METADATA_KEYS, CastType, ClassFactory, EnrichCallback } from './decorators';

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

            const rawValue = data[propertyKey];
            if (rawValue === undefined || rawValue === null) {
                continue;
            }

            // Handle @Cast
            const castType: CastType | undefined = Reflect.getMetadata(METADATA_KEYS.CAST, this, propertyKey);
            if (castType) {
                (this as any)[propertyKey] = this.castPrimitive(rawValue, castType);
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
            // BUT wait, if a primitive is decorated, it gets mapped. If it's not decorated?
            // The instructions say "By defining the expected attributes, data types, and nested relationships in your classes... ignores any unexpected keys"
            // Wait, let's assume ALL defined properties are discovered through decorators. If a property in the class lacks a decorator, it's not technically registered.
            // Since all fields use decorators in the spec (e.g., @Cast('number') id!: number), we only process properties with metadata.
            // In the spec: @Cast, @CastObject, @CastArray, @Enrich. If none exist, we shouldn't map.
            // Actually, since we loop over `this.getAllProperties()`, we ONLY loop over decorated properties (they were added to PROPERTIES array).
            // So if a property has a decorator, but somehow doesn't match above, we ignore. This is fine.
        }

        return this;
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
