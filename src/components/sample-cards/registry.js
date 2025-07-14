// Card registry for modular sample cards
// This file automatically discovers and loads sample-specific cards

// Type-specific cards
import { PlantCard } from './PlantCard';
import { SoilCard } from './SoilCard';
import { FertilizerCard } from './FertilizerCard';
import { PestCard } from './PestCard';
import { SilkCard } from './SilkCard';
import { AnimalCard } from './AnimalCard';
import { SubsampleCard } from './SubsampleCard';

// Universal cards that appear for all sample types
import { EditFieldsCard } from './EditFieldsCard';
import { FeedCard } from './FeedCard';
import { PreservationCard } from './PreservationCard';
import { HierarchyCard } from './HierarchyCard';
import { GalleryCard } from './GalleryCard';
import { PositionCard } from './PositionCard';
import { LabelSampleCard } from './LabelSampleCard';

// Card registry organized by sample type
export const SAMPLE_CARDS = {
  // Type-specific cards
  plant: [PlantCard],
  soil: [SoilCard],
  fertilizer: [FertilizerCard],
  pest: [PestCard],
  silk: [SilkCard],
  animal: [AnimalCard],
  subsample: [SubsampleCard],
  
  // Universal cards (will be filtered by conditions)
  '*': [
    EditFieldsCard,
    FeedCard,
    PreservationCard,
    HierarchyCard,
    GalleryCard,
    PositionCard,
    LabelSampleCard,
  ]
};

// Get all cards for a specific sample type
export const getSampleCards = (sampleType, position = null) => {
  const typeSpecificCards = SAMPLE_CARDS[sampleType] || [];
  const universalCards = SAMPLE_CARDS['*'] || [];
  
  const allCards = [...typeSpecificCards, ...universalCards];
  
  if (position) {
    return allCards.filter(Card => 
      !Card.position || Card.position === position
    );
  }
  
  return allCards;
};

// Get cards for main content area
export const getMainCards = (sampleType) => {
  return getSampleCards(sampleType, 'main');
};

// Get cards for sidebar
export const getSidebarCards = (sampleType) => {
  return getSampleCards(sampleType, 'sidebar');
};

// Filter cards based on sample conditions
export const getFilteredCards = (cards, sample) => {
  return cards.filter(Card => {
    // Check if card should render based on sample conditions
    if (Card.shouldRender && !Card.shouldRender(sample)) {
      return false;
    }
    
    // Check if card supports this sample type
    if (Card.supportedTypes && !Card.supportedTypes.includes(sample.type) && !Card.supportedTypes.includes('*')) {
      return false;
    }
    
    return true;
  });
};

// Register a new card dynamically
export const registerCard = (sampleType, CardComponent) => {
  if (!SAMPLE_CARDS[sampleType]) {
    SAMPLE_CARDS[sampleType] = [];
  }
  SAMPLE_CARDS[sampleType].push(CardComponent);
};

// Get all registered sample types
export const getRegisteredTypes = () => {
  return Object.keys(SAMPLE_CARDS).filter(type => type !== '*');
};
