import { z } from 'zod'

const strongPassword = z
  .string()
  .min(8, 'Min 8 characters')
  .regex(/[A-Z]/, 'Must contain an uppercase letter')
  .regex(/[a-z]/, 'Must contain a lowercase letter')
  .regex(/[0-9]/, 'Must contain a number')
  .regex(/[^A-Za-z0-9]/, 'Must contain a special character')

const birthDateRefinement = (val: string) => {
  if (!val) return false
  const born = new Date(val)
  if (isNaN(born.getTime())) return false
  const today = new Date()
  const threshold = new Date(
    today.getFullYear() - 18,
    today.getMonth(),
    today.getDate(),
  )
  return born <= threshold
}

export const LoginSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

export const SignupStep1Schema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: strongPassword,
})

export const SignupStep2Schema = z.object({
  display_name: z
    .string()
    .trim()
    .min(2, 'Min 2 characters')
    .max(50, 'Max 50 characters'),
  birth_date: z.string().refine((val) => {
    if (!val) return false
    const born = new Date(val)
    if (isNaN(born.getTime())) return false
    const today = new Date()
    const threshold = new Date(
      today.getFullYear() - 18,
      today.getMonth(),
      today.getDate(),
    )
    return born <= threshold
  }, 'Must be 18 or older'),
  phone: z
    .string()
    .trim()
    .refine(
      (val) => val === '' || /^\+?[1-9]\d{6,14}$/.test(val),
      'Enter a valid phone number',
    )
    .optional(),
})

export const SignupSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: strongPassword,
  display_name: z
    .string()
    .trim()
    .min(2, 'Min 2 characters')
    .max(50, 'Max 50 characters'),
  birth_date: z.string().refine(birthDateRefinement, 'Must be 18 or older'),
  pub_preference: z.boolean(),
  bar_preference: z.boolean(),
})

export type LoginValues = z.infer<typeof LoginSchema>
export type SignupStep1Values = z.infer<typeof SignupStep1Schema>
export type SignupStep2Values = z.infer<typeof SignupStep2Schema>
export type SignupValues = z.infer<typeof SignupSchema>
