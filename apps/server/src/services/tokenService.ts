import { db } from '@project-odin-book/db';

export const updateRefreshToken = async (options: {
  id: string;
  hashedToken: string | null;
}): Promise<void> => {
  const { id, hashedToken } = options;
  await db.user.update({
    where: { id },
    data: { refreshToken: hashedToken },
  });
};
