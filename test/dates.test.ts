import { BaseModel, CastDate, IsRequired, ValidationError, ValidationErrorsList } from '../src';

class DateModel extends BaseModel {
    @IsRequired()
    @CastDate()
    createdAt!: Date;

    @CastDate()
    updatedAt!: Date;
}

describe('@CastDate Decorator Validation', () => {

    it('should successfully parse an ISO String into a JS Date', () => {
        const payload = {
            createdAt: '2026-02-22T01:17:58Z'
        };
        const model = new DateModel().assign(payload);

        expect(model.createdAt).toBeInstanceOf(Date);
        expect(model.createdAt.toISOString()).toBe('2026-02-22T01:17:58.000Z');
        expect(model.updatedAt).toBeUndefined(); // Missing optional property maps cleanly
    });

    it('should successfully parse a numerical Epoch timestamps into a JS Date', () => {
        const epoch = Date.now();
        const payload = {
            createdAt: epoch
        };

        const model = new DateModel().assign(payload);
        expect(model.createdAt).toBeInstanceOf(Date);
        expect(model.createdAt.getTime()).toBe(epoch);
    });

    it('should skip unparseable bad date strings returning undefined, causing @IsRequired to throw ValidationError', () => {
        const payload = {
            createdAt: 'I-am-Not-A-Real-Date-String'
        };

        expect(() => {
            new DateModel().assign(payload);
        }).toThrow(ValidationErrorsList);

        try {
            new DateModel().assign(payload);
        } catch (e: any) {
            expect(e).toBeInstanceOf(ValidationErrorsList);
            expect(e.errors[0].property).toBe('createdAt');
            expect(e.errors[0].constraint).toBe('required'); // Unparsed == undefined = failed requirement
        }
    });

    it('should quietly drop unparseable bad data on Optional date parameters', () => {
        const payload = {
            createdAt: new Date().toISOString(),
            updatedAt: 'Broken-Missing-Date-String-Payload'
        };

        const model = new DateModel().assign(payload);
        expect(model.createdAt).toBeInstanceOf(Date);
        expect(model.updatedAt).toBeUndefined(); // Invalid data string drops gracefully
    });
});
