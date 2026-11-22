/** Locates a physical page in a paginated export without mistaking an old batch for it.
 * @example transcriptPageSections("<!-- neuralabs-reader-batch -->\n## Página 1\nText").get(1)
 */
export function transcriptPageSections(markdown: string): Map<number, string> {
  const [, ...sections] = markdown.split(/^<!-- neuralabs-reader-batch -->\r?\n/mu);
  return new Map(sections.flatMap((section) => {
    const heading = /^## Página ([1-9]\d*)\s*$/mu.exec(section.split(/\r?\n/u, 1)[0]);
    return heading ? [[Number(heading[1]), section]] : [];
  }));
}
