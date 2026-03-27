import Image from "next/image";

interface GameIconProps {
  slug: string;
  size?: number;
  className?: string;
}

/**
 * Maps PandaScore videogame slugs to icon filenames in /public/game-icons/.
 * Falls back to "other.png" for any unrecognized slug.
 */
const SLUG_TO_ICON: Record<string, string> = {
  // League of Legends
  "league-of-legends": "lol",
  lol: "lol",

  // LoL: Wild Rift
  "league-of-legends-wild-rift": "lolwildrift",
  "lol-wild-rift": "lolwildrift",
  lolwildrift: "lolwildrift",

  // Counter-Strike
  "cs-go": "cs2",
  csgo: "cs2",
  cs2: "cs2",
  "counter-strike-2": "cs2",

  // Dota 2
  "dota-2": "dota2",
  dota2: "dota2",

  // Valorant
  valorant: "valorant",

  // Overwatch
  overwatch: "overwatch",
  "overwatch-2": "overwatch",
  ow: "overwatch",

  // FIFA / EA FC
  fifa: "fifa",
  "ea-sports-fc": "fifa",
  fc: "fifa",

  // PUBG
  pubg: "pubg",
  "pubg-mobile": "pubg",

  // Rainbow Six
  "r6-siege": "rainbow6",
  r6siege: "rainbow6",
  "rainbow-6-siege": "rainbow6",
  "rainbow-six-siege": "rainbow6",

  // Rocket League
  "rocket-league": "rocketleauge",
  rl: "rocketleauge",

  // StarCraft 2
  "starcraft-2": "starcraft2",
  sc2: "starcraft2",
  starcraft: "starcraft2",

  // StarCraft: Brood War
  "starcraft-brood-war": "starcraftbroodwar",
  "sc-bw": "starcraftbroodwar",

  // Mobile Legends
  "mobile-legends": "mlbb",
  mlbb: "mlbb",
  "mobile-legends-bang-bang": "mlbb",

  // Warcraft 3
  "warcraft-3": "warcraft",
  warcraft3: "warcraft",

  // World of Warcraft
  "world-of-warcraft": "worldofwarcraft",
  wow: "worldofwarcraft",

  // Call of Duty
  "call-of-duty": "callofduty",
  cod: "callofduty",
  "cod-mw": "callofduty",
  codmw: "callofduty",

  // King of Glory / Honor of Kings
  "king-of-glory": "kingofglory",
  kog: "kingofglory",
  "honor-of-kings": "kingofglory",
};

function getIconPath(slug: string): string {
  const key = slug.toLowerCase();
  const icon = SLUG_TO_ICON[key];
  return `/game-icons/${icon ? icon : "other"}.png`;
}

export function GameIcon({ slug, size = 16, className }: GameIconProps) {
  return (
    <Image
      src={getIconPath(slug)}
      alt={slug}
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: "contain" }}
      unoptimized
    />
  );
}
