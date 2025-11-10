import { TenantsPageClient, type TenantLabels } from "@/components/tenants/tenants-page";
import { getTranslations } from "next-intl/server";

export default async function TenantsPage() {
  const t = await getTranslations("pages.tenants");
  const labels = t.raw("labels") as TenantLabels;

  return <TenantsPageClient labels={labels} />;
}
