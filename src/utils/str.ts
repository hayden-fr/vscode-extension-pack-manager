function splitWord(content: string) {
  return content.replace(/([a-z0-9])([A-Z])/g, "$1 $2").split(/[ _\-]/);
}

/**
 * a simple function to convert string to kebab case
 * @param content
 * @returns
 */
export function kebabCase(content: string) {
  const words = splitWord(content);
  const validWords = words.filter(Boolean).map((w) => w.toLowerCase());
  return validWords.join("-");
}

function UpperCase(content: string) {
  return content.replace(/^(\w)(.*)/, (match, p1, p2) => `${p1.toUpperCase()}${p2}`);
}

/**
 * a simple function to convert string to start case
 * @param content
 * @returns
 */
export function startCase(content: string) {
  const words = splitWord(content);
  const validWords = words.filter(Boolean).map(UpperCase);
  return validWords.join(" ");
}
