// Root screen. Campaign Mode: a guild-master map game. The earlier kingdom/economy
// mode is retired — its game/ + components/ files remain in the tree (unused) for a
// follow-up cleanup PR, but are no longer rendered here.

import { useCampaign } from "./useCampaign";
import { GuildBanner } from "./components/campaign/GuildBanner";
import { TurnBar } from "./components/campaign/TurnBar";
import { AssetReport } from "./components/campaign/AssetReport";
import { CampaignMap } from "./components/campaign/CampaignMap";
import { AgentInspector } from "./components/campaign/AgentInspector";

export function App() {
  const c = useCampaign();
  return (
    <div className="app">
      <GuildBanner onReset={c.reset} />
      <main className="content">
        <TurnBar state={c.state} onEndTurn={c.endTurn} />
        <CampaignMap
          state={c.state}
          selectedAgentId={c.selectedAgentId}
          onSelectAgent={c.selectAgent}
          onMove={c.move}
        />
        <AgentInspector
          agent={c.selectedAgent}
          state={c.state}
          onAction={c.act}
          onDeselect={() => c.selectAgent(null)}
        />
        <AssetReport state={c.state} />
      </main>
    </div>
  );
}
