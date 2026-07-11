import { DefaultOptions, QueryClient, UseMutationOptions } from '@tanstack/react-query'

export const queryConfig = {
  queries: {
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 1000 * 60,
  },
} satisfies DefaultOptions

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: queryConfig,
  })

export type ApiFnReturnType<FnType extends (...args: unknown[]) => Promise<unknown>> =
  Awaited<ReturnType<FnType>>

export type QueryConfig<T extends (...args: unknown[]) => unknown> = Omit<
  ReturnType<T>,
  'queryKey' | 'queryFn'
>

export type MutationConfig<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  MutationFnType extends (...args: any) => Promise<any>,
> = UseMutationOptions<
  Awaited<ReturnType<MutationFnType>>,
  Error,
  Parameters<MutationFnType>[0]
>
