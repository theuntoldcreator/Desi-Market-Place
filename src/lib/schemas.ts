import * as z from 'zod';

export const listingSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters long.'),
  description: z.string().optional(),
  price: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number({ invalid_type_error: 'Price must be a number.' }).min(0, 'Price cannot be negative.')
  ),
  category: z.string(),
  location: z.string().min(1, 'Location is required.'),
  contact: z.string().min(1, 'Telegram username is required.'),
  condition: z.string().min(1, 'Condition is required.'),
}).superRefine((data, ctx) => {
  if (data.price > 0 && !data.category) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['category'],
      message: 'Category is required for paid items.',
    });
  }
});

export type ListingFormValues = z.infer<typeof listingSchema>;