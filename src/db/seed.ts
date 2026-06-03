import bcrypt from "bcryptjs";
import { db, schema } from "./index";
import { LEAGUE_LADDER } from "@/lib/leagues";

async function main() {
  console.log("Seeding ReadLeague…");

  // Leagues — seed the 5 starter tiers. More auto-create as readers climb.
  // Tier 1 = top.
  const STARTERS = LEAGUE_LADDER.slice(0, 5); // Tuareg → Asante in upward order
  await db
    .insert(schema.leagues)
    .values(STARTERS.map((l, i) => ({
      id: l.id,
      name: l.name,
      championTitle: l.championTitle,
      threshold: l.threshold,
      uploadsRequired: l.uploadsRequired,
      tier: STARTERS.length - i, // tuareg=5, ..., asante=1
    })))
    .onConflictDoNothing();
  console.log("  ✓ Leagues (5 starters)");

  // Users
  const password = await bcrypt.hash("readmore123", 10);
  const userRows = [
    { email: "coord@readleague.app", handle: "coord", displayName: "Ama Coordinator", role: "coordinator" as const, leagueId: null,     weeklyPts: 0   },
    { email: "kojo@readleague.app",  handle: "kojo.reads", displayName: "Kojo Mensah", role: "reader" as const, leagueId: "yoruba",  weeklyPts: 7   },
    { email: "king@readleague.app",  handle: "king.osei",  displayName: "King Osei",   role: "reader" as const, leagueId: "yoruba",  weeklyPts: 25  },
    { email: "ama@readleague.app",   handle: "ama.a",      displayName: "Ama Asante",  role: "reader" as const, leagueId: "yoruba",  weeklyPts: 6   },
    { email: "kofi@readleague.app",  handle: "kofi.adu",   displayName: "Kofi Adu",    role: "reader" as const, leagueId: "yoruba",  weeklyPts: 5   },
    { email: "adwoa@readleague.app", handle: "adwoa.b",    displayName: "Adwoa Boateng", role: "reader" as const, leagueId: "asante", weeklyPts: 11 },
    { email: "yaw@readleague.app",   handle: "yaw.m",      displayName: "Yaw Mensah",  role: "reader" as const, leagueId: "tuareg",  weeklyPts: 3   },
    { email: "esi@readleague.app",   handle: "esi.o",      displayName: "Esi Owusu",   role: "reader" as const, leagueId: "tuareg",  weeklyPts: 4   },
  ];
  await db
    .insert(schema.users)
    .values(userRows.map((u) => ({ ...u, passwordHash: password, totalPts: u.weeklyPts * 4, booksRead: 2 })))
    .onConflictDoNothing();
  console.log("  ✓ Users (password for all: readmore123)");

  // Sample books — using free public-domain EPUBs from Standard Ebooks where possible.
  // These will actually open in the in-app reader.
  await db
    .insert(schema.books)
    .values([
      {
        title: "Pride and Prejudice",
        author: "Jane Austen",
        genre: "fiction",
        year: 1813,
        pages: 432,
        format: "EPUB",
        fileUrl: "https://standardebooks.org/ebooks/jane-austen/pride-and-prejudice/downloads/jane-austen_pride-and-prejudice.epub",
        description: "A witty comedy of manners that follows Elizabeth Bennet as she navigates issues of upbringing, morality, and marriage.",
      },
      {
        title: "The Adventures of Sherlock Holmes",
        author: "Arthur Conan Doyle",
        genre: "fiction",
        year: 1892,
        pages: 307,
        format: "EPUB",
        fileUrl: "https://standardebooks.org/ebooks/arthur-conan-doyle/the-adventures-of-sherlock-holmes/downloads/arthur-conan-doyle_the-adventures-of-sherlock-holmes.epub",
        description: "Twelve mysteries solved by the world's most famous detective, narrated by Dr. Watson.",
      },
      {
        title: "Frankenstein",
        author: "Mary Shelley",
        genre: "fiction",
        year: 1818,
        pages: 280,
        format: "EPUB",
        fileUrl: "https://standardebooks.org/ebooks/mary-shelley/frankenstein/downloads/mary-shelley_frankenstein.epub",
        description: "The original gothic horror — a young scientist creates life and faces its consequences.",
      },
      {
        title: "The Picture of Dorian Gray",
        author: "Oscar Wilde",
        genre: "fiction",
        year: 1890,
        pages: 254,
        format: "EPUB",
        fileUrl: "https://standardebooks.org/ebooks/oscar-wilde/the-picture-of-dorian-gray/downloads/oscar-wilde_the-picture-of-dorian-gray.epub",
        description: "A young man's portrait ages while he stays young — Wilde's exploration of beauty, vanity, and morality.",
      },
      {
        title: "Meditations",
        author: "Marcus Aurelius",
        genre: "self",
        year: 180,
        pages: 254,
        format: "EPUB",
        fileUrl: "https://standardebooks.org/ebooks/marcus-aurelius/meditations/george-long/downloads/marcus-aurelius_meditations_george-long.epub",
        description: "Personal writings of the Roman emperor on Stoic philosophy and self-improvement.",
      },
      {
        title: "On the Origin of Species",
        author: "Charles Darwin",
        genre: "sci",
        year: 1859,
        pages: 520,
        format: "EPUB",
        fileUrl: "https://standardebooks.org/ebooks/charles-darwin/on-the-origin-of-species/downloads/charles-darwin_on-the-origin-of-species.epub",
        description: "The foundational work of evolutionary biology.",
      },
      {
        title: "A Tale of Two Cities",
        author: "Charles Dickens",
        genre: "fiction",
        year: 1859,
        pages: 489,
        format: "EPUB",
        fileUrl: "https://standardebooks.org/ebooks/charles-dickens/a-tale-of-two-cities/downloads/charles-dickens_a-tale-of-two-cities.epub",
        description: "Set during the French Revolution — \"It was the best of times, it was the worst of times.\"",
      },
      {
        title: "The Art of War",
        author: "Sun Tzu",
        genre: "history",
        year: -500,
        pages: 80,
        format: "EPUB",
        fileUrl: "https://standardebooks.org/ebooks/sun-tzu/the-art-of-war/lionel-giles/downloads/sun-tzu_the-art-of-war_lionel-giles.epub",
        description: "Ancient Chinese military treatise — still applied today in business and strategy.",
      },
      {
        title: "Walden",
        author: "Henry David Thoreau",
        genre: "nonfic",
        year: 1854,
        pages: 304,
        format: "EPUB",
        fileUrl: "https://standardebooks.org/ebooks/henry-david-thoreau/walden/downloads/henry-david-thoreau_walden.epub",
        description: "Reflections on simple living in natural surroundings.",
      },
      {
        title: "Leaves of Grass",
        author: "Walt Whitman",
        genre: "poetry",
        year: 1855,
        pages: 480,
        format: "EPUB",
        fileUrl: "https://standardebooks.org/ebooks/walt-whitman/leaves-of-grass/downloads/walt-whitman_leaves-of-grass.epub",
        description: "Whitman's groundbreaking poetry collection celebrating democracy, nature, love, and humanity.",
      },
      // ── Rewards
      {
        title: "The Republic",
        author: "Plato",
        genre: "academic",
        year: -380,
        pages: 360,
        format: "EPUB",
        fileUrl: "https://standardebooks.org/ebooks/plato/the-republic/benjamin-jowett/downloads/plato_the-republic_benjamin-jowett.epub",
        description: "Reward for the Asante League champion — Plato's foundational work on justice and the ideal state.",
        lockType: "league_winner",
        lockLeagueId: "asante",
        lockNote: "Champion's reading",
      },
      {
        title: "The Iliad",
        author: "Homer",
        genre: "fiction",
        year: -750,
        pages: 720,
        format: "EPUB",
        fileUrl: "https://standardebooks.org/ebooks/homer/the-iliad/alexander-pope/downloads/homer_the-iliad_alexander-pope.epub",
        description: "Reward for top 4 of Yoruba League — Homer's epic of the Trojan War.",
        lockType: "league_top_n",
        lockLeagueId: "yoruba",
        lockPosition: 4,
        lockNote: "Top 4 of Yoruba",
      },
      {
        title: "Beowulf",
        author: "Anonymous",
        genre: "poetry",
        year: 975,
        pages: 220,
        format: "EPUB",
        fileUrl: "https://standardebooks.org/ebooks/anonymous/beowulf/francis-barton-gummere/downloads/anonymous_beowulf_francis-barton-gummere.epub",
        description: "Coordinator-granted only.",
        lockType: "admin_grant",
        lockNote: "Coordinator pick",
      },
    ])
    .onConflictDoNothing();
  console.log("  ✓ Books (10 open + 3 rewards, all with real EPUB files)");

  console.log("Done.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
