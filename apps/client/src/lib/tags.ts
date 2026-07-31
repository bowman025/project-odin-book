export const extractHashtags = (content: string): string[] => {
  if (!content) return [];

  const hashtagRegex = /#(\w+)/g;
  const matches = content.matchAll(hashtagRegex);

  const tagsSet = new Set<string>();

  for (const match of matches) {
    if (match[1]) {
      tagsSet.add(match[1].toLowerCase());
    }
  }

  return Array.from(tagsSet);
};
