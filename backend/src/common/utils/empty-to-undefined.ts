import { Transform } from 'class-transformer';

/**
 * Decorator for optional string fields (dates especially) fed by native HTML
 * inputs. A blank <input type="date"> or <input type="text"> submits "" -
 * not undefined - which passes an @IsOptional() check (that only skips
 * undefined/null) and then fails whatever format validator follows it
 * (@IsDateString, etc). Apply this before the format validator so an empty
 * string is treated the same as an omitted field.
 */
export function EmptyToUndefined() {
  return Transform(({ value }) => (value === '' ? undefined : value));
}
