import { BaseModel, Cast, CastObject, CastArray, Exclude } from '../src';

class NestedPermission extends BaseModel {
    @Cast('string')
    role!: string;

    @Exclude('EXTERNAL_API')
    @Cast('boolean')
    isSuperAdmin!: boolean;
}

class User extends BaseModel {
    @Cast('string')
    username!: string;

    @Exclude() // Universal Exclusion
    @Cast('string')
    passwordHash!: string;

    @Exclude('GET', 'PUBLIC') // Contextual Exclusion
    @Cast('string')
    email!: string;

    @CastObject(() => NestedPermission)
    permissions!: NestedPermission;

    @CastArray(() => NestedPermission)
    history!: NestedPermission[];
}

describe('@Exclude and .toJSON Serialization', () => {

    let userModel: User;

    beforeEach(() => {
        const payload = {
            username: 'alice123',
            passwordHash: 'secret123',
            email: 'alice@example.com',
            permissions: {
                role: 'manager',
                isSuperAdmin: true
            },
            history: [
                { role: 'user', isSuperAdmin: false },
                { role: 'admin', isSuperAdmin: true }
            ]
        };
        userModel = new User().assign(payload);
    });

    it('should strip universal @Exclude properties from parameterless .toJSON() output', () => {
        const json = userModel.toJSON();

        expect(json.username).toBe('alice123');
        expect(json.email).toBe('alice@example.com');
        expect(json.passwordHash).toBeUndefined(); // Universally excluded
    });

    it('should strip explicitly matched contextual @Exclude properties when context matches', () => {
        const getPayload = userModel.toJSON('GET');
        expect(getPayload.username).toBe('alice123');
        expect(getPayload.passwordHash).toBeUndefined();
        expect(getPayload.email).toBeUndefined(); // Excluded because context = GET

        const postPayload = userModel.toJSON('POST');
        expect(postPayload.email).toBe('alice@example.com'); // Kept because context overrides POST
    });

    it('should recursively cascade contextual rules into deeply nested CastObject and CastArray targets', () => {
        const internalApiPayload = userModel.toJSON('INTERNAL_API');
        expect(internalApiPayload.permissions.isSuperAdmin).toBe(true);
        expect(internalApiPayload.history[1].isSuperAdmin).toBe(true);

        const externalApiPayload = userModel.toJSON('EXTERNAL_API');
        expect(externalApiPayload.permissions.isSuperAdmin).toBeUndefined(); // Cascade nested Exclude hook!
        expect(externalApiPayload.history[0].isSuperAdmin).toBeUndefined();
        expect(externalApiPayload.history[1].isSuperAdmin).toBeUndefined();
    });

    it('should automatically trigger .toJSON() dropping universal excludes natively inside JSON.stringify()', () => {
        const jsonString = JSON.stringify(userModel);
        const parsed = JSON.parse(jsonString);

        expect(parsed.username).toBe('alice123');
        expect(parsed.email).toBe('alice@example.com');
        expect(parsed.passwordHash).toBeUndefined();
    });
});
