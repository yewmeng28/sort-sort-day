import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { createDexieRepositories } from './dexie/dexieRepositories';
import type { Repositories } from './repositories';

const RepoContext = createContext<Repositories | null>(null);

/** Swap the `repositories` prop (e.g. for a synced or in-memory implementation) without touching any UI. */
export function RepoProvider({ repositories, children }: { repositories?: Repositories; children: ReactNode }) {
  const repos = useMemo(() => repositories ?? createDexieRepositories(), [repositories]);
  return <RepoContext.Provider value={repos}>{children}</RepoContext.Provider>;
}

export function useRepos(): Repositories {
  const repos = useContext(RepoContext);
  if (!repos) throw new Error('useRepos must be used inside <RepoProvider>');
  return repos;
}

// useLiveQuery re-runs whenever the underlying Dexie tables change, so lists stay reactive.
export const useRooms = () => {
  const { rooms } = useRepos();
  return useLiveQuery(() => rooms.list(), [rooms]);
};

export const useSpaces = () => {
  const { spaces } = useRepos();
  return useLiveQuery(() => spaces.list(), [spaces]);
};

export const useCategories = () => {
  const { categories } = useRepos();
  return useLiveQuery(() => categories.list(), [categories]);
};

export const useItems = () => {
  const { items } = useRepos();
  return useLiveQuery(() => items.list(), [items]);
};
