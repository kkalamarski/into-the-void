import type { LoreFragment } from '@into-the-void/shared-types';

export const ANCIENT_TECH_FRAGMENTS: readonly LoreFragment[] = [
  {
    id: 'lore_ancient_ruins_01',
    title: 'The Builders',
    category: 'ancient_tech',
    content: `No one knows what to call them. The official designation is "Predecessor Species Alpha" but everyone says "the Ancients" or "the Builders." The ruins are clearly artificial — geometric precision, repeated motifs, materials that shouldn't exist — but they contain no art, no writing, no bodies.

Xenoarchaeologists have catalogued over four thousand distinct ruin sites. The architecture varies, but certain elements repeat: hexagonal doorways, crystalline power conduits, chambers that seem designed for beings of wildly different sizes.

The only consensus: they were here, they built extensively, and they left. Or something made them leave.`,
    biome: 'ancient_ruins',
    xpReward: 100,
  },
  {
    id: 'lore_ancient_crystals_01',
    title: 'Void Crystals',
    category: 'ancient_tech',
    content: `The crystals defy conventional physics. They store energy without degradation. They resonate at frequencies that shouldn't be possible. Some seem to respond to proximity — pulsing brighter when approached, dimming when touched.

Early colonists tried to use them as power sources. Some succeeded. Others triggered cascading failures that destabilized entire outposts. The ICC now requires corporate authorization for any crystal extraction exceeding one kilogram.

The largest crystal formation on record spans nearly a kilometer. It hums constantly, and on certain nights, colonists claim they can hear patterns in the resonance. Almost like language.`,
    biome: 'crystal_caves',
    xpReward: 100,
  },
  {
    id: 'lore_ancient_anomalies_01',
    title: 'The Anomaly Phenomenon',
    category: 'ancient_tech',
    content: `Scattered across Terminus are zones where reality behaves incorrectly. Colonists call them Anomalies. Temporal stutters where minutes pass in seconds. Spatial tears where geometry fails and distances change. Echo fields where sounds from the past replay on loop.

Anomalies are valuable — they often contain Ancient artifacts or rare materials formed by the distortions. They are also lethal. Expeditions into Anomaly zones have a 23% casualty rate.

The corporations deny any connection between Anomalies and the Ancients' disappearance. The corporations are lying.`,
    biome: 'anomaly_zone',
    xpReward: 100,
  },
] as const;
