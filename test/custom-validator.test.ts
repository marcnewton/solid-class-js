import { BaseModel, Cast, CustomValidator, IsRequired, ValidationErrorsList } from '../src';

class EventModel extends BaseModel {
    @IsRequired()
    @Cast('string')
    eventName!: string;

    @IsRequired()
    @Cast('number')
    startDate!: number;

    @CustomValidator((value: number, instance: EventModel) => {
        if (!instance.startDate) return true; // Let required validator handle missing dependencies natively
        if (value <= instance.startDate) {
            return `End date (${value}) must be strictly after the start date (${instance.startDate}).`;
        }
        return true;
    })
    @IsRequired()
    @Cast('number')
    endDate!: number;

    @CustomValidator((value: number) => {
        return value > 0; // Fallback strictly checks false evaluates generic message
    })
    @Cast('number')
    capacity!: number;
}

describe('@CustomValidator Decorator', () => {

    it('should pass cleanly when custom validators evaluate to true', () => {
        const payload = {
            eventName: 'Tech Conference',
            startDate: 100,
            endDate: 200,
            capacity: 50
        };

        const model = new EventModel().assign(payload);
        expect(model.eventName).toBe('Tech Conference');
        expect(model.endDate).toBe(200);
        expect(model.startDate).toBe(100);
        expect(model.capacity).toBe(50);
    });

    it('should throw ValidationErrorsList logging explicit custom Error messages', () => {
        const payload = {
            eventName: 'Time Travel Seminar',
            startDate: 500,
            endDate: 400, // Invalid: Ends before it starts
            capacity: 10
        };

        expect(() => {
            new EventModel().assign(payload);
        }).toThrow(ValidationErrorsList);

        try {
            new EventModel().assign(payload);
        } catch (e: any) {
            expect(e.errors[0].property).toBe('endDate');
            expect(e.errors[0].constraint).toBe('custom');
            expect(e.errors[0].message).toBe('End date (400) must be strictly after the start date (500).');
        }
    });

    it('should throw ValidationErrorsList logging a generic Message if a custom validator strictly returns `false`', () => {
        const payload = {
            eventName: 'Empty Room Event',
            startDate: 100,
            endDate: 200,
            capacity: -5 // Invalid: Less than 0
        };

        expect(() => {
            new EventModel().assign(payload);
        }).toThrow(ValidationErrorsList);

        try {
            new EventModel().assign(payload);
        } catch (e: any) {
            expect(e.errors[0].property).toBe('capacity');
            expect(e.errors[0].constraint).toBe('custom');
            expect(e.errors[0].message).toBe("Property 'capacity' failed custom validation.");
        }
    });

});
