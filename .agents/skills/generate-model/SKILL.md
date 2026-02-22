# Skill: generate-model

**Description:** Generates a new strictly typed data model extending BaseModel with the correct declarative decorators. Use this when the user asks to create a model from an API response or JSON payload.

## Instructions:
1. **Analyze Input:** Review the provided JSON payload or API schema to infer the data types and nested structures.
2. **Identify Relationships:** If the payload contains nested objects or arrays of objects, create separate supporting classes for those structures first.
3. **Generate Class:** Create the requested TypeScript class extending `BaseModel`.
4. **Apply Decorators:**
   - Map string, number, and boolean types using `@Cast()`.
   - Map nested sub-classes using `@CastObject()` and `@CastArray()`.
5. **Output:** Save the generated model in the appropriate `src/models/` directory and ensure it exports correctly. Do not write validation logic inside the class; rely entirely on the decorators.