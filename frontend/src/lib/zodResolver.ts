import { ZodError, type ZodIssue, type ZodTypeAny } from 'zod';
import { toNestErrors, validateFieldsNatively } from '@hookform/resolvers';
import { type ResolverOptions, type ResolverResult, type FieldValues } from 'react-hook-form';

/**
 * Zod v4-compatible resolver for React Hook Form.
 *
 * Zod v4's ZodError does not expose `.errors` array (issues live in
 * `.issues` object with numeric keys). The upstream
 * @hookform/resolvers/zod checks `Array.isArray(error?.errors)` which
 * returns false for Zod v4, causing the resolver to re-throw instead of
 * returning form errors. This wrapper handles Zod v4's error shape.
 */
export function zodResolverV4<T extends ZodTypeAny>(schema: T) {
  return async <TFieldValues extends FieldValues>(
    values: TFieldValues,
    _context: unknown,
    options: ResolverOptions<TFieldValues>
  ): Promise<ResolverResult<TFieldValues>> => {
    try {
      const data = await schema.parseAsync(values);
      options.shouldUseNativeValidation && validateFieldsNatively({}, options);
      return {
        errors: {} as Record<string, never>,
        values: data as TFieldValues,
      } as ResolverResult<TFieldValues>;
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        const issues = Object.values(error.issues) as ZodIssue[];
        const errors: Record<string, { message: string; type: string }> = {};
        for (const issue of issues) {
          const { code, message, path } = issue;
          const _path = path.join('.');
          if (!errors[_path]) {
            errors[_path] = { message, type: code };
          }
        }
        return {
          values: {},
          errors: toNestErrors(errors, options),
        } as ResolverResult<TFieldValues>;
      }
      throw error;
    }
  };
}
