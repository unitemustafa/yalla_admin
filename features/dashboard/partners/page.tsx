"use client";

import { Loader2, RefreshCw } from "lucide-react";

import { Button, PageTitle } from "../primitives";
import { PartnerApplicationsTable } from "./applications-table";
import { PartnerDetailsDialog } from "./partner-details-dialog";
import { PartnersFilters } from "./partners-filters";
import {
  PartnersEmptyState,
  PartnersErrorState,
  PartnersLoadingState,
} from "./partners-states";
import { PartnerSummaryCards } from "./summary-cards";
import { usePartnersPage } from "./use-partners-page";

export function PartnersPage() {
  const {
    counts,
    error,
    filter,
    filteredApplications,
    loading,
    loadApplications,
    refreshing,
    search,
    selectedApplication,
    setFilter,
    setSearch,
    setSelectedApplication,
    updateStatus,
    updatingId,
  } = usePartnersPage();

  return (
    <div className="space-y-6 px-6 py-10">
      <PageTitle
        title="الشركاء"
        description="مراجعة طلبات التسجيل كشريك ومتابعة حالتها"
        size="compact"
        actions={
          <Button
            type="button"
            variant="outline"
            className="h-9 px-4 text-sm"
            onClick={() => void loadApplications({ quiet: true })}
            disabled={loading || refreshing}
          >
            {refreshing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            تحديث
          </Button>
        }
      />

      <PartnerSummaryCards counts={counts} />

      <PartnersFilters
        search={search}
        filter={filter}
        onSearchChange={setSearch}
        onFilterChange={setFilter}
      />

      {error ? (
        <PartnersErrorState
          error={error}
          onRetry={() => void loadApplications()}
        />
      ) : null}

      {loading && !error ? <PartnersLoadingState /> : null}

      {!loading && !error && filteredApplications.length === 0 ? (
        <PartnersEmptyState />
      ) : null}

      {!loading && !error && filteredApplications.length > 0 ? (
        <PartnerApplicationsTable
          applications={filteredApplications}
          updatingId={updatingId}
          onStatusChange={(application, status) =>
            void updateStatus(application, status)
          }
          onSelect={setSelectedApplication}
        />
      ) : null}

      {selectedApplication ? (
        <PartnerDetailsDialog
          application={selectedApplication}
          updating={updatingId === selectedApplication.id}
          onClose={() => setSelectedApplication(null)}
          onStatusChange={(nextStatus) =>
            void updateStatus(selectedApplication, nextStatus)
          }
        />
      ) : null}
    </div>
  );
}
