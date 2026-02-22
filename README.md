# Solid Class JS

> A robust TypeScript/JavaScript library for building SOLID, strictly-typed data models. Safely ingest, sanitize, and cast raw API responses into structured class instances.

**Solid Class JS** provides a foundational base class and a suite of TypeScript decorators to help you map messy, untrusted data to strict, predictable data models. By defining the expected attributes, data types, and nested relationships in your classes, `Solid Class JS` automatically handles type-casting, strips out unrecognized keys, and enriches your data payloads.

## Features

* **SOLID by Design:** Extend the core base class to keep your data models modular, single-purpose, and strictly defined.
* **Safe Data Assimilation:** The `assign` method takes raw JSON/objects, matches them against your defined properties, and ignores any unexpected keys to prevent prototype pollution or data leaks.
* **Automatic Type Casting:** Ensures incoming data matches your expected types (e.g., parsing numeric strings into actual JavaScript numbers).
* **Decorator-Driven:** Clean, declarative syntax using TypeScript experimental decorators to define types, default values, and data enrichment rules.
* **Recursive Structures:** Easily handle complex API responses with nested objects and arrays of class instances.

---

## Installation

Use your preferred package manager to install `solid-class-js`.

```bash
npm install solid-class-js
```

```bash
pnpm add solid-class-js
```

```bash
yarn add solid-class-js
```

```bash
bun add solid-class-js
```

> **Note:** Because `solid-class-js` relies on TypeScript decorators, you must enable `experimentalDecorators` and `emitDecoratorMetadata` in your `tsconfig.json`.

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

---

## Quick Start

### 1. Define Your Models

Extend the `BaseModel` to inherit the `assign` functionality. Use decorators to define your property types and nested structures.

```typescript
import { BaseModel, Cast, CastArray, Enrich } from 'solid-class-js';

// A nested class model
class Address extends BaseModel {
  @Cast('string')
  street!: string;

  @Cast('string')
  city!: string;
}

// Your primary data model
class User extends BaseModel {
  @Cast('number')
  id!: number;

  @Cast('string')
  username!: string;

  // Use decorators to handle arrays of other class instances
  @CastArray(() => Address)
  addresses!: Address[];

  // Use custom enrichment logic
  @Enrich((data) => data.firstName + ' ' + data.lastName)
  fullName!: string;
}
```

### 2. Ingest API Data

When you receive a payload from your API, simply instantiate your class and use the `assign` method. Unmapped keys will be safely ignored, and nested arrays will automatically instantiate their respective classes.

```typescript
// Messy API response with extra, unneeded data
const apiResponse = {
  id: "123", // Note: String type from API, but we want a Number
  username: "johndoe",
  firstName: "John",
  lastName: "Doe",
  secretToken: "xyz123", // We don't want this in our model!
  addresses: [
    { street: "123 Main St", city: "Manchester", extraKey: "ignore me" }
  ]
};

// Assimilate the data
const user = new User();
user.assign(apiResponse);

console.log(user.id); 
// Output: 123 (Successfully cast to a number)

console.log(user.secretToken); 
// Output: undefined (Ignored because it wasn't defined in the User class)

console.log(user.fullName); 
// Output: "John Doe" (Generated via the @Enrich decorator)

console.log(user.addresses[0] instanceof Address); 
// Output: true (Recursively mapped to the Address class)
```

---

## API Reference

### `BaseModel`
The core class your models must extend.
* `assign(data: Partial<this>): this` - Parses the incoming object, applying validation, casting, and decorator logic based on the class definition. Returns the mutated class instance for chaining.

### Decorators
* `@Cast(type: 'string' | 'number' | 'boolean')` - Forces the incoming value into the specified primitive type.
* `@CastDate()` - Instantiates a native `Date` object from numeric timestamps or valid ISO 8601 strings.
* `@CastObject(() => ClassName)` - Maps an incoming object to a specific `solid-class-js` model instance.
* `@CastArray(() => ClassName)` - Maps an incoming array of objects to an array of specific `solid-class-js` model instances.
* `@Enrich(callback)` - Computes a property's value dynamically based on the raw incoming data.
* `@MapFrom(alias: string)` - Ingests a missing property securely from an alternative API layout sequence (e.g. grabbing `first_name` to map onto `firstName`).
* `@Exclude(...contexts: string[])` - Hides a specific parameter universally `()` or explicitly from a strictly contextual evaluation sequence `('POST', 'PUT')` during serialization hooks.

### Validation Decorators
Use these to enforce strict value conditions on defined properties. If any conditions are not met during `assign()`, a structured `ValidationErrorsList` exception is thrown containing an `.errors` array with every failed `ValidationError`.
* `@Default(value: any)` - Assigns a fallback value before validation executing if the JSON payload is missing the property.
* `@IsRequired()` - Throws if the property is missing from the API payload (even after Defaults evaluate).
* `@MinLength(length: number)` - Enforces an array or string payload contains at least `length` items/characters.
* `@MaxLength(length: number)` - Enforces an array or string payload contains a maximum of `length` items/characters.
* `@Min(value: number)` - Enforces a primitive number is no less than `value`.
* `@Max(value: number)` - Enforces a primitive number is no greater than `value`.
* `@Matches(pattern: RegExp)` - Tests a parsed string against a regular expression.
* `@IsEmail()` - A strict check assuring the string satisfies a standard format for an Email Address.
* `@IsUrl()` - A strict check assuring the string resolves securely into a native URL instance.
* `@CustomValidator((value, instance) => boolean | string)` - Escapes structural checking completely, passing the property `value` and parent model `instance` to evaluate explicitly scoped generic business rules.

---

### `.toJSON(context?: string)`
By default, standard stringification securely calls `.toJSON()` across objects recursively. You may extract custom `.toJSON('POST')` payloads that securely iterate properties conditionally ignoring specific targets marked via explicitly identical context-mapped `@Exclude()` targets.

## Testing

To run the test suite, ensure you have installed the dev dependencies and run:

```bash
npm run test
```

---

## License
MIT