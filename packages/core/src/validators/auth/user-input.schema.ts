import { z } from "zod";

// Imported by client components (CrudForm): depend on zod only.

const NAME_MAX_LENGTH = 200;
const EMAIL_MAX_LENGTH = 254; // RFC 5321 path limit

/** Body of `POST /api/users` and `PUT /api/users/[id]`. */
export const userInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(NAME_MAX_LENGTH),
  email: z.string().trim().toLowerCase().max(EMAIL_MAX_LENGTH).pipe(z.email("Enter a valid email address")),
});

export type UserInput = z.output<typeof userInputSchema>;
