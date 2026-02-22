export class ValidationError extends Error {
    public property: string;
    public constraint: string;
    public expected: any;

    constructor(property: string, constraint: string, expected: any, message: string) {
        super(message);
        this.name = 'ValidationError';
        this.property = property;
        this.constraint = constraint;
        this.expected = expected;
    }
}

export class ValidationErrorsList extends Error {
    public errors: ValidationError[];

    constructor(errors: ValidationError[]) {
        super(`Validation failed with ${errors.length} errors.`);
        this.name = 'ValidationErrorsList';
        this.errors = errors;
    }
}
