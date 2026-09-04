/** Fallback login-page content, used when the CMS tables are empty or unreachable. */

export interface Entry {
  text: string;
  source: string;
}

export const DEFAULT_HERO = {
  title: "The Executive Committee portal.",
  subtitle:
    "Minutes, action items, portfolio work and baseline obligations for the 2026–2028 committee.",
};

export const DEFAULT_FACTS: Entry[] = [
  {
    text: "The Indian Roller is the state bird of Telangana, Andhra Pradesh, Karnataka and Odisha — four states claim the same blue.",
    source: "Coracias benghalensis · resident, common on wires",
  },
  {
    text: "A Coppersmith Barbet's call is measured at roughly 108 notes a minute, and it keeps that rate up for several minutes at a stretch.",
    source: "Psilopogon haemacephalus · resident",
  },
  {
    text: "Painted Storks nest colonially and feed by touch — the half-open bill sweeps through water until it closes on contact.",
    source: "Mycteria leucocephala · resident, breeds Jul–Oct",
  },
  {
    text: "The Indian Pitta arrives with the monsoon and is heard far more often than it is seen. Its two-note whistle carries at dusk.",
    source: "Pitta brachyura · breeding visitor",
  },
  {
    text: "Spot-billed Pelicans breed at only a handful of colonies in south India. Nelapattu and Kolleru hold the largest.",
    source: "Pelecanus philippensis · near-threatened",
  },
  {
    text: "Bar-headed Geese cross the Himalaya on migration, flying at altitudes where oxygen is a third of sea-level.",
    source: "Anser indicus · winter visitor",
  },
];

export const DEFAULT_JOKES: Entry[] = [
  {
    text: "“Nothing rare here today,” said the member who had left the hide four minutes before the Pitta walked out.",
    source: "Every walk, ever",
  },
  {
    text: "A birder's estimate of distance: fifty metres, give or take fifty metres.",
    source: "Field note, unattributed",
  },
  {
    text: "The bird was almost certainly a warbler. The photograph confirms it was almost certainly a leaf.",
    source: "WhatsApp group, 6:42 am",
  },
  {
    text: "Two birders, three identifications. The third belongs to whoever brought the flask.",
    source: "Osman Sagar, any Sunday",
  },
  {
    text: "The rarest bird in Hyderabad is the one that waits until you have packed the scope.",
    source: "Collected wisdom",
  },
  {
    text: "Attendance at the 5 am meeting point is perfect. Attendance at the 5 pm minutes review is not.",
    source: "The Secretary",
  },
];

export const DEFAULT_QUOTES: Entry[] = [
  {
    text: "A bird does not sing because it has an answer. It sings because it has a song.",
    source: "Chinese proverb",
  },
  {
    text: "In order to see birds it is necessary to become a part of the silence.",
    source: "Robert Lynd",
  },
  {
    text: "Birds are indicators of the environment. If they are in trouble, we know we'll soon be in trouble.",
    source: "Roger Tory Peterson",
  },
  {
    text: "The bird of paradise alights only upon the hand that does not grasp.",
    source: "John Berry",
  },
  {
    text: "I hope you love birds too. It is economical. It saves going to heaven.",
    source: "Emily Dickinson",
  },
  {
    text: "To watch birds is to notice, and to notice is the beginning of care.",
    source: "Collected, Deccan Birders",
  },
];

export const TILE_COLORS = [
  "#3078C0",
  "#00A860",
  "#D9A62C",
  "#2A9D8F",
  "#7B5EA7",
  "#123A5E",
  "#3078C0",
  "#C0392B",
  "#00A860",
];
