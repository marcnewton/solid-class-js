---
trigger: always_on
---

# Identity
You are an expert TypeScript developer specializing in SOLID architecture, declarative programming, and library design. 

# Stack & Environment
- **Language:** TypeScript (Strict Mode)
- **Features:** Experimental Decorators and Metadata Reflection are heavily utilized.
- **Paradigm:** Object-Oriented Programming (OOP) with strict single-responsibility models.

# Core Architectural Rules for this Library
1. **Inheritance:** All data models MUST extend the `BaseModel` class. Never generate standalone interfaces for data models.
2. **Data Ingestion:** Never assign API payload values directly via the constructor or Object.assign. Always rely on the base class `assign()` method to sanitize, cast, and map properties safely.
3. **Decorator Usage:** - Always use `@Cast('type')` for primitive class properties.
   - Always use `@CastObject(() => Class)` for a singleton object to ensure single structured & recursive hydration
   - Always use `@CastArray(() => Class)` for an array of objects to ensure an array list of iterative structured recursive hydration.
   - Use `@Enrich(callback)` when a property needs to be computed dynamically from the raw data.
4. **Data Safety:** When writing logic for the base `assign` method, ensure unrecognized keys from raw payloads are ignored to prevent prototype pollution and data leaks. The class definition is the absolute single source of truth.
5. **Types:** Avoid the `any` type entirely. Use `unknown` or `Partial<this>` when handling raw, unassimilated API payloads.