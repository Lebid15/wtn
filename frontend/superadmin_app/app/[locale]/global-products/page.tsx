import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { SectionHeading } from "@/components/section-heading";
import { Button } from "@/components/ui/button";
import { globalProducts } from "@/lib/global-products";
import { ProductsGallery } from "@/components/global-products/products-gallery";

export default async function GlobalProductsPage() {
  const t = await getTranslations("pages.globalProducts");

  const products = globalProducts.map((item) => ({
    ...item,
    name: t(`products.${item.key}.name`),
  }));

  const searchPlaceholder = t("searchPlaceholder");
  const emptyLabel = t("empty");

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <SectionHeading title={t("title")} className="flex-1 border-none pb-0" />
        <Button
          type="button"
          size="lg"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold to-gold-light px-6 shadow-lg shadow-gold/20 hover:from-gold-light hover:to-gold"
        >
          <Plus className="size-5" />
          {t("addProduct")}
        </Button>
      </div>

      <ProductsGallery
        products={products}
        searchPlaceholder={searchPlaceholder}
        emptyLabel={emptyLabel}
      />
    </div>
  );
}
