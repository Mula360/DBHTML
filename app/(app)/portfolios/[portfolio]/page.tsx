import { notFound } from "next/navigation";
import { ModuleStub } from "@/app/(app)/ModuleStub";
import { PORTFOLIOS } from "@/app/(app)/nav";

export function generateStaticParams() {
  return PORTFOLIOS.map((portfolio) => ({ portfolio }));
}

export default function PortfolioPage({
  params,
}: {
  params: { portfolio: string };
}) {
  if (!PORTFOLIOS.includes(params.portfolio as (typeof PORTFOLIOS)[number])) {
    notFound();
  }
  const label = params.portfolio.replace(/([a-z])([A-Z])/g, "$1 $2");
  return (
    <ModuleStub
      title={`${label} portfolio`}
      phase="Phase 8"
      note="Lead/support, status update log, tagged action items and linked events land in Phase 8. HBA / AWC / Bird Race get extra panels."
    />
  );
}
