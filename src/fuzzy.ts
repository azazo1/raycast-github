const FUZZY_BOUNDARY = /[\s\-_/.]/;

export function fuzzyScore(value: string, query: string): number {
  const normalizedQuery = query.trim().toLowerCase().replace(/\s+/g, "");
  if (!normalizedQuery) {
    return 0;
  }

  const normalizedValue = value.toLowerCase();
  let valueIndex = 0;
  let previousIndex = -1;
  let score = 0;

  for (const char of normalizedQuery) {
    const matchIndex = normalizedValue.indexOf(char, valueIndex);
    if (matchIndex === -1) {
      return -1;
    }

    if (previousIndex !== -1 && matchIndex === previousIndex + 1) {
      score += 10;
    } else if (
      matchIndex === 0 ||
      FUZZY_BOUNDARY.test(normalizedValue[matchIndex - 1] ?? "")
    ) {
      score += 6;
    } else {
      score += 1;
    }

    score += Math.max(0, 4 - (matchIndex - valueIndex));
    previousIndex = matchIndex;
    valueIndex = matchIndex + 1;
  }

  score += Math.max(0, 8 - normalizedValue.length);
  return score;
}
