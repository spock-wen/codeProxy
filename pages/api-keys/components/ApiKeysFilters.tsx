import { useTranslation } from "react-i18next";
import { RotateCcw } from "lucide-react";
import { SearchableCheckboxMultiSelect } from "@code-proxy/ui";
import type { SearchableCheckboxMultiSelectOption } from "@code-proxy/ui";
import { cn } from "@code-proxy/ui";

type MultiSelectFilterState = string[] | null;

interface ApiKeysFiltersProps {
  nameOptions: SearchableCheckboxMultiSelectOption[];
  selectedNames: MultiSelectFilterState;
  onNamesChange: (value: string[]) => void;
  onNamesClear: () => void;

  keyOptions: SearchableCheckboxMultiSelectOption[];
  selectedKeys: MultiSelectFilterState;
  onKeysChange: (value: string[]) => void;
  onKeysClear: () => void;

  channelGroupOptions: SearchableCheckboxMultiSelectOption[];
  selectedChannelGroups: MultiSelectFilterState;
  onChannelGroupsChange: (value: string[]) => void;
  onChannelGroupsClear: () => void;

  onResetFilters: () => void;
  hasActiveFilters: boolean;
}

export function ApiKeysFilters({
  nameOptions,
  selectedNames,
  onNamesChange,
  onNamesClear,
  keyOptions,
  selectedKeys,
  onKeysChange,
  onKeysClear,
  channelGroupOptions,
  selectedChannelGroups,
  onChannelGroupsChange,
  onChannelGroupsClear,
  onResetFilters,
  hasActiveFilters,
}: ApiKeysFiltersProps) {
  const { t } = useTranslation();

  return (
    <div className="border-t border-slate-100 px-5 py-3 dark:border-neutral-800/60">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full min-[640px]:w-auto min-[640px]:min-w-[200px] min-[640px]:max-w-[260px] flex-1 min-[640px]:flex-initial">
          <SearchableCheckboxMultiSelect
            value={selectedNames ?? []}
            onChange={onNamesChange}
            options={nameOptions}
            placeholder={t("api_keys_page.filter_name_placeholder")}
            searchPlaceholder={t("api_keys_page.search_names")}
            selectFilteredLabel={t("request_logs.select_filtered")}
            deselectFilteredLabel={t("request_logs.deselect_filtered")}
            selectedCountLabel={(count: number) => t("request_logs.selected_count", { count })}
            noResultsLabel={t("request_logs.no_filter_results")}
            aria-label={t("api_keys_page.filter_name_placeholder")}
            clearLabel={t("api_keys_page.clear_name_filter")}
            onClear={onNamesClear}
            showClearButton
            size="sm"
            emptyValueMeansAllSelected
            emptyValueRepresentsAllSelected={selectedNames === null}
            showFilteredToggleWithoutQuery={false}
            applyMode="manual"
            applyLabel={t("request_logs.apply_filters")}
            cancelLabel={t("common.cancel")}
            selectAllLabel={t("request_logs.select_all")}
            deselectAllLabel={t("request_logs.deselect_all")}
            emptySelectionLabel={t("request_logs.none_selected")}
          />
        </div>
        <div className="w-full min-[640px]:w-auto min-[640px]:min-w-[220px] min-[640px]:max-w-[300px] flex-1 min-[640px]:flex-initial">
          <SearchableCheckboxMultiSelect
            value={selectedKeys ?? []}
            onChange={onKeysChange}
            options={keyOptions}
            placeholder={t("api_keys_page.filter_key_placeholder")}
            searchPlaceholder={t("request_logs.search_keys")}
            selectFilteredLabel={t("request_logs.select_filtered")}
            deselectFilteredLabel={t("request_logs.deselect_filtered")}
            selectedCountLabel={(count: number) => t("request_logs.selected_count", { count })}
            noResultsLabel={t("request_logs.no_filter_results")}
            aria-label={t("api_keys_page.filter_key_placeholder")}
            clearLabel={t("request_logs.clear_key_filter")}
            onClear={onKeysClear}
            showClearButton
            size="sm"
            emptyValueMeansAllSelected
            emptyValueRepresentsAllSelected={selectedKeys === null}
            showFilteredToggleWithoutQuery={false}
            applyMode="manual"
            applyLabel={t("request_logs.apply_filters")}
            cancelLabel={t("common.cancel")}
            selectAllLabel={t("request_logs.select_all")}
            deselectAllLabel={t("request_logs.deselect_all")}
            emptySelectionLabel={t("request_logs.none_selected")}
          />
        </div>
        <div className="w-full min-[640px]:w-auto min-[640px]:min-w-[200px] min-[640px]:max-w-[280px] flex-1 min-[640px]:flex-initial">
          <SearchableCheckboxMultiSelect
            value={selectedChannelGroups ?? []}
            onChange={onChannelGroupsChange}
            options={channelGroupOptions}
            placeholder={t("api_keys_page.filter_channel_group_placeholder")}
            searchPlaceholder={t("api_keys_page.search_channel_groups")}
            selectFilteredLabel={t("request_logs.select_filtered")}
            deselectFilteredLabel={t("request_logs.deselect_filtered")}
            selectedCountLabel={(count: number) => t("request_logs.selected_count", { count })}
            noResultsLabel={t("request_logs.no_filter_results")}
            aria-label={t("api_keys_page.filter_channel_group_placeholder")}
            clearLabel={t("api_keys_page.clear_channel_group_filter")}
            onClear={onChannelGroupsClear}
            showClearButton
            size="sm"
            emptyValueMeansAllSelected
            emptyValueRepresentsAllSelected={selectedChannelGroups === null}
            showFilteredToggleWithoutQuery={false}
            applyMode="manual"
            applyLabel={t("request_logs.apply_filters")}
            cancelLabel={t("common.cancel")}
            selectAllLabel={t("request_logs.select_all")}
            deselectAllLabel={t("request_logs.deselect_all")}
            emptySelectionLabel={t("request_logs.none_selected")}
          />
        </div>

        {hasActiveFilters ? (
          <button
            type="button"
            onClick={onResetFilters}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium",
              "text-slate-500 hover:text-slate-700 hover:bg-slate-100",
              "dark:text-white/50 dark:hover:text-white/80 dark:hover:bg-white/10",
              "transition-colors",
            )}
          >
            <RotateCcw size={12} aria-hidden="true" />
            {t("api_keys_page.reset_filters")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
