// =====================================================================
// PREDICTIVE MACRO-HISTORICAL RADAR
// Curated historical-pattern parallels mapped to emerging African
// opportunities. This is EDUCATION, not prediction: every entry is a
// documented historical pattern paired with a real modern trend and a
// concrete user action. We never claim to forecast markets.
// =====================================================================

export interface HistoricalParallel {
  id: string;
  title: string;
  category: "trade" | "finance" | "agriculture" | "energy" | "technology" | "cooperative";
  historical: {
    era: string;
    region: string;
    pattern: string;
    outcome: string;
  };
  modern: {
    domain: string;
    signal: string;
    whyNow: string;
  };
  actionForUser: string;
  confidenceLabel: "historical_analogy";
}

export const HISTORICAL_PARALLELS: HistoricalParallel[] = [
  {
    id: "HP-001",
    title: "Trade-route nodes capture more value than producers",
    category: "trade",
    historical: {
      era: "13th–14th century",
      region: "Mali Empire (Timbuktu, Gao)",
      pattern: "Trans-Saharan gold and salt trade made the ROUTING cities — not the mines — the wealth centers. Timbuktu taxed flow, hosted scholars, and compounded its position.",
      outcome: "Node cities became the richest and most educated centers of their era; the mines alone did not.",
    },
    modern: {
      domain: "Cross-border payment rails & logistics corridors",
      signal: "PAPSS (Pan-African Payment and Settlement System) now settles intra-African trade in local currencies, and mobile-money corridors are the new caravan routes.",
      whyNow: "AfCFTA operational + PAPSS live + intra-African trade digitizing.",
    },
    actionForUser: "Build services ON the rails — reconciliation, FX-smart invoicing, corridor logistics — rather than only producing goods.",
    confidenceLabel: "historical_analogy",
  },
  {
    id: "HP-002",
    title: "Export-led manufacturing rebuilds follow skills compounding",
    category: "technology",
    historical: {
      era: "1950s–1980s",
      region: "Japan, then South Korea and Taiwan",
      pattern: "Devastated post-war economies rebuilt through disciplined technical education + export-focused assembly, moving up the value chain decade by decade (textiles → steel → electronics → chips).",
      outcome: "Multi-decade compounding of skills turned low-income economies into high-income ones.",
    },
    modern: {
      domain: "Solar component assembly, agri-processing, and light manufacturing in African industrial parks",
      signal: "Global supply chains are diversifying ('China+1'), and African industrial zones (Tanger Med, Hawassa, Dube TradePort) are absorbing assembly work.",
      whyNow: "Energy-cost shifts + geopolitical supply diversification + AfCFTA tariff advantages.",
    },
    actionForUser: "Position in assembly-adjacent services: QA, tooling maintenance, logistics coordination — the skills that compound with the zone.",
    confidenceLabel: "historical_analogy",
  },
  {
    id: "HP-003",
    title: "Pooled community capital outperforms isolated saving in volatile economies",
    category: "cooperative",
    historical: {
      era: "19th–20th century",
      region: "Britain's mutual societies, West Africa's esusu/susu, East Africa's chamas, South Africa's stokvels",
      pattern: "Rotating savings clubs and mutuals let communities with no bank access pool capital, smooth shocks, and fund members' ventures in rotation.",
      outcome: "Entire working-class asset bases (homes, businesses, education) were financed through community pools before formal banking arrived.",
    },
    modern: {
      domain: "Cooperative investment vehicles and community crowdfunding",
      signal: "Stokvels in SA alone move billions of rand annually; regulated digital chama/stokvel platforms are now emerging to formalize them.",
      whyNow: "Distrust of formal fees + mobile ubiquity + regulation catching up.",
    },
    actionForUser: "Formalize your circle: written rules, recorded contributions, defined payout rotation — then consider registered cooperative status for larger pools.",
    confidenceLabel: "historical_analogy",
  },
  {
    id: "HP-004",
    title: "Standard-setters win the network effect",
    category: "technology",
    historical: {
      era: "19th century",
      region: "Britain & United States (railway gauge wars)",
      pattern: "Competing rail gauges stranded cargo at every border until standardization. The regions that adopted shared standards first captured the through-traffic.",
      outcome: "Standard-compatible networks compounded; incompatible ones were rebuilt at huge cost.",
    },
    modern: {
      domain: "Interoperable digital payments and data standards",
      signal: "India's UPI showed a shared payment standard can onboard hundreds of millions; Africa's PAPSS and mobile-money interoperability are the same moment.",
      whyNow: "Standards are being chosen THIS decade — early builders get the network effect.",
    },
    actionForUser: "Build on shared rails (PAPSS, interoperable QR, open APIs) instead of closed custom systems.",
    confidenceLabel: "historical_analogy",
  },
  {
    id: "HP-005",
    title: "Yield jumps follow knowledge distribution, not just capital",
    category: "agriculture",
    historical: {
      era: "1960s–1970s (Green Revolution)",
      region: "India, Mexico, Philippines",
      pattern: "Grain yields multiplied when improved seed varieties were paired with EXTENSION services — agronomists teaching farmers new practice. Capital alone without knowledge transfer failed.",
      outcome: "Countries that funded extension services saw sustained productivity gains; seed-only programs stalled.",
    },
    modern: {
      domain: "Agri-tech advisory, climate-resilient seed adoption, farm data services",
      signal: "Drought-tolerant varieties + soil sensors + mobile agronomy advice are reaching smallholders for the first time.",
      whyNow: "Climate pressure makes resilient practice adoption urgent; smartphones finally reach the field.",
    },
    actionForUser: "Sell the knowledge layer to farmers — advisory, timing, soil reading — not just inputs. That's where margins and loyalty compound.",
    confidenceLabel: "historical_analogy",
  },
  {
    id: "HP-006",
    title: "Single-currency cash is the risk asset in inflation cycles",
    category: "finance",
    historical: {
      era: "1970s oil shocks; 1990s emerging-market devaluations",
      region: "Global — including Zimbabwe, Argentina, Nigeria episodes",
      pattern: "Households holding only local cash lost purchasing power fastest; those with diversified baskets (hard-currency assets, productive land, commodities) preserved value.",
      outcome: "Diversification, not yield-chasing, was what protected ordinary savers through devaluation cycles.",
    },
    modern: {
      domain: "Inflation hedging for households: treasury bills, money-market funds, low-cost global index ETFs",
      signal: "Persistent inflation + accessible fractional investing apps now let small savers hold diversified baskets.",
      whyNow: "Retail access to T-bills and global ETFs is at historic lows in cost and minimums.",
    },
    actionForUser: "Never hold 100% local cash. Layer: emergency fund (liquid) → T-bills → diversified index exposure → productive skill assets.",
    confidenceLabel: "historical_analogy",
  },
  {
    id: "HP-007",
    title: "Financial inclusion follows distribution into low-infrastructure areas",
    category: "finance",
    historical: {
      era: "19th–20th century postal savings banks; 2007 M-Pesa launch",
      region: "Europe/Japan (postal banks); Kenya (mobile money)",
      pattern: "Inclusion didn't come from better bank branches — it came from channels that already reached people: post offices then, corner-shop agents and phones now.",
      outcome: "M-Pesa reached the unbanked in Kenya faster than a century of branch banking did.",
    },
    modern: {
      domain: "Offline-first financial tools and agent networks",
      signal: "Low-bandwidth and zero-data user experiences are still underserved while smartphones are universal.",
      whyNow: "The next inclusion wave is offline-capable design, not more apps requiring data.",
    },
    actionForUser: "Design every financial tool you build to work with intermittent connectivity — that's the actual market.",
    confidenceLabel: "historical_analogy",
  },
  {
    id: "HP-008",
    title: "Corridor cities compound with throughput",
    category: "trade",
    historical: {
      era: "20th century",
      region: "Singapore, Rotterdam, Hong Kong",
      pattern: "Entrepôt cities that invested in port efficiency and rule-of-law reliability compounded wealth with every additional unit of throughput.",
      outcome: "Small territories became top-tier economies by being the reliable node in a trade corridor.",
    },
    modern: {
      domain: "African corridor hubs: Tanger Med, Mombasa, Tema, Durban",
      signal: "Port modernization + corridor digitization is concentrating regional throughput on the most efficient hubs.",
      whyNow: "Supply-chain rerouting is forcing a once-per-generation reshuffle of corridor traffic.",
    },
    actionForUser: "Services near efficient corridor nodes (clearing, warehousing coordination, compliance paperwork) ride the throughput curve.",
    confidenceLabel: "historical_analogy",
  },
];

export function getRadar(category?: string): HistoricalParallel[] {
  if (!category || category === "All") return HISTORICAL_PARALLELS;
  const q = category.toLowerCase();
  return HISTORICAL_PARALLELS.filter(
    (p) =>
      p.category === q ||
      p.title.toLowerCase().includes(q) ||
      p.modern.domain.toLowerCase().includes(q)
  );
}

export const RADAR_DISCLAIMER =
  "Historical analogies educate — they do not predict. Every parallel here is a documented pattern mapped to a real current trend. None of this is financial advice; verify with official sources and registered professionals before committing money.";
