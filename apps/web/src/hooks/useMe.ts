import { useQuery } from '@tanstack/react-query';
import { getMe, type MeProfile } from '../api/client';

export function useMe() {
  const query = useQuery<{ data: MeProfile }>({ queryKey: ['me'], queryFn: getMe, staleTime: 5 * 60 * 1000, retry: false });
  return { ...query, profile: query.data?.data ?? null };
}
