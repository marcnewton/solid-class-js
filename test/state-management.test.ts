import { BaseModel, Cast, CastObject, CastArray, Exclude } from '../src';

class Settings extends BaseModel {
    @Cast('boolean')
    notificationsEnabled: boolean = true;
}

class UserProfile extends BaseModel {
    @Cast('string')
    username!: string;

    @Exclude()
    @Cast('string')
    passwordHash!: string;

    @CastObject(() => Settings)
    settings!: Settings;
}

describe('State Management (commit & reset)', () => {
    it('should natively retain commit baseline and reset correctly', () => {
        const payload = {
            username: 'alice',
            passwordHash: 'secret123',
            settings: { notificationsEnabled: false }
        };

        const user = new UserProfile().assign(payload);

        expect(user.username).toBe('alice');
        expect(user.passwordHash).toBe('secret123'); // Excluded from out but assigned safely
        expect(user.settings.notificationsEnabled).toBe(false);

        // Commit baseline
        user.commit();

        // Mutate properties
        user.assign({ username: 'bob', settings: { notificationsEnabled: true } });
        user.passwordHash = 'hacked456';

        expect(user.username).toBe('bob');
        expect(user.passwordHash).toBe('hacked456');
        expect(user.settings.notificationsEnabled).toBe(true);
        expect(user.toJSON().username).toBe('bob');
        expect(user.toJSON().passwordHash).toBeUndefined(); // Still correctly dropping exclusions 

        // Revert 
        user.reset();

        expect(user.username).toBe('alice');
        expect(user.passwordHash).toBe('secret123'); // Included back into class seamlessly correctly
        expect(user.settings.notificationsEnabled).toBe(false);
    });

    it('should cleanly zero-out uncommitted models on reset', () => {
        const user = new UserProfile().assign({
            username: 'charlie',
            passwordHash: 'secret789'
        });

        // No commit called
        user.reset();

        expect(user.username).toBeUndefined();
        expect(user.passwordHash).toBeUndefined();
        expect(user.settings).toBeUndefined();
    });

    it('should allow custom reset overrides that update the baseline', () => {
        const user = new UserProfile().assign({
            username: 'alice',
            passwordHash: 'secret123'
        });

        user.commit();

        user.reset({
            username: 'dave',
            passwordHash: 'newsecret'
        });

        // The state should now be dave
        expect(user.username).toBe('dave');
        expect(user.passwordHash).toBe('newsecret');

        // And the new baseline should be dave
        user.assign({ username: 'eve' });
        expect(user.username).toBe('eve');

        user.reset();
        expect(user.username).toBe('dave');
        expect(user.passwordHash).toBe('newsecret');
    });
});
