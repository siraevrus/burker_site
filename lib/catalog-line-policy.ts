/** Slug в URL можно задать только до первой публикации линии (publishedAt). */
export function isCatalogSlugEditable(publishedAt: Date | null | undefined): boolean {
  return publishedAt == null;
}
