import { db } from '@project-odin-book/db';

export const fetchTagSuggestions = async (
  queryStr: string,
): Promise<string[]> => {
  const cleanQuery = queryStr.trim().toLowerCase();
  if (!cleanQuery) return [];

  const matches = await db.tag.findMany({
    where: {
      name: {
        contains: cleanQuery,
      },
    },
    take: 5,
    select: { name: true },
    orderBy: { name: 'asc' },
  });

  return matches.map((tag) => tag.name);
};
