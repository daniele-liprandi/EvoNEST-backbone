// Sample detail cards. A card declares which sample types it is built for with
// `supportedTypes` (['*'] means every type). A sample type's config can also
// opt into a card built for another type through its `cards` list. There is no
// map keyed by literal type names, so a new type needs no edit here.

import { PlantCard } from './PlantCard';
import { SoilCard } from './SoilCard';
import { FertilizerCard } from './FertilizerCard';
import { PestCard } from './PestCard';
import { SilkCard } from './SilkCard';
import { AnimalCard } from './AnimalCard';
import { SubsampleCard } from './SubsampleCard';

import { EditFieldsCard } from './EditFieldsCard';
import { FeedCard } from './FeedCard';
import { PreservationCard } from './PreservationCard';
import { HierarchyCard } from './HierarchyCard';
import { GalleryCard } from './GalleryCard';
import { PositionCard } from './PositionCard';
import { LabelSampleCard } from './LabelSampleCard';

// Add a new card here and nowhere else.
export const ALL_CARDS = [
  PlantCard,
  SoilCard,
  FertilizerCard,
  PestCard,
  SilkCard,
  AnimalCard,
  SubsampleCard,
  EditFieldsCard,
  FeedCard,
  PreservationCard,
  HierarchyCard,
  GalleryCard,
  PositionCard,
  LabelSampleCard,
];

const byName = new Map(ALL_CARDS.map((card) => [card.displayName, card]));

/** The card component with this displayName, or null. */
export const getCardByName = (name) => byName.get(name) || null;

// A card shows for a sample type if it is universal, names the type in
// `supportedTypes`, or the type's config opts into it by name.
const cardAppliesTo = (card, type, typeConfig) => {
  const supported = card.supportedTypes || [];
  if (supported.includes('*') || supported.includes(type)) return true;
  const optIn = Array.isArray(typeConfig?.cards) ? typeConfig.cards : [];
  return optIn.includes(card.displayName);
};

/**
 * Cards for one sample type, optionally narrowed to a layout position.
 * `typeConfig` is the sample type's config entry (for its `cards` opt-in list).
 */
export const getSampleCards = (type, typeConfig = null, position = null) =>
  ALL_CARDS.filter((card) => {
    if (!cardAppliesTo(card, type, typeConfig)) return false;
    if (position && card.position && card.position !== position) return false;
    return true;
  });

export const getMainCards = (type, typeConfig = null) =>
  getSampleCards(type, typeConfig, 'main');

export const getSidebarCards = (type, typeConfig = null) =>
  getSampleCards(type, typeConfig, 'sidebar');

/** Drop cards whose runtime `shouldRender(sample)` condition is not met. */
export const getFilteredCards = (cards, sample) =>
  cards.filter((card) => !card.shouldRender || card.shouldRender(sample));
