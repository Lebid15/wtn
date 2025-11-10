import {
  FinancialPaymentsPageClient,
  type FinancialPaymentsLabels,
} from "@/components/financial-payments/financial-payments-page";
import { getTranslations } from "next-intl/server";

export default async function SubscriptionsPage() {
  const t = await getTranslations("pages.subscriptions");

  const labels = t.raw("labels") as FinancialPaymentsLabels;

  return <FinancialPaymentsPageClient labels={labels} />;
}
