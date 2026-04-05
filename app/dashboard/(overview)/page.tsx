import { lusitana } from "@/app/ui/fonts";
import { Suspense } from "react";
import {
  LatestInvoicesSkeleton,
  CardsSkeleton,
  RevenueChartSkeleton,
} from "@/app/ui/skeletons";
import CardWrapper from "@/app/ui/dashboard/cards";
import LatestInvoices from "@/app/ui/dashboard/latest-invoices";

export default async function Page() {
  return (
    <main>
      <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        Dashboard
      </h1>
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Suspense fallback={<CardsSkeleton />}>
          <CardWrapper />
        </Suspense>
      </div>
    </main>
  );
}
