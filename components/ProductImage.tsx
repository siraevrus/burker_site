"use client";

/**
 * Фото товара — обычный <img>, без Next/Image.
 * Исключает проблемы с _next/image и вёрсткой на проде.
 */
export default function ProductImage({
  src,
  alt,
  className = "",
  fill = true,
}: {
  src: string;
  alt: string;
  className?: string;
  fill?: boolean;
}) {
  const resolvedSrc =
    src.startsWith("http://") || src.startsWith("https://") ? src : src.startsWith("/") ? src : `/${src}`;
  
  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // При ошибке загрузки показываем placeholder
    const target = e.currentTarget;
    if (target.src !== "/placeholder.png") {
      target.src = "/placeholder.png";
    }
  };

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={fill ? `absolute inset-0 w-full h-full object-cover ${className}` : className}
      loading="lazy"
      decoding="async"
      onError={handleError}
    />
  );
}
