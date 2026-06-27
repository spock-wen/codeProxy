import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, KeyRound, RefreshCw } from "lucide-react";
import {
  apiKeyEntriesApi,
  apiKeysApi,
  type ApiKeyEntry,
} from "@code-proxy/api-client/endpoints/api-keys";
import {
  applyApiKeyPermissionProfile,
  apiKeyPermissionProfilesApi,
  CUSTOM_PERMISSION_PROFILE_ID,
  resolveEntryPermissionProfileId,
  type ApiKeyPermissionProfile,
} from "@code-proxy/api-client/endpoints/api-key-permission-profiles";
import { ccSwitchImportConfigsApi } from "@code-proxy/api-client/endpoints/ccswitch-import-configs";
import { detectApiBaseFromLocation } from "@code-proxy/api-client";
import { useOptionalAuth } from "@app/providers/AuthProvider";
import { generateApiKey, makeEmptyApiKeyForm, maskApiKey } from "./apiKeyPageUtils";
import { createApiKeyColumns } from "./components/ApiKeyColumns";
import { DeleteApiKeyModal } from "./components/DeleteApiKeyModal";
import { copyTextToClipboard } from "@code-proxy/ui";
import { Card } from "@code-proxy/ui";
import { Button } from "@code-proxy/ui";
import { EmptyState } from "@code-proxy/ui";
import { useToast } from "@code-proxy/ui";
import { DataTable } from "@code-proxy/ui";
import { ApiKeyFormModal } from "./components/ApiKeyFormModal";
import { ApiKeyUsageModal } from "./components/ApiKeyUsageModal";
import { useApiKeyPermissionOptions } from "@features/api-key-restrictions";
import { useApiKeyUsageView } from "./hooks/useApiKeyUsageView";
import { CcSwitchImportCardList } from "./components/CcSwitchImportCardList";
import { openCcSwitchImportUrl } from "@code-proxy/domain/ccswitch/ccswitchImport";
import {
  appendCcSwitchRoutePath,
  buildCcSwitchCodexModelCatalogJsonForConfig,
  buildCcSwitchImportUrlForConfig,
  getCcSwitchCodexModelCatalogFilenameForConfig,
} from "@code-proxy/domain/ccswitch/ccswitchImportLinks";
import type { CcSwitchImportConfigListItem } from "@code-proxy/domain/ccswitch/ccswitchImportConfigList";
import { ccSwitchConfigMatchesApiKeyPermissions } from "@code-proxy/domain/ccswitch/ccswitchImportCompatibility";
import { downloadTextAsFile } from "@code-proxy/domain";
import { LogContentModal } from "@features/log-content-viewer";
import { ErrorDetailModal } from "@features/log-content-viewer";
import type { ApiKeyFormValues } from "./types";
import { ApiKeysFilters } from "./components/ApiKeysFilters";
import type { SearchableCheckboxMultiSelectOption } from "@code-proxy/ui";

function normalizeFilterSelection(
  selected: string[],
  allowedOptions: SearchableCheckboxMultiSelectOption[],
): string[] | null {
  if (allowedOptions.length === 0) return null;
  if (selected.length === allowedOptions.length) return null;
  return selected;
}

/**
 * Derive a filtered selection that contains only values still present
 * in the current options — prevents stale orphaned selections from
 * silently producing empty result sets after CRUD changes.
 */
function useStaleSelection(
  selected: string[] | null,
  options: { value: string }[],
): string[] | null {
  return useMemo(() => {
    if (selected === null) return null;
    if (options.length === 0) return null;
    const allowed = new Set(options.map((o) => o.value));
    const filtered = selected.filter((v) => allowed.has(v));
    return filtered.length > 0 ? filtered : [];
  }, [selected, options]);
}

