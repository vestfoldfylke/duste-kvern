/** Pluralizes a given text based on a count. */
export const pluralizeText = (text: string, count: number, pluralText: string, nonPluralText = ""): string => {
  if (count === 0 || count > 1) {
    return `${text}${pluralText}`;
  }

  return `${text}${nonPluralText}`;
};
