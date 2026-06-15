import { z } from 'zod'

export const ProfilePreferencesSchema = z.object({
  bar_preference: z.boolean(),
  pub_preference: z.boolean(),
  automatic_zoom: z.boolean().default(true),
})

export const ProfileSchema = z.object({
  id: z.string(),
  is_onboarded: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  preferences: ProfilePreferencesSchema,
  age: z.number(),
  liked_places: z.array(z.string()),
  role: z.enum(['user', 'admin', 'owner']),
  avatar_url: z.string().nullable(),
})

export type ProfilePreferences = z.infer<typeof ProfilePreferencesSchema>
export type Profile = z.infer<typeof ProfileSchema>