export function ApiKeysPage() {
  const { t, i18n } = useTranslation();
  const { notify } = useToast();
  const auth = useOptionalAuth();

  const [entries, setEntries] = useState<ApiKeyEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [selectedNames, setSelectedNames] = useState<string[] | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<string[] | null>(null);
  const [selectedChannelGroups, setSelectedChannelGroups] = useState<string[] | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [editEntryKey, setEditEntryKey] = useState<string | null>(null);
  const [deleteEntryKey, setDeleteEntryKey] = useState<string | null>(null);
  const [deleteLogsOnDelete, setDeleteLogsOnDelete] = useState(true);
  const [ccSwitchImportEntry, setCcSwitchImportEntry] = useState<ApiKeyEntry | null>(null);
  const [ccSwitchImportConfigs, setCcSwitchImportConfigs] = useState<
    CcSwitchImportConfigListItem[]
  >([]);
  const [copiedCcSwitchImportConfigId, setCopiedCcSwitchImportConfigId] = useState<string | null>(
    null,
  );
  const copiedCcSwitchImportTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saving, setSaving] = useState(false);
  const [permissionProfiles, setPermissionProfiles] = useState<ApiKeyPermissionProfile[]>([]);
  const [form, setForm] = useState<ApiKeyFormValues>(() => makeEmptyApiKeyForm());
  const { channelGroupItems, channelGroupByName, refreshPermissionOptions } =
    useApiKeyPermissionOptions();
  const {
    usageViewKey,
    usageViewName,
    usageLoading,
    usageTotalCount,
    usageCurrentPage,
    usagePageSize,
    setUsagePageSize,
    usageLastUpdatedText,
    usageTimeRange,
    setUsageTimeRange,
    usageChannelQuery,
    setUsageChannelQuery,
    usageChannelGroupQuery,
    setUsageChannelGroupQuery,
    usageModelQuery,
    setUsageModelQuery,
    usageStatusFilter,
    setUsageStatusFilter,
    usageContentModalOpen,
    setUsageContentModalOpen,
    usageContentModalLogId,
    usageContentModalTab,
    usageErrorModalOpen,
    setUsageErrorModalOpen,
    usageErrorModalLogId,
    usageErrorModalModel,
    usageLogColumns,
    usageRows,
    usageTotalPages,
    usageChannelOptions,
    usageChannelGroupOptions,
    usageModelOptions,
    fetchUsageLogs,
    handleViewUsage,
    closeUsageModal,
  } = useApiKeyUsageView({ channelGroupByName });

  /* ─── load ─── */

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const [entriesData, legacyKeys, profilesData, configsData] = await Promise.all([
        apiKeyEntriesApi.list(),
        apiKeysApi.list().catch(() => [] as string[]),
        apiKeyPermissionProfilesApi.list().catch(() => [] as ApiKeyPermissionProfile[]),
        ccSwitchImportConfigsApi.list().catch(() => [] as CcSwitchImportConfigListItem[]),
      ]);
      setPermissionProfiles(profilesData);
      setCcSwitchImportConfigs(configsData);

      // Auto-migrate: old api-keys not in api-key-entries get added as unnamed entries
      const entryKeySet = new Set(entriesData.map((e) => e.key));
      const newEntries = legacyKeys
        .filter((k: string) => k && !entryKeySet.has(k))
        .map((k: string): ApiKeyEntry => ({ key: k, "created-at": new Date().toISOString() }));

      let finalEntries: ApiKeyEntry[];
      if (newEntries.length > 0) {
        const merged = [...entriesData, ...newEntries];
        try {
          await apiKeyEntriesApi.replace(merged);
          notify({
            type: "success",
            message: t("api_keys_page.auto_import", { count: newEntries.length }),
          });
        } catch {
          // silent
        }
        finalEntries = merged;
      } else {
        finalEntries = entriesData;
      }
      setEntries(finalEntries);
      // Load models after entries are available (needs a valid API key)
      void refreshPermissionOptions();
    } catch (err: unknown) {
      notify({
        type: "error",
        message: err instanceof Error ? err.message : t("api_keys_page.load_failed"),
      });
    } finally {
      setLoading(false);
    }
  }, [notify, refreshPermissionOptions, t]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  useEffect(
    () => () => {
      if (copiedCcSwitchImportTimerRef.current) {
        clearTimeout(copiedCcSwitchImportTimerRef.current);
      }
    },
    [],
  );

  const showCopiedCcSwitchImportState = useCallback((configId: string) => {
    setCopiedCcSwitchImportConfigId(configId);
    if (copiedCcSwitchImportTimerRef.current) {
      clearTimeout(copiedCcSwitchImportTimerRef.current);
    }
    copiedCcSwitchImportTimerRef.current = setTimeout(() => {
      setCopiedCcSwitchImportConfigId(null);
      copiedCcSwitchImportTimerRef.current = null;
    }, 1800);
  }, []);

  const permissionProfileById = useMemo(
    () => new Map(permissionProfiles.map((profile) => [profile.id, profile])),
    [permissionProfiles],
  );

  const permissionProfileOptions = useMemo(() => {
    const options = [
      {
        value: "",
        label: t("api_keys_page.permission_profile_unrestricted"),
      },
      ...permissionProfiles.map((profile) => ({
        value: profile.id,
        label: profile.name,
      })),
    ];
    if (
      form.permissionProfileId === CUSTOM_PERMISSION_PROFILE_ID &&
      !options.some((option) => option.value === CUSTOM_PERMISSION_PROFILE_ID)
    ) {
      options.push({
        value: CUSTOM_PERMISSION_PROFILE_ID,
        label: t("api_keys_page.permission_profile_custom_keep"),
      });
    }
    return options;
  }, [form.permissionProfileId, permissionProfiles, t]);

  const selectedPermissionProfile = (profileId: string) =>
    profileId ? (permissionProfileById.get(profileId) ?? null) : null;

  /* ─── filter options & logic ─── */

  const nameOptions = useMemo<SearchableCheckboxMultiSelectOption[]>(() => {
    const names = new Set<string>();
    entries.forEach((e) => names.add(e.name || ""));
    return Array.from(names)
      .sort((a, b) => {
        if (a === "" && b !== "") return 1;
        if (a !== "" && b === "") return -1;
        return a.localeCompare(b);
      })
      .map((n) => ({
        value: n,
        label: n || t("api_keys_page.unnamed"),
        searchText: n || t("api_keys_page.unnamed"),
      }));
  }, [entries, t]);

  const keyOptions = useMemo<SearchableCheckboxMultiSelectOption[]>(() => {
    return entries.map((e) => ({
      value: e.key,
      label: `${e.name || t("api_keys_page.unnamed")} (${maskApiKey(e.key)})`,
      searchText: `${e.name || ""} ${e.key}`,
    }));
  }, [entries, t]);

  const channelGroupOptions = useMemo<SearchableCheckboxMultiSelectOption[]>(() => {
    const groups = new Set<string>();
    entries.forEach((e) => e["allowed-channel-groups"]?.forEach((g) => groups.add(g)));
    return Array.from(groups)
      .sort()
      .map((g) => ({ value: g, label: g, searchText: g }));
  }, [entries]);

  // Strip orphaned selections after CRUD changes (fix #1)
  const effectiveNames = useStaleSelection(selectedNames, nameOptions);
  const effectiveKeys = useStaleSelection(selectedKeys, keyOptions);
  const effectiveChannelGroups = useStaleSelection(selectedChannelGroups, channelGroupOptions);

  const hasActiveFilters =
    effectiveNames !== null || effectiveKeys !== null || effectiveChannelGroups !== null;

  const resetFilters = useCallback(() => {
    setSelectedNames(null);
    setSelectedKeys(null);
    setSelectedChannelGroups(null);
  }, []);

  const clearNamesFilter = useCallback(() => setSelectedNames(null), []);
  const clearKeysFilter = useCallback(() => setSelectedKeys(null), []);
  const clearChannelGroupsFilter = useCallback(() => setSelectedChannelGroups(null), []);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (effectiveNames && !effectiveNames.includes(entry.name || "")) return false;
      if (effectiveKeys && !effectiveKeys.includes(entry.key)) return false;
      if (effectiveChannelGroups) {
        const entryGroups = entry["allowed-channel-groups"] || [];
        if (entryGroups.length > 0 && !effectiveChannelGroups.some((g) => entryGroups.includes(g)))
          return false;
      }
      return true;
    });
  }, [entries, effectiveNames, effectiveKeys, effectiveChannelGroups]);

  /* ─── index lookup by key (for filtered → original mapping) ─── */

  const entryIndexByKey = useMemo(
    () => new Map(entries.map((e, i) => [e.key, i])),
    [entries],
  );

  const resolveOriginalIndex = useCallback(
    (filteredIndex: number) => {
      const entry = filteredEntries[filteredIndex];
      return entry ? (entryIndexByKey.get(entry.key) ?? -1) : -1;
    },
    [filteredEntries, entryIndexByKey],
  );

  /* ─── toggle disable ─── */

  const handleToggleDisable = async (index: number) => {
    if (index < 0 || index >= entries.length) return;
    const entry = entries[index];
    const updated = { ...entry, disabled: !entry.disabled };
    const newEntries = [...entries];
    newEntries[index] = updated;

    try {
      await apiKeyEntriesApi.replace(newEntries);
      setEntries(newEntries);
      notify({
        type: "success",
        message: updated.disabled
          ? t("api_keys_page.disabled_toast", { name: entry.name || t("api_keys_page.unnamed") })
          : t("api_keys_page.enabled_toast", { name: entry.name || t("api_keys_page.unnamed") }),
      });
    } catch (err: unknown) {
      notify({
        type: "error",
        message: err instanceof Error ? err.message : t("api_keys_page.operation_failed"),
      });
    }
  };

  /* ─── create ─── */

  const handleOpenCreate = () => {
    const next = makeEmptyApiKeyForm(generateApiKey());
    setForm(next);
    setShowCreate(true);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      notify({ type: "error", message: t("api_keys_page.name_required") });
      return;
    }
    if (!form.key.trim()) {
      notify({ type: "error", message: t("api_keys_page.key_empty") });
      return;
    }
    setSaving(true);
    try {
      const newEntry: ApiKeyEntry = {
        key: form.key.trim(),
        name: form.name.trim(),
        "created-at": new Date().toISOString(),
      };
      const profiledEntry = applyApiKeyPermissionProfile(
        newEntry,
        selectedPermissionProfile(form.permissionProfileId),
      );
      await apiKeyEntriesApi.replace([...entries, profiledEntry]);
      notify({ type: "success", message: t("api_keys_page.created_success") });
      setShowCreate(false);
      await loadEntries();
    } catch (err: unknown) {
      notify({
        type: "error",
        message: err instanceof Error ? err.message : t("api_keys_page.create_failed"),
      });
    } finally {
      setSaving(false);
    }
  };

  /* ─── edit ─── */

  const handleOpenEdit = (index: number) => {
    if (index < 0 || index >= entries.length) return;
    const entry = entries[index];
    setEditEntryKey(entry.key);
    const next = {
      name: entry.name || "",
      key: entry.key,
      permissionProfileId: resolveEntryPermissionProfileId(entry, permissionProfiles),
      dailyLimit: entry["daily-limit"]?.toString() || "",
      totalQuota: entry["total-quota"]?.toString() || "",
      spendingLimit: entry["spending-limit"]?.toString() || "",
      concurrencyLimit: entry["concurrency-limit"]?.toString() || "",
      rpmLimit: entry["rpm-limit"]?.toString() || "",
      tpmLimit: entry["tpm-limit"]?.toString() || "",
      allowedModels: entry["allowed-models"] || [],
      allowedChannels: entry["allowed-channels"] || [],
      allowedChannelGroups: entry["allowed-channel-groups"] || [],
      useExactChannelRestrictions: (entry["allowed-channels"] || []).length > 0,
      systemPrompt: entry["system-prompt"] || "",
    };
    setForm(next);
  };

  const handleEdit = async () => {
    if (editEntryKey === null) return;
    const editIdx = entries.findIndex((e) => e.key === editEntryKey);
    if (editIdx === -1) {
      notify({ type: "error", message: t("api_keys_page.entry_not_found") });
      setEditEntryKey(null);
      return;
    }
    if (!form.name.trim()) {
      notify({ type: "error", message: t("api_keys_page.name_required") });
      return;
    }
    const originalKey = entries[editIdx].key;
    const newKey = form.key.trim();
    if (!newKey) {
      notify({ type: "error", message: t("api_keys_page.key_empty") });
      return;
    }
    setSaving(true);
    try {
      await apiKeyEntriesApi.update({
        id: entries[editIdx].id,
        index: editIdx,
        value: {
          ...(newKey !== originalKey ? { key: newKey } : {}),
          name: form.name.trim(),
          ...(form.permissionProfileId === CUSTOM_PERMISSION_PROFILE_ID
            ? {
                "permission-profile-id": entries[editIdx]["permission-profile-id"] ?? "",
                "daily-limit": entries[editIdx]["daily-limit"] ?? 0,
                "total-quota": entries[editIdx]["total-quota"] ?? 0,
                "spending-limit": entries[editIdx]["spending-limit"] ?? 0,
                "concurrency-limit": entries[editIdx]["concurrency-limit"] ?? 0,
                "rpm-limit": entries[editIdx]["rpm-limit"] ?? 0,
                "tpm-limit": entries[editIdx]["tpm-limit"] ?? 0,
                "allowed-models": entries[editIdx]["allowed-models"] ?? [],
                "allowed-channels": entries[editIdx]["allowed-channels"] ?? [],
                "allowed-channel-groups": entries[editIdx]["allowed-channel-groups"] ?? [],
                "system-prompt": entries[editIdx]["system-prompt"] ?? "",
              }
            : applyApiKeyPermissionProfile(
                {} as ApiKeyEntry,
                selectedPermissionProfile(form.permissionProfileId),
              )),
        },
      });
      notify({ type: "success", message: t("api_keys_page.updated_success") });
      setEditEntryKey(null);
      await loadEntries();
    } catch (err: unknown) {
      notify({
        type: "error",
        message: err instanceof Error ? err.message : t("api_keys_page.update_failed"),
      });
    } finally {
      setSaving(false);
    }
  };

  /* ─── delete ─── */

  const handleDelete = async () => {
    if (deleteEntryKey === null) return;
    const deleteIdx = entries.findIndex((e) => e.key === deleteEntryKey);
    if (deleteIdx === -1) {
      notify({ type: "error", message: t("api_keys_page.entry_not_found") });
      setDeleteEntryKey(null);
      return;
    }
    setSaving(true);
    try {
      const response = (await apiKeyEntriesApi.delete({
        id: entries[deleteIdx]?.id,
        index: deleteIdx,
        deleteLogs: deleteLogsOnDelete,
      })) as { logs_deleted?: number } | undefined;
      const logsDeleted =
        typeof response?.logs_deleted === "number" ? response.logs_deleted : undefined;
      notify({
        type: "success",
        message:
          deleteLogsOnDelete && typeof logsDeleted === "number"
            ? t("api_keys_page.deleted_success_with_logs", { count: logsDeleted })
            : t("api_keys_page.deleted_success"),
      });
      setDeleteEntryKey(null);
      setDeleteLogsOnDelete(true);
      await loadEntries();
    } catch (err: unknown) {
      notify({
        type: "error",
        message: err instanceof Error ? err.message : t("api_keys_page.delete_failed"),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDelete = (index: number) => {
    if (index < 0 || index >= entries.length) return;
    setDeleteLogsOnDelete(true);
    setDeleteEntryKey(entries[index].key);
  };

  /* ─── copy ─── */

  const handleCopy = async (key: string) => {
    if (await copyTextToClipboard(key)) {
      notify({ type: "success", message: t("api_keys_page.copied_toast") });
      return;
    }
    notify({ type: "error", message: t("api_keys_page.copy_failed") });
  };

  const compatibleConfigs = useMemo(() => {
    if (!ccSwitchImportEntry) return [];
    return ccSwitchImportConfigs.filter((config) =>
      ccSwitchConfigMatchesApiKeyPermissions(config, ccSwitchImportEntry),
    );
  }, [ccSwitchImportEntry, ccSwitchImportConfigs]);

  const handleOpenCcSwitchImport = useCallback((entry: ApiKeyEntry) => {
    setCopiedCcSwitchImportConfigId(null);
    setCcSwitchImportEntry(entry);
  }, []);

  const buildImportUrlWithConfig = useCallback(
    (config: CcSwitchImportConfigListItem) => {
      if (!ccSwitchImportEntry) return "";

      const entryGroups = (ccSwitchImportEntry["allowed-channel-groups"] ?? [])
        .map((g) =>
          String(g ?? "")
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean);
      const matchingGroup =
        config.allowedChannelGroups.find((g) => entryGroups.includes(g)) ??
        config.allowedChannelGroups[0] ??
        "";
      const groupItem = channelGroupItems.find(
        (g) =>
          String(g.name ?? "")
            .trim()
            .toLowerCase() === matchingGroup,
      );
      const routePath = Array.isArray(groupItem?.["path-routes"])
        ? groupItem["path-routes"][0]
        : "";
      const baseApiUrl = auth?.state.apiBase || detectApiBaseFromLocation();
      const baseUrl = appendCcSwitchRoutePath(baseApiUrl, config.routePath || routePath || "");

      return buildCcSwitchImportUrlForConfig({
        apiKey: ccSwitchImportEntry.key,
        baseUrl,
        config,
        configs: ccSwitchImportConfigs,
        providerName: ccSwitchImportEntry.name,
        usageBaseUrl: baseApiUrl,
        usageLanguage: i18n.language,
      });
    },
    [ccSwitchImportEntry, ccSwitchImportConfigs, channelGroupItems, auth, i18n.language],
  );

  const handleImportWithConfig = useCallback(
    (config: CcSwitchImportConfigListItem) => {
      const url = buildImportUrlWithConfig(config);
      if (!url) return;

      openCcSwitchImportUrl(url, {
        onProtocolUnavailable: () =>
          notify({ type: "error", message: t("ccswitch.protocol_unavailable") }),
      });
      setCcSwitchImportEntry(null);
    },
    [buildImportUrlWithConfig, notify, t],
  );

  const handleCopyCcSwitchImportLink = useCallback(
    async (config: CcSwitchImportConfigListItem) => {
      const url = buildImportUrlWithConfig(config);
      if (!url) return;

      if (await copyTextToClipboard(url)) {
        showCopiedCcSwitchImportState(config.id);
        notify({ type: "success", message: t("ccswitch.copy_import_link_success") });
        return;
      }
      notify({ type: "error", message: t("ccswitch.copy_import_link_failed") });
    },
    [buildImportUrlWithConfig, notify, showCopiedCcSwitchImportState, t],
  );

  const handleDownloadCcSwitchCodexCatalog = useCallback(
    (config: CcSwitchImportConfigListItem) => {
      const catalogJson = buildCcSwitchCodexModelCatalogJsonForConfig(config);
      if (!catalogJson) return;

      downloadTextAsFile(catalogJson, getCcSwitchCodexModelCatalogFilenameForConfig(config));
      notify({ type: "success", message: t("ccswitch.download_codex_model_catalog_success") });
    },
    [notify, t],
  );

  /* ─── column definitions ─── */

  const apiKeyColumns = useMemo(
    () =>
      createApiKeyColumns({
        t,
        onToggleDisable: (index) => void handleToggleDisable(resolveOriginalIndex(index)),
        onViewUsage: handleViewUsage,
        onCopy: (key) => void handleCopy(key),
        onImportToCcSwitch: handleOpenCcSwitchImport,
        onEdit: (index) => handleOpenEdit(resolveOriginalIndex(index)),
        onDelete: (index) => handleOpenDelete(resolveOriginalIndex(index)),
      }),
    [
      handleToggleDisable,
      handleViewUsage,
      handleCopy,
      handleOpenCcSwitchImport,
      handleOpenEdit,
      handleOpenDelete,
      resolveOriginalIndex,
      t,
    ],
  );

  /* ─── main render ─── */

  return (
    <div className="space-y-6">
      <Card
        title={t("api_keys_page.title")}
        description={t("api_keys_page.description")}
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void loadEntries()}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              {t("api_keys_page.refresh")}
            </Button>
            <Button variant="primary" size="sm" onClick={handleOpenCreate}>
              <Plus size={14} />
              {t("api_keys_page.create_key")}
            </Button>
          </div>
        }
        loading={loading}
      >
        {entries.length === 0 ? (
          <EmptyState
            title={t("api_keys_page.no_keys")}
            description={t("api_keys_page.no_keys_desc")}
            icon={<KeyRound size={32} className="text-slate-400" />}
          />
        ) : (
          <>
            <ApiKeysFilters
              nameOptions={nameOptions}
              selectedNames={effectiveNames}
              onNamesChange={(v) => setSelectedNames(normalizeFilterSelection(v, nameOptions))}
              onNamesClear={clearNamesFilter}
              keyOptions={keyOptions}
              selectedKeys={effectiveKeys}
              onKeysChange={(v) => setSelectedKeys(normalizeFilterSelection(v, keyOptions))}
              onKeysClear={clearKeysFilter}
              channelGroupOptions={channelGroupOptions}
              selectedChannelGroups={effectiveChannelGroups}
              onChannelGroupsChange={(v) =>
                setSelectedChannelGroups(normalizeFilterSelection(v, channelGroupOptions))
              }
              onChannelGroupsClear={clearChannelGroupsFilter}
              onResetFilters={resetFilters}
              hasActiveFilters={hasActiveFilters}
            />
            <DataTable<ApiKeyEntry>
              tableId="api-keys"
              rows={filteredEntries}
              columns={apiKeyColumns}
            rowKey={(row) => row.key}
            rowHeight={44}
            height="h-[calc(100dvh-260px)] max-h-[70vh]"
            minHeight="min-h-[320px]"
            minWidth="min-w-[1820px]"
            caption={t("api_keys_page.table_caption")}
            emptyText={t("api_keys_page.no_api_keys")}
            rowClassName={(row) => (row.disabled ? "opacity-50" : "")}
          />
          </>
        )}
      </Card>

      <ApiKeyFormModal
        t={t}
        open={showCreate}
        editMode={false}
        saving={saving}
        form={form}
        setForm={setForm}
        permissionProfileOptions={permissionProfileOptions}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreate}
        regenerateKey={() => setForm((prev) => ({ ...prev, key: generateApiKey() }))}
      />

      <ApiKeyFormModal
        t={t}
        open={editEntryKey !== null}
        editMode
        saving={saving}
        form={form}
        setForm={setForm}
        permissionProfileOptions={permissionProfileOptions}
        onClose={() => setEditEntryKey(null)}
        onSubmit={handleEdit}
        regenerateKey={() => setForm((prev) => ({ ...prev, key: generateApiKey() }))}
      />

      <DeleteApiKeyModal
        t={t}
        entry={deleteEntryKey === null ? null : (entries.find((e) => e.key === deleteEntryKey) ?? null)}
        open={deleteEntryKey !== null}
        saving={saving}
        deleteLogsOnDelete={deleteLogsOnDelete}
        onDeleteLogsChange={setDeleteLogsOnDelete}
        onClose={() => {
          setDeleteEntryKey(null);
          setDeleteLogsOnDelete(true);
        }}
        onConfirm={handleDelete}
      />

      <CcSwitchImportCardList
        open={ccSwitchImportEntry !== null}
        configs={compatibleConfigs}
        copiedConfigId={copiedCcSwitchImportConfigId}
        onCopyLink={(config) => void handleCopyCcSwitchImportLink(config)}
        onDownloadCatalog={handleDownloadCcSwitchCodexCatalog}
        onSelect={handleImportWithConfig}
        onClose={() => {
          setCcSwitchImportEntry(null);
          setCopiedCcSwitchImportConfigId(null);
        }}
      />

      <ApiKeyUsageModal
        open={usageViewKey !== null}
        onClose={closeUsageModal}
        usageViewName={usageViewName}
        maskedKey={usageViewKey ? maskApiKey(usageViewKey) : ""}
        usageTotalCount={usageTotalCount}
        usageTimeRange={usageTimeRange}
        setUsageTimeRange={setUsageTimeRange}
        fetchUsageLogs={fetchUsageLogs}
        usagePageSize={usagePageSize}
        usageLoading={usageLoading}
        usageLastUpdatedText={usageLastUpdatedText}
        usageChannelGroupQuery={usageChannelGroupQuery}
        setUsageChannelGroupQuery={setUsageChannelGroupQuery}
        setUsageChannelQuery={setUsageChannelQuery}
        usageChannelGroupOptions={usageChannelGroupOptions}
        usageChannelQuery={usageChannelQuery}
        setUsageChannelQueryDirect={setUsageChannelQuery}
        usageChannelOptions={usageChannelOptions}
        usageModelQuery={usageModelQuery}
        setUsageModelQuery={setUsageModelQuery}
        usageModelOptions={usageModelOptions}
        usageStatusFilter={usageStatusFilter}
        setUsageStatusFilter={setUsageStatusFilter}
        usageLogColumns={usageLogColumns}
        usageRows={usageRows}
        usageCurrentPage={usageCurrentPage}
        usageTotalPages={usageTotalPages}
        setUsagePageSize={setUsagePageSize}
      />

      <LogContentModal
        open={usageContentModalOpen}
        logId={usageContentModalLogId}
        initialTab={usageContentModalTab}
        onClose={() => setUsageContentModalOpen(false)}
      />
      <ErrorDetailModal
        open={usageErrorModalOpen}
        logId={usageErrorModalLogId}
        model={usageErrorModalModel}
        onClose={() => setUsageErrorModalOpen(false)}
      />
    </div>
  );
}
