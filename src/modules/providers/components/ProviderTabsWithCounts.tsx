import { type ReactNode } from "react";
import { Cloud } from "lucide-react";
import iconGemini from "@/assets/icons/gemini.svg";
import iconClaude from "@/assets/icons/claude.svg";
import iconCodex from "@/assets/icons/codex.svg";
import iconVertex from "@/assets/icons/vertex.svg";
import iconAmp from "@/assets/icons/amp.svg";
import iconOpenai from "@/assets/icons/openai.svg";
import iconOpenCodeDark from "@/assets/icons/opencode-dark.svg";
import iconOpenCodeLight from "@/assets/icons/opencode-light.svg";
import { TabsList, TabsTrigger } from "@/modules/ui/Tabs";

export type ProviderTabId =
  | "gemini"
  | "claude"
  | "codex"
  | "opencode-go"
  | "vertex"
  | "bedrock"
  | "openai"
  | "ampcode";

export type ProviderTabMeta = {
  id: ProviderTabId;
  label: string;
  icon?: ReactNode;
  count: number | null;
};

const TAB_META: Record<ProviderTabId, { icon: ReactNode }> = {
  gemini: { icon: <img src={iconGemini} alt="" className="size-4" /> },
  claude: { icon: <img src={iconClaude} alt="" className="size-4" /> },
  codex: {
    icon: (
      <>
        <img src={iconCodex} alt="" className="size-4 dark:hidden" />
        <img src={iconCodex} alt="" className="hidden size-4 dark:block" />
      </>
    ),
  },
  "opencode-go": {
    icon: (
      <>
        <img src={iconOpenCodeLight} alt="" className="size-4 dark:hidden" />
        <img src={iconOpenCodeDark} alt="" className="hidden size-4 dark:block" />
      </>
    ),
  },
  vertex: { icon: <img src={iconVertex} alt="" className="size-4" /> },
  bedrock: { icon: <Cloud size={16} /> },
  openai: {
    icon: (
      <>
        <img src={iconOpenai} alt="" className="size-4 dark:hidden" />
        <img src={iconOpenai} alt="" className="hidden size-4 dark:block" />
      </>
    ),
  },
  ampcode: { icon: <img src={iconAmp} alt="" className="size-4" /> },
};

type ProviderTabsWithCountsProps = {
  tabs: ProviderTabMeta[];
  value: ProviderTabId;
  onValueChange: (value: ProviderTabId) => void;
};

export function ProviderTabsWithCounts({
  tabs,
  value,
  onValueChange,
}: ProviderTabsWithCountsProps) {
  return (
    <div className="flex shrink-0">
      <TabsList>
        {tabs.map((tab) => {
          const icon = tab.icon ?? TAB_META[tab.id]?.icon ?? null;
          return (
            <TabsTrigger key={tab.id} value={tab.id}>
              {icon}
              {tab.label}
              {tab.count !== null ? (
                <span
                  className={
                    value === tab.id
                      ? "ml-0.5 rounded-full bg-white/90 px-1.5 text-[10px] font-medium text-slate-700 dark:bg-white/15 dark:text-white"
                      : "ml-0.5 rounded-full bg-slate-200/70 px-1.5 text-[10px] font-medium text-slate-500 dark:bg-white/10 dark:text-white/60"
                  }
                >
                  {tab.count}
                </span>
              ) : null}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </div>
  );
}
