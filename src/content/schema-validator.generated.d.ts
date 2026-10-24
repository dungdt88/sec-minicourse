// Types for the generated validator (scripts/build-validator.ts).
import type { ErrorObject } from 'ajv/dist/2020';

export declare const validate: ((data: unknown) => boolean) & { errors?: ErrorObject[] | null };
export default validate;
