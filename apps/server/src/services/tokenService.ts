import { db } from '@project-odin-book/db';

export const updateRefreshToken = async (
  id: string,
  hashedToken: string | null,
): Promise<void> => {
  await db.user.update({
    where: { id },
    data: { refreshToken: hashedToken },
  });
};
