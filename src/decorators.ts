import 'reflect-metadata';

export const METADATA_KEYS = {
  CAST: Symbol('solid-class:cast'),
  CAST_OBJECT: Symbol('solid-class:cast-object'),
  CAST_ARRAY: Symbol('solid-class:cast-array'),
  ENRICH: Symbol('solid-class:enrich'),
  PROPERTIES: Symbol('solid-class:properties'),
};

export type CastType = 'string' | 'number' | 'boolean';
export type ClassConstructor<T = any> = new (...args: any[]) => T;
export type ClassFactory = () => ClassConstructor;
export type EnrichCallback = (data: any) => any;

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
