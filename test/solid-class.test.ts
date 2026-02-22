import { BaseModel, Cast, CastArray, CastObject, Enrich } from '../src';

class Address extends BaseModel {
    @Cast('string')
    street!: string;

    @Cast('string')
    city!: string;
}

class User extends BaseModel {
    @Cast('number')
    id!: number;

    @Cast('string')
    username!: string;

    @CastArray(() => Address)
    addresses!: Address[];

    @CastObject(() => Address)
    primaryAddress!: Address;

    @Enrich((data) => data.firstName + ' ' + data.lastName)
    fullName!: string;
}

describe('Solid Class JS', () => {
    it('should cast primitives, enrich, and map nested arrays safely ignoring unrecognized keys', () => {
        const apiResponse = {
            id: '123',
            username: 'johndoe',
            firstName: 'John',
            lastName: 'Doe',
            secretToken: 'xyz123',
            primaryAddress: { street: '456 Market St', city: 'London', secretToken: 'abc' },
            addresses: [
                { street: '123 Main St', city: 'Manchester', extraKey: 'ignore me' },
                { street: '789 High St', city: 'Liverpool' },
            ],
        };

        const user = new User();
        user.assign(apiResponse);

        expect(user.id).toBe(123);
        expect(user.username).toBe('johndoe');
        expect((user as any).secretToken).toBeUndefined();
        expect(user.fullName).toBe('John Doe');

        expect(user.primaryAddress).toBeInstanceOf(Address);
        expect(user.primaryAddress.street).toBe('456 Market St');
        expect((user.primaryAddress as any).secretToken).toBeUndefined();

        expect(Array.isArray(user.addresses)).toBe(true);
        expect(user.addresses[0]).toBeInstanceOf(Address);
        expect(user.addresses[0].street).toBe('123 Main St');
        expect((user.addresses[0] as any).extraKey).toBeUndefined();
    });

    it('should safely ignore corrupted payload formats and edge cases', () => {
        // A completely broken payload according to expectations
        const brokenApiResponse = {
            id: {}, // Expects number, given object
            username: ['fake'], // Expects string, given array
            // missing expected scalar value completely
            primaryAddress: [1, 2, 3], // Expects Address object, given array
            addresses: 'not-an-array', // Expects Address array, given string
        };

        const user = new User();
        user.assign(brokenApiResponse);

        expect(user.id).toBeUndefined(); // Object rejected for Number
        expect(user.username).toBe('["fake"]'); // Array stringified
        expect(user.primaryAddress).toBeUndefined(); // Array rejected instead of mapping to object
        expect(user.addresses).toBeUndefined(); // String rejected instead of mapping to array
    });

    it('should strictly map arrays of objects and ignore elements of incorrect types', () => {
        const corruptArrayResponse = {
            addresses: [
                { street: 'Valid St', city: 'London' },
                null, // Should be ignored
                'Broken Element', // Should be ignored
                { street: 'Second Valid St', city: 'Manchester' },
                123, // Should be ignored
            ],
        };

        const user = new User();
        user.assign(corruptArrayResponse);

        expect(user.addresses.length).toBe(2);
        expect(user.addresses[0]).toBeInstanceOf(Address);
        expect(user.addresses[1]).toBeInstanceOf(Address);
        expect(user.addresses[0].street).toBe('Valid St');
        expect(user.addresses[1].street).toBe('Second Valid St');
    });

    it('should implicitly reject incorrect primitive assignments', () => {
        const user = new User();
        user.assign({
            id: [{}], // Should reject arrays being cast to a Number
            username: { "fake": "data" }, // Objects Stringified
        });

        expect(user.id).toBeUndefined(); // Array wrapper of an object fails primitive number typecast
        expect(user.username).toBe('{"fake":"data"}');
    });
});
