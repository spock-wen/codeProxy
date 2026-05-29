import { type ReactNode, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Download, LayoutGrid, RefreshCw, Upload } from "lucide-react";
import { Button } from "@/modules/ui/Button";
import { Select } from "@/modules/ui/Select";

export type ProvidersToolbarProps = {
  currentImportKind: string | null;
  currentTabItemsCount: number;
  selectedExportCount: number;
  allCurrentSelected: boolean;
  loading: boolean;
  gridColumns: number;
  onImportClick: () => void;
  onExport: () => void;
  onExportSelected: () => void;
  onSelectAll: (checked: boolean) => void;
  onClearSelection: () => void;
  onRefresh: () => void;
  onGridColumnsChange: (cols: number) => void;
  onAddCurrent: (() => void) | null;
  addLabel?: string;
  children?: ReactNode;
};

export function ProvidersToolbar({
  currentImportKind,
  currentTabItemsCount,
  selectedExportCount,
  allCurrentSelected,
  loading,
  gridColumns,
  onImportClick,
  onExport,
  onExportSelected,
  onSelectAll,
  onClearSelection,
  onRefresh,
  onGridColumnsChange,
  onAddCurrent,
  addLabel,
}: ProvidersToolbarProps) {
  const { t } = useTranslation();
  const hasImportExport = currentImportKind !== null;

  return (
    <div
      data-testid="providers-batch-actions"
      className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-slate-50/80 px-2 py-1.5 transition-colors duration-200 ease-out dark:bg-white/3"
    >
      {hasImportExport ? (
        <>
          <Button
            variant="secondary"
            size="sm"
            className="h-8! px-2 text-xs"
            onClick={onImportClick}
          >
            <Upload size={14} />
            {t("providers.import_json")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="h-8! px-2 text-xs"
            onClick={onExport}
            disabled={currentTabItemsCount === 0}
          >
            <Download size={14} />
            {t("providers.export_json")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="h-8! px-2 text-xs"
            onClick={() => onSelectAll(!allCurrentSelected)}
            disabled={currentTabItemsCount === 0}
          >
            {allCurrentSelected
              ? t("providers.batch_deselect_all")
              : t("providers.batch_select_all")}
          </Button>
          <span className="ml-1 text-xs font-medium text-slate-600 dark:text-white/65">
            {t("providers.batch_selected", { count: selectedExportCount })}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-8! px-2 text-xs"
            onClick={onClearSelection}
            disabled={selectedExportCount === 0}
          >
            {t("providers.batch_clear")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="h-8! px-2 text-xs"
            onClick={onExportSelected}
            disabled={selectedExportCount === 0}
          >
            {t("providers.export_selected_json")}
          </Button>
        </>
      ) : null}
      <Button
        variant="secondary"
        size="sm"
        className="h-8! px-2 text-xs"
        onClick={onRefresh}
        disabled={loading}
      >
        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        {t("providers.refresh")}
      </Button>
      <div className="ml-auto flex items-center gap-1.5">
        <LayoutGrid size={14} className="text-slate-500 dark:text-white/50" />
        <Select
          value={String(gridColumns)}
          onChange={(v) => onGridColumnsChange(Number(v))}
          options={[
            { value: "1", label: t("providers.grid_cols_1") },
            { value: "2", label: t("providers.grid_cols_2") },
            { value: "3", label: t("providers.grid_cols_3") },
            { value: "4", label: t("providers.grid_cols_4") },
          ]}
          size="sm"
          aria-label={t("providers.grid_columns_aria")}
        />
      </div>
    </div>
  );
}
