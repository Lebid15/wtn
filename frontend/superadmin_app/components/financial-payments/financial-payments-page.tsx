"use client";

import { createPortal } from "react-dom";
import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocale } from "next-intl";
import { SlidersHorizontal, X } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type FinancialPaymentsLabels = {
  heading: string;
  filters: {
    heading: string;
    status: {
      label: string;
      options: {
        all: string;
        pending: string;
        approved: string;
        rejected: string;
        overdue: string;
      };
    };
    billingCycle: {
      label: string;
      options: {
        all: string;
        monthly: string;
        annual: string;
      };
    };
  };
  cards: {
    plan: string;
    billingCycle: string;
    nextPayment: string;
    amount: string;
    status: string;
    requestedOn: string;
    statusBadge: {
      pending: string;
      approved: string;
      rejected: string;
      overdue: string;
    };
    billingCycleValue: {
      monthly: string;
      annual: string;
    };
    actions: {
      approve: string;
      reject: string;
      extend: string;
    };
  };
  modal: {
    title: string;
    description: string;
    daysLabel: string;
    daysPlaceholder: string;
    save: string;
    cancel: string;
    errors: {
      required: string;
      invalidNumber: string;
    };
  };
  feedback: {
    approved: string;
    rejected: string;
    extended: string;
  };
  empty: string;
};

type PaymentStatus = "pending" | "approved" | "rejected" | "overdue";
type BillingCycle = "monthly" | "annual";
type StatusFilter = "all" | PaymentStatus;
type CycleFilter = "all" | BillingCycle;

type FinancialPayment = {
  id: number;
  tenantDisplayName: string;
  planName: string;
  billingCycle: BillingCycle;
  status: PaymentStatus;
  amount: number;
  currency: string;
  nextPaymentDate: string;
  requestedAt: string;
};

type FinancialPaymentsPageProps = {
  labels: FinancialPaymentsLabels;
};

const initialPayments: FinancialPayment[] = [
  {
    id: 501,
    tenantDisplayName: "متجر ليـنا",
    planName: "Launch Plus",
    billingCycle: "monthly",
    status: "pending",
    amount: 299,
    currency: "USD",
    nextPaymentDate: "2024-11-20T09:30:00.000Z",
    requestedAt: "2024-11-01T08:30:00.000Z",
  },
  {
    id: 498,
    tenantDisplayName: "Selim Market",
    planName: "Growth Edge",
    billingCycle: "annual",
    status: "approved",
    amount: 1890,
    currency: "USD",
    nextPaymentDate: "2025-05-02T11:00:00.000Z",
    requestedAt: "2024-10-28T15:10:00.000Z",
  },
  {
    id: 492,
    tenantDisplayName: "Fiori Boutique",
    planName: "Starter",
    billingCycle: "monthly",
    status: "overdue",
    amount: 149,
    currency: "USD",
    nextPaymentDate: "2024-10-25T07:45:00.000Z",
    requestedAt: "2024-10-24T12:00:00.000Z",
  },
  {
    id: 489,
    tenantDisplayName: "Anadolu Fresh",
    planName: "Premium Retail",
    billingCycle: "annual",
    status: "rejected",
    amount: 2490,
    currency: "USD",
    nextPaymentDate: "2024-11-30T10:15:00.000Z",
    requestedAt: "2024-10-20T09:20:00.000Z",
  },
];

