"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ImageSlider } from "@/components/slider/image-slider";
import { SearchBar } from "@/components/search/search-bar";
import Image from "next/image";
import Link from "next/link";

export default function AgentsPage() {
  const t = useTranslations("agents");
  const locale = useLocale();
  const [searchQuery, setSearchQuery] = useState("");

  // منتجات الألعاب
  const gameProducts = [
    { 
      id: 1, 
      name: "PUBG Mobile", 
      nameAr: "ببجي موبايل",
      image: "/images/pubg.jpg",
      available: true
    },
    { 
      id: 2, 
      name: "Free Fire", 
      nameAr: "فري فاير",
      image: "/images/freefire.png",
      available: true
    },
    { 
      id: 3, 
      name: "Likee", 
      nameAr: "لايكي",
      image: "/images/likee.png",
      available: true
    },
    { 
      id: 4, 
      name: "Yoho", 
      nameAr: "يوهو",
      image: "/images/yoho.jpg",
      available: false
    },
    { 
      id: 5, 
      name: "Ahlan", 
      nameAr: "أهلاً",
      image: "/images/ahlan.png",
      available: true
    },
    { 
      id: 6, 
      name: "Oohla", 
      nameAr: "أوهلا",
      image: "/images/oohla.png",
      available: false
    },
    { 
      id: 7, 
      name: "Hiya", 
      nameAr: "هيا",
      image: "/images/hiya.jpeg",
      available: true
    },
    { 
      id: 8, 
      name: "SoulChill", 
      nameAr: "سول تشيل",
      image: "/images/soulchill2.png",
      available: false
    },
    { 
      id: 9, 
      name: "PartyStar", 
      nameAr: "بارتي ستار",
      image: "/images/partystar.jpg",
      available: true
    },
  ];

  // Filter products based on search query
  const filteredProducts = gameProducts.filter((product) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      product.name.toLowerCase().includes(searchLower) ||
      product.nameAr.includes(searchQuery)
    );
  });

  return (
    <div className="space-y-6">
      {/* Image Slider */}
      <ImageSlider />

      {/* Search Bar */}
      <SearchBar value={searchQuery} onChange={setSearchQuery} />

      {/* Products Grid */}
      <div className="space-y-4">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
          {filteredProducts.map((product) => (
            <Link
              key={product.id}
              href={`/${locale}/product/${product.id}`}
              className="group relative cursor-pointer"
            >
              {/* Available/Unavailable Badge */}
              {!product.available && (
                <div className="absolute top-2 left-2 z-10">
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-md shadow-lg">
                    غير متوفر
                  </span>
                </div>
              )}

              {/* Product Image */}
              <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gradient-to-br from-beige-100 to-beige-200 dark:from-neutral-800 dark:to-neutral-900 group-hover:scale-105 transition-transform duration-500 shadow-md group-hover:shadow-xl border-2 border-transparent group-hover:border-gold">
                <Image
                  src={product.image}
                  alt={product.nameAr}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, 16vw"
                  priority={product.id === 1}
                />
                
                {/* Shine Effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 group-hover:translate-x-full transform -translate-x-full"></div>
              </div>

              {/* Product Name */}
              <h3 className="mt-2 text-sm md:text-base font-semibold text-center group-hover:text-gold transition-colors line-clamp-1">
                {product.nameAr}
              </h3>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
