import { z } from 'zod';

const environmentSchema = z.object({
  ADMIN_API_KEY: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3000),
});

export type Environment = z.infer<typeof environmentSchema>;

export function readEnvironment(input: Record<string, string | undefined>): Environment {
  return environmentSchema.parse(input);
}
