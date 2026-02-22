import { BaseModel, Cast, IsRequired, MinLength, MaxLength, Min, Max, ValidationError } from '../src';

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

    it('should throw ValidationError if IsRequired property is missing', () => {
        expect(() => {
            new ValidatedModel().assign({ password: 'valid', age: 25 });
        }).toThrow(ValidationError);

        try {
            new ValidatedModel().assign({ password: 'valid', age: 25 });
        } catch (e: any) {
            expect(e.property).toBe('username');
            expect(e.constraint).toBe('required');
            expect(e.message).toBe("Property 'username' is required.");
        }
    });

    it('should throw ValidationError for MinLength constraint', () => {
        expect(() => {
            new ValidatedModel().assign({ username: 'john', password: 'shrt', age: 25 });
        }).toThrow(ValidationError);

        try {
            new ValidatedModel().assign({ username: 'john', password: 'shrt', age: 25 });
        } catch (e: any) {
            expect(e.property).toBe('password');
            expect(e.constraint).toBe('min-length');
            expect(e.expected).toBe(5);
        }
    });

    it('should throw ValidationError for MaxLength constraint', () => {
        try {
            new ValidatedModel().assign({ username: 'john', password: 'thisistoolong', age: 25 });
        } catch (e: any) {
            expect(e.property).toBe('password');
            expect(e.constraint).toBe('max-length');
            expect(e.expected).toBe(10);
        }
    });

    it('should throw ValidationError for Min numerical constraint', () => {
        try {
            new ValidatedModel().assign({ username: 'john', password: 'valid', age: 17 });
        } catch (e: any) {
            expect(e.property).toBe('age');
            expect(e.constraint).toBe('min');
            expect(e.expected).toBe(18);
        }
    });

    it('should throw ValidationError for Max numerical constraint', () => {
        try {
            new ValidatedModel().assign({ username: 'john', password: 'valid', age: 100 });
        } catch (e: any) {
            expect(e.property).toBe('age');
            expect(e.constraint).toBe('max');
            expect(e.expected).toBe(99);
        }
    });
});
