import { BaseModel, Cast, IsRequired, MinLength, MaxLength, Min, Max, ValidationError, ValidationErrorsList } from '../src';

class ValidatedModel extends BaseModel {
    @IsRequired()
    @Cast('string')
    username!: string;

    @MinLength(5)
    @MaxLength(10)
    @Cast('string')
    password!: string;

    @Min(18)
    @Max(99)
    @Cast('number')
    age!: number;
}

describe('Validation Decorators', () => {
    it('should pass cleanly for valid payloads', () => {
        const payload = {
            username: 'john_doe',
            password: 'mypassword', // 10 chars
            age: 30
        };

        const model = new ValidatedModel().assign(payload);
        expect(model.username).toBe('john_doe');
        expect(model.age).toBe(30);
    });

    it('should throw ValidationErrorsList if IsRequired property is missing', () => {
        expect(() => {
            new ValidatedModel().assign({ password: 'valid', age: 25 });
        }).toThrow(ValidationErrorsList);

        try {
            new ValidatedModel().assign({ password: 'valid', age: 25 });
        } catch (e: any) {
            expect(e).toBeInstanceOf(ValidationErrorsList);
            expect(e.errors[0].property).toBe('username');
            expect(e.errors[0].constraint).toBe('required');
            expect(e.errors[0].message).toBe("Property 'username' is required.");
        }
    });

    it('should throw ValidationErrorsList for MinLength constraint', () => {
        expect(() => {
            new ValidatedModel().assign({ username: 'john', password: 'shrt', age: 25 });
        }).toThrow(ValidationErrorsList);

        try {
            new ValidatedModel().assign({ username: 'john', password: 'shrt', age: 25 });
        } catch (e: any) {
            expect(e.errors[0].property).toBe('password');
            expect(e.errors[0].constraint).toBe('min-length');
            expect(e.errors[0].expected).toBe(5);
        }
    });

    it('should throw ValidationErrorsList for MaxLength constraint', () => {
        try {
            new ValidatedModel().assign({ username: 'john', password: 'thisistoolong', age: 25 });
        } catch (e: any) {
            expect(e.errors[0].property).toBe('password');
            expect(e.errors[0].constraint).toBe('max-length');
            expect(e.errors[0].expected).toBe(10);
        }
    });

    it('should throw ValidationErrorsList for Min numerical constraint', () => {
        try {
            new ValidatedModel().assign({ username: 'john', password: 'valid', age: 17 });
        } catch (e: any) {
            expect(e.errors[0].property).toBe('age');
            expect(e.errors[0].constraint).toBe('min');
            expect(e.errors[0].expected).toBe(18);
        }
    });

    it('should throw ValidationErrorsList for Max numerical constraint', () => {
        try {
            new ValidatedModel().assign({ username: 'john', password: 'valid', age: 100 });
        } catch (e: any) {
            expect(e.errors[0].property).toBe('age');
            expect(e.errors[0].constraint).toBe('max');
            expect(e.errors[0].expected).toBe(99);
        }
    });

    it('should aggregate multiple validation errors into a single ValidationErrorsList', () => {
        try {
            new ValidatedModel().assign({
                // missing username (Required)
                password: 'sh', // too short (MinLength 5)
                age: 120 // too high (Max 99)
            });
        } catch (e: any) {
            expect(e).toBeInstanceOf(ValidationErrorsList);
            expect(e.errors).toHaveLength(3);

            const propertiesFlagged = e.errors.map((err: ValidationError) => err.property);
            expect(propertiesFlagged).toContain('username');
            expect(propertiesFlagged).toContain('password');
            expect(propertiesFlagged).toContain('age');

            const usernameError = e.errors.find((err: ValidationError) => err.property === 'username');
            expect(usernameError.constraint).toBe('required');

            const passwordError = e.errors.find((err: ValidationError) => err.property === 'password');
            expect(passwordError.constraint).toBe('min-length');

            const ageError = e.errors.find((err: ValidationError) => err.property === 'age');
            expect(ageError.constraint).toBe('max');
        }
    });
});
