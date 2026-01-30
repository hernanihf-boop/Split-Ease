
import { User } from './types.ts';

export const getUserAvatar = (user?: User | { name: string; picture?: string; avatar_url?: string }) => {
  if (!user) return `https://api.dicebear.com/7.x/avataaars/svg?seed=unknown`;
  const photo = user.picture || user.avatar_url;
  if (photo) return photo;
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name)}&backgroundColor=b6e3f4`;
};