export function FinancialPaymentsPageClient({ labels }: FinancialPaymentsPageProps) {
  const locale = useLocale();
  const isRTL = locale.startsWith("ar") || locale.startsWith("he");
  const [payments, setPayments] = useState<FinancialPayment[]>(initialPayments);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [cycleFilter, setCycleFilter] = useState<CycleFilter>("all");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [extendDays, setExtendDays] = useState("");
  const [extendError, setExtendError] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<FinancialPayment | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const orderedPayments = useMemo(
    () =>
      [...payments].sort(
        (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
      ),
    [payments]
  );

  const filteredPayments = useMemo(
    () =>
      orderedPayments.filter((payment) => {
        const matchesStatus =
          statusFilter === "all" ? true : payment.status === statusFilter;
        const matchesCycle =
          cycleFilter === "all" ? true : payment.billingCycle === cycleFilter;
        return matchesStatus && matchesCycle;
      }),
    [orderedPayments, statusFilter, cycleFilter]
  );

  const statusOptions = useMemo(
    () => [
      { value: "all" as StatusFilter, label: labels.filters.status.options.all },
      { value: "pending" as StatusFilter, label: labels.filters.status.options.pending },
      { value: "approved" as StatusFilter, label: labels.filters.status.options.approved },
      { value: "rejected" as StatusFilter, label: labels.filters.status.options.rejected },
      { value: "overdue" as StatusFilter, label: labels.filters.status.options.overdue },
    ],
    [labels.filters.status.options]
  );

  const cycleOptions = useMemo(
    () => [
      { value: "all" as CycleFilter, label: labels.filters.billingCycle.options.all },
      { value: "monthly" as CycleFilter, label: labels.filters.billingCycle.options.monthly },
      { value: "annual" as CycleFilter, label: labels.filters.billingCycle.options.annual },
    ],
    [labels.filters.billingCycle.options]
  );

  const formatCurrency = (amount: number, currency: string) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(amount);

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));

  const fillTemplate = (template: string, values: Record<string, string>) =>
    template.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match);

  const statusStyles: Record<PaymentStatus, string> = {
    pending:
      "bg-amber-500/10 text-amber-600 border border-amber-500/30",
    approved:
      "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30",
    rejected:
      "bg-rose-500/10 text-rose-600 border border-rose-500/30",
    overdue: "bg-red-500/10 text-red-600 border border-red-500/30",
  };

  const handleStatusFilterChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(event.target.value as StatusFilter);
  };

  const handleCycleFilterChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setCycleFilter(event.target.value as CycleFilter);
  };

  const handleStatusUpdate = (
    payment: FinancialPayment,
    nextStatus: PaymentStatus,
    template: string
  ) => {
    setPayments((prev) =>
      prev.map((item) =>
        item.id === payment.id ? { ...item, status: nextStatus } : item
      )
    );
    setFeedback({
      type: "success",
      text: fillTemplate(template, { name: payment.tenantDisplayName }),
    });
  };

  const openExtendModal = (payment: FinancialPayment) => {
    setSelectedPayment(payment);
    setExtendDays("");
    setExtendError(null);
    setIsExtendModalOpen(true);
    setFeedback(null);
  };

  const closeExtendModal = () => {
    setIsExtendModalOpen(false);
    setSelectedPayment(null);
    setExtendDays("");
    setExtendError(null);
  };

  const handleExtendInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setExtendDays(event.target.value);
    setExtendError(null);
  };

  const handleExtendSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPayment) {
      return;
    }

    const trimmed = extendDays.trim();
    if (!trimmed) {
      setExtendError(labels.modal.errors.required);
      return;
    }

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setExtendError(labels.modal.errors.invalidNumber);
      return;
    }

    const nextDate = new Date(selectedPayment.nextPaymentDate);
    nextDate.setDate(nextDate.getDate() + parsed);

    setPayments((prev) =>
      prev.map((payment) =>
        payment.id === selectedPayment.id
          ? { ...payment, nextPaymentDate: nextDate.toISOString() }
          : payment
      )
    );

    setFeedback({
      type: "success",
      text: fillTemplate(labels.feedback.extended, {
        name: selectedPayment.tenantDisplayName,
      }),
    });
    closeExtendModal();
  };

  return (
    <>
      <div className="space-y-4">
        <SectionHeading title={labels.heading} />

        <div className="rounded-xl border border-border/60 bg-card/60 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col gap-3 px-4 py-4 sm:px-5">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <SlidersHorizontal className="size-4 text-primary" />
              <span>{labels.filters.heading}</span>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <FilterSelect
                label={labels.filters.status.label}
                value={statusFilter}
                options={statusOptions}
                onChange={handleStatusFilterChange}
              />
              <FilterSelect
                label={labels.filters.billingCycle.label}
                value={cycleFilter}
                options={cycleOptions}
                onChange={handleCycleFilterChange}
              />
            </div>
          </div>
        </div>

        {feedback && (
          <div
            className={cn(
              "rounded-md border px-4 py-3 text-sm",
              feedback.type === "success"
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500"
                : "border-destructive/50 bg-destructive/10 text-destructive"
            )}
          >
            {feedback.text}
          </div>
        )}

        <div className="space-y-3">
          {filteredPayments.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 px-6 py-12 text-center text-sm text-muted-foreground">
              {labels.empty}
            </div>
          ) : (
            filteredPayments.map((payment) => (
              <Card
                key={payment.id}
                className="space-y-4 border-border/70 p-4 sm:p-5"
              >
                <CardHeader className={cn("p-0", isRTL ? "items-end text-right" : "items-start text-left")}
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                    <CardTitle className="break-words text-base font-semibold text-primary">
                      {payment.tenantDisplayName}
                    </CardTitle>
                    <span className="hidden text-xs text-muted-foreground sm:inline">•</span>
                    <CardDescription className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span className="rounded-full border border-border/40 px-3 py-1 text-xs font-medium uppercase text-muted-foreground">
                        {labels.cards.statusBadge[payment.status]}
                      </span>
                      <span className="text-sm font-medium text-foreground/80">{payment.planName}</span>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {labels.cards.billingCycleValue[payment.billingCycle]}
                      </span>
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent
                  className={cn(
                    "grid gap-3 p-0 text-sm md:grid-cols-2 xl:grid-cols-3",
                    isRTL ? "text-right" : ""
                  )}
                >
                  <InfoCell
                    label={labels.cards.billingCycle}
                    value={labels.cards.billingCycleValue[payment.billingCycle]}
                  />
                  <InfoCell
                    label={labels.cards.nextPayment}
                    value={formatDate(payment.nextPaymentDate)}
                  />
                  <InfoCell
                    label={labels.cards.amount}
                    value={formatCurrency(payment.amount, payment.currency)}
                  />
                  <InfoCell
                    label={labels.cards.requestedOn}
                    value={formatDate(payment.requestedAt)}
                  />
                </CardContent>

                <CardFooter
                  className={cn(
                    "flex flex-wrap gap-2 border-t border-border/40 pt-3",
                    isRTL ? "justify-start sm:flex-row-reverse" : "justify-end"
                  )}
                >
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() =>
                      handleStatusUpdate(
                        payment,
                        "rejected",
                        labels.feedback.rejected
                      )
                    }
                    disabled={payment.status === "rejected"}
                  >
                    {labels.cards.actions.reject}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      handleStatusUpdate(
                        payment,
                        "approved",
                        labels.feedback.approved
                      )
                    }
                    disabled={payment.status === "approved"}
                  >
                    {labels.cards.actions.approve}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => openExtendModal(payment)}
                  >
                    {labels.cards.actions.extend}
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      </div>

      {isMounted && isExtendModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={closeExtendModal} />
            <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xl">
              <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
                <h2 className="text-base font-semibold text-primary">
                  {labels.modal.title}
                </h2>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={closeExtendModal}
                >
                  <X className="size-4" />
                </Button>
              </div>
              <form className="space-y-4 px-6 py-5" onSubmit={handleExtendSubmit}>
                {selectedPayment && (
                  <p className="text-sm text-muted-foreground">
                    {fillTemplate(labels.modal.description, {
                      name: selectedPayment.tenantDisplayName,
                    })}
                  </p>
                )}
                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium text-muted-foreground">
                    {labels.modal.daysLabel}
                  </span>
                  <input
                    value={extendDays}
                    onChange={handleExtendInputChange}
                    placeholder={labels.modal.daysPlaceholder}
                    className={cn(
                      "w-full rounded-md border border-border/60 bg-background/70 px-4 py-3 text-foreground shadow-inner outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30",
                      extendError &&
                        "border-destructive focus:border-destructive focus:ring-destructive/30"
                    )}
                    inputMode="numeric"
                  />
                  {extendError && (
                    <span className="text-xs text-destructive">{extendError}</span>
                  )}
                </label>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={closeExtendModal}>
                    {labels.modal.cancel}
                  </Button>
                  <Button type="submit" className="min-w-[120px]">
                    {labels.modal.save}
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

type FilterSelectProps = {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
};

function FilterSelect({ label, value, options, onChange }: FilterSelectProps) {
  return (
    <label className="flex w-full flex-col gap-2 text-sm text-muted-foreground sm:w-64">
      <span className="font-medium">{label}</span>
      <select
        value={value}
        onChange={onChange}
        className="w-full rounded-md border border-border/60 bg-background/80 px-4 py-2.5 text-foreground shadow-inner outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

type InfoCellProps = {
  label: string;
  value: ReactNode;
  className?: string;
};

function InfoCell({ label, value, className }: InfoCellProps) {
  return (
    <div className={cn("flex min-w-[140px] flex-col", className)}>
      <span className="sr-only">{label}</span>
      <div className="truncate text-sm text-foreground/90 sm:break-words">{value}</div>
    </div>
  );
}
