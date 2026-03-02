import Link from "next/link";
import { CANONICAL_SITE_URL } from "@/lib/site-url";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

/**
 * Визуальные хлебные крошки + JSON-LD BreadcrumbList для SEO.
 */
export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  const baseUrl = CANONICAL_SITE_URL.replace(/\/+$/, "");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href && { item: `${baseUrl}${item.href}` }),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Хлебные крошки" className="text-sm text-gray-600 mb-6">
        <ol className="flex flex-wrap items-center gap-2">
          {items.map((item, index) => (
            <li key={index} className="flex items-center gap-2">
              {index > 0 && (
                <span className="text-gray-400" aria-hidden="true">
                  /
                </span>
              )}
              {item.href ? (
                <Link
                  href={item.href}
                  className="text-[#A13D42] hover:underline transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-gray-800 font-medium" aria-current="page">
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
