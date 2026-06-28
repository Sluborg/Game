// Top-of-screen guild header. A parchment/emblem banner with the title overlaid,
// replacing the plain kingdom topbar text. Reset lives here too.

import { Icon } from "./icons";

interface Props {
  onReset: () => void;
}

export function GuildBanner({ onReset }: Props) {
  return (
    <header className="guild-banner">
      <span className="guild-crest" aria-hidden>
        <Icon name="guildHall" size={26} />
      </span>
      <div className="guild-banner-titles">
        <span className="guild-banner-title">Guild Master</span>
        <span className="guild-banner-sub">Campaign</span>
      </div>
      <button className="btn btn-reset" onClick={onReset} title="Start over">
        ⟳ Reset
      </button>
    </header>
  );
}
