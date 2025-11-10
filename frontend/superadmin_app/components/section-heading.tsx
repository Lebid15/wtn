import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  title: string;
  className?: string;
};

export function SectionHeading({ title, className }: SectionHeadingProps) {
  return (
    <div className={cn("flex items-center gap-3 pb-3 border-b border-gold/20", className)}>
      <div className="w-1 h-8 bg-gradient-to-b from-gold to-gold-light rounded-full" />
      <h1 className="text-lg sm:text-xl font-semibold text-primary">
        {title}
      </h1>
    </div>
  );
}
