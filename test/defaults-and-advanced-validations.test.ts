import { BaseModel, Cast, Default, MinLength, MaxLength, Matches, IsEmail, IsUrl, IsRequired, ValidationError, ValidationErrorsList } from '../src';

class AdvancedValidationModel extends BaseModel {
    @IsRequired()
    @Default('AnonymousUser')
    @Cast('string')
    username!: string;

    @IsEmail()
    @Cast('string')
    email!: string;

    @Matches(/^[0-9]{3}-[0-9]{2}-[0-9]{4}$/)
    @Cast('string')
    ssn!: string;

    @IsUrl()
    @Cast('string')
    website!: string;

    @Default(10)
    @Cast('number')
    score!: number;
}

describe('Advanced Validations and Defaults', () => {
    it('should assign default values when properties are missing', () => {
        const payload = {
            email: 'test@example.com',
            website: 'https://solidjs.com'
        };

        const model = new AdvancedValidationModel().assign(payload);
        expect(model.username).toBe('AnonymousUser');
        expect(model.score).toBe(10);
        expect(model.email).toBe('test@example.com');
        expect(model.website).toBe('https://solidjs.com');
    });

    it('should override default values when explicit values are provided', () => {
        const payload = {
            username: 'JohnDoe',
            email: 'john.doe@example.com',
            score: 99
        };

        const model = new AdvancedValidationModel().assign(payload);
        expect(model.username).toBe('JohnDoe');
        expect(model.score).toBe(99);
    });

    it('should validate Email patterns successfully', () => {
        const validPayload = { email: 'valid.user+tag@domain.co.uk' };
        const model = new AdvancedValidationModel().assign(validPayload);
        expect(model.email).toBe('valid.user+tag@domain.co.uk');
    });

    it('should throw ValidationErrorsList for invalid email addresses', () => {
        const invalidPayload = { email: 'invalid-email-string' };
        expect(() => {
            new AdvancedValidationModel().assign(invalidPayload);
        }).toThrow(ValidationErrorsList);
    });

    it('should validate Regex patterns successfully', () => {
        const validPayload = { ssn: '123-45-6789' };
        const model = new AdvancedValidationModel().assign(validPayload);
        expect(model.ssn).toBe('123-45-6789');
    });

    it('should throw ValidationErrorsList for broken Regex patterns', () => {
        const invalidPayload = { ssn: '12-345-678' };
        try {
            new AdvancedValidationModel().assign(invalidPayload);
        } catch (e: any) {
            expect(e).toBeInstanceOf(ValidationErrorsList);
            expect(e.errors[0]).toBeInstanceOf(ValidationError);
            expect(e.errors[0].property).toBe('ssn');
            expect(e.errors[0].constraint).toBe('matches');
        }
    });

    it('should validate URL strings successfully', () => {
        const validPayload = { website: 'http://localhost:3000/path?query=yes' };
        const model = new AdvancedValidationModel().assign(validPayload);
        expect(model.website).toBe('http://localhost:3000/path?query=yes');
    });

    it('should throw ValidationErrorsList for malformed URLs', () => {
        const invalidPayload = { website: 'javascript:alert(1)' };
        expect(() => {
            new AdvancedValidationModel().assign(invalidPayload);
        }).toThrow(ValidationErrorsList);
    });
});
