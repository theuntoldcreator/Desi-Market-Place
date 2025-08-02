import filter from 'leo-profanity';

const customWordList = [
  "escort", "nude", "girls", "drugs", "alcohol", "sex", "cigarette", "bodies", "incest", "weed", "pills", "vodka"
];

// Initialize the filter with the default list and our custom list.
// This is safe to call multiple times.
filter.add(customWordList);

interface ValidationResult {
  isProfane: boolean;
  field?: 'title' | 'description';
  word?: string;
}

// leo-profanity checks for substrings, so we need to find the word that contains the profanity.
const findViolatingWord = (text: string): string | undefined => {
    const words = text.toLowerCase().split(/[\s,.-]+/); // Split by common delimiters
    for (const word of words) {
        if (filter.check(word)) {
            return word.replace(/[^\w]/gi, ''); // return the clean word
        }
    }
    return undefined;
}

export const validateText = (title: string, description: string): ValidationResult => {
  // Check title
  let violatingWord = findViolatingWord(title);
  if (violatingWord) {
    return {
      isProfane: true,
      field: 'title',
      word: violatingWord,
    };
  }

  // Check description
  violatingWord = findViolatingWord(description);
  if (violatingWord) {
    return {
      isProfane: true,
      field: 'description',
      word: violatingWord,
    };
  }

  return { isProfane: false };
};