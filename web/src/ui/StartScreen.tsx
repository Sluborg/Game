// Landing screen: pick Campaign (the existing day/economy game) or the new
// standalone Combat Test. Navigation is via hash route (see Root.tsx).

interface Props {
  onPlayCampaign: () => void;
  onCombatTest: () => void;
}

export function StartScreen({ onPlayCampaign, onCombatTest }: Props) {
  return (
    <div className="start-screen">
      <div className="start-inner">
        <h1 className="start-title">👑 Godblood</h1>
        <p className="start-sub">Demigod kingdom — day by day.</p>

        <button className="start-card start-card-campaign" onClick={onPlayCampaign}>
          <span className="start-card-icon">🏰</span>
          <span className="start-card-text">
            <span className="start-card-name">Campaign</span>
            <span className="start-card-desc">Build your kingdom, recruit heroes, survive each day.</span>
          </span>
        </button>

        <button className="start-card start-card-test" onClick={onCombatTest}>
          <span className="start-card-icon">⚔️</span>
          <span className="start-card-text">
            <span className="start-card-name">Combat Test</span>
            <span className="start-card-desc">A standalone arena to watch the tick-based battle sim.</span>
          </span>
        </button>
      </div>
    </div>
  );
}
