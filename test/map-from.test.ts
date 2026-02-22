import { BaseModel, Cast, Default, IsRequired, MapFrom, ValidationErrorsList } from '../src';

class MappedModel extends BaseModel {
    @MapFrom('first_name')
    @IsRequired()
    @Cast('string')
    firstName!: string;

    @MapFrom('last_name')
    @Cast('string')
    lastName!: string;

    @MapFrom('is_active')
    @Default(true)
    @Cast('boolean')
    isActive!: boolean;

    @Cast('number')
    age!: number;
}

describe('@MapFrom Decorator functionality', () => {
    it('should successfully map snake_case property keys from a generic API payload', () => {
        const payload = {
            first_name: 'John',
            last_name: 'Doe',
            is_active: false,
            age: 30
        };

        const model = new MappedModel().assign(payload);

        expect(model.firstName).toBe('John');
        expect(model.lastName).toBe('Doe');
        expect(model.isActive).toBe(false);
        expect(model.age).toBe(30);
    });

    it('should fallback securely to the original property if the alias is missing', () => {
        const payload = {
            firstName: 'Alice', // Uses exact model key instead of mapped alias 'first_name'
            last_name: 'Smith'
        };

        const model = new MappedModel().assign(payload);

        expect(model.firstName).toBe('Alice');
        expect(model.lastName).toBe('Smith');
        expect(model.isActive).toBe(true); // Verifying that Default still runs smoothly!
    });

    it('should securely trigger @IsRequired errors if neither the alias nor original property is provided', () => {
        const payload = {
            last_name: 'Nobody'
        };

        expect(() => {
            new MappedModel().assign(payload);
        }).toThrow(ValidationErrorsList);

        try {
            new MappedModel().assign(payload);
        } catch (e: any) {
            expect(e.errors[0].property).toBe('firstName');
            expect(e.errors[0].constraint).toBe('required');
        }
    });

    it('should safely construct models mixing aliases and defaults without interference', () => {
        const payload = {
            first_name: 'Bob'
        };

        const model = new MappedModel().assign(payload);
        expect(model.firstName).toBe('Bob');
        expect(model.lastName).toBeUndefined();
        expect(model.isActive).toBe(true); // Defaults evaluated securely despite missing alias & original prop
    });
});
