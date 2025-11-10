"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import Image from "next/image";
import { Link } from "@/i18n/routing";

export type GalleryProduct = {
  key: string;
  name: string;
  image: string;
};

type ProductsGalleryProps = {
  products: GalleryProduct[];
  searchPlaceholder: string;
  emptyLabel: string;
};

export function ProductsGallery({ products, searchPlaceholder, emptyLabel }: ProductsGalleryProps) {
  const [query, setQuery] = useState("");

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return products;
    return products.filter((product) => product.name.toLocaleLowerCase().includes(normalized));
  }, [products, query]);

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute top-1/2 size-5 -translate-y-1/2 text-muted-foreground" style={{ insetInlineStart: "1rem" }} />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-full border border-gold/30 bg-background/80 px-12 py-3 text-sm shadow-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40"
        />
      </div>

      {filteredProducts.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-gold/30 bg-background/60 px-6 py-12 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filteredProducts.map((product) => (
            <Link
              key={product.key}
              href={`/global-products/${product.key}`}
              className="group space-y-2 text-center"
            >
              <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60 shadow-sm transition-transform duration-200 ease-out group-hover:-translate-y-[3px] group-hover:shadow-lg">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes="(min-width: 1536px) 12vw, (min-width: 1280px) 14vw, (min-width: 1024px) 18vw, (min-width: 640px) 28vw, 30vw"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <p className="text-xs font-semibold text-primary sm:text-sm">
                {product.name}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
