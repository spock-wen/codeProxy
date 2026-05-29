import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import type { OpenAIDraft } from "@/modules/providers/providers-helpers";
import { Button } from "@/modules/ui/Button";
import { Modal } from "@/modules/ui/Modal";
import type { ProxyPoolEntry } from "@/lib/http/apis/proxies";
import { OpenAIProviderBasicSection } from "@/modules/providers/components/OpenAIProviderBasicSection";
import { OpenAIKeyEntriesEditor } from "@/modules/providers/components/OpenAIKeyEntriesEditor";
import { OpenAIProviderModelsSection } from "@/modules/providers/components/OpenAIProviderModelsSection";

interface OpenAIProviderModalProps {
  open: boolean;
  editOpenAIIndex: number | null;
  openaiDraft: OpenAIDraft;
  setOpenaiDraft: Dispatch<SetStateAction<OpenAIDraft>>;
  openaiDraftError: string | null;
  closeOpenAIEditor: () => void;
  saveOpenAIDraft: () => Promise<void>;
  discovering: boolean;
  discoverModels: () => Promise<void>;
  applyDiscoveredModels: () => void;
  discoveredModels: { id: string; owned_by?: string }[];
  discoverSelected: Set<string>;
  setDiscoverSelected: Dispatch<SetStateAction<Set<string>>>;
  proxyPoolEntries: ProxyPoolEntry[];
  copyText: (text: string) => Promise<void>;
  maskApiKey: (value: string) => string;
}

export function OpenAIProviderModal({
  open,
  editOpenAIIndex,
  openaiDraft,
  setOpenaiDraft,
  openaiDraftError,
  closeOpenAIEditor,
  saveOpenAIDraft,
  discovering,
  discoverModels,
  applyDiscoveredModels,
  discoveredModels,
  discoverSelected,
  setDiscoverSelected,
  proxyPoolEntries,
  copyText,
  maskApiKey,
}: OpenAIProviderModalProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) {
      setDiscoverSelected(new Set());
    }
  }, [editOpenAIIndex, open, setDiscoverSelected]);

  return (
    <Modal
      open={open}
      title={
        editOpenAIIndex === null
          ? t("providers.add_openai_provider")
          : t("providers.edit_openai_provider")
      }
      description={t("providers.openai_config_desc")}
      onClose={closeOpenAIEditor}
      footer={
        <div className="flex flex-wrap items-center gap-2">
          {openaiDraftError ? (
            <span className="text-sm font-semibold text-rose-700 dark:text-rose-200">
              {openaiDraftError}
            </span>
          ) : null}
          <Button variant="secondary" onClick={closeOpenAIEditor}>
            {t("providers.cancel")}
          </Button>
          <Button variant="primary" onClick={() => void saveOpenAIDraft()}>
            <Check size={14} />
            {t("providers.save")}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <OpenAIProviderBasicSection
          openaiDraft={openaiDraft}
          setOpenaiDraft={setOpenaiDraft}
        />

        <div className="border-t border-slate-200/60 pt-5 dark:border-neutral-800/60">
          <OpenAIKeyEntriesEditor
            openaiDraft={openaiDraft}
            setOpenaiDraft={setOpenaiDraft}
            proxyPoolEntries={proxyPoolEntries}
            copyText={copyText}
            maskApiKey={maskApiKey}
          />
        </div>

        <div className="border-t border-slate-200/60 pt-5 dark:border-neutral-800/60">
          <OpenAIProviderModelsSection
            openaiDraft={openaiDraft}
            setOpenaiDraft={setOpenaiDraft}
            discovering={discovering}
            discoverModels={discoverModels}
            applyDiscoveredModels={applyDiscoveredModels}
            discoveredModels={discoveredModels}
            discoverSelected={discoverSelected}
            setDiscoverSelected={setDiscoverSelected}
          />
        </div>
      </div>
    </Modal>
  );
}
