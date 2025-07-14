/**
 * Base interface and utilities for sample cards
 */

import PropTypes from 'prop-types';

// Standard props interface that all sample cards should accept
export const SampleCardPropTypes = {
  // Required props
  sample: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    name: PropTypes.string,
    lifestatus: PropTypes.string,
    logbook: PropTypes.array,
  }).isRequired,
  handleChange: PropTypes.func.isRequired,
  
  // Optional but commonly used props
  setSample: PropTypes.func,
  samplesData: PropTypes.array,
  usersData: PropTypes.array,
  handleStatusIncrementSample: PropTypes.func,
};

// Utility function to validate card component metadata
export const validateCardMetadata = (CardComponent) => {
  const errors = [];
  
  if (!CardComponent.displayName) {
    errors.push('Card missing displayName');
  }
  
  if (!CardComponent.supportedTypes || !Array.isArray(CardComponent.supportedTypes)) {
    errors.push('Card missing supportedTypes array');
  }
  
  if (!CardComponent.position || !['main', 'sidebar', 'full'].includes(CardComponent.position)) {
    errors.push('Card missing valid position (main, sidebar, or full)');
  }
  
  return errors;
};

// Higher-order component to add standard card behavior
export const withCardWrapper = (CardComponent) => {
  const WrappedCard = (props) => {
    // Validate metadata in development
    if (process.env.NODE_ENV === 'development') {
      const errors = validateCardMetadata(CardComponent);
      if (errors.length > 0) {
        console.warn(`Card ${CardComponent.displayName || 'Unknown'} validation errors:`, errors);
      }
    }
    
    return <CardComponent {...props} />;
  };
  
  // Preserve metadata
  WrappedCard.displayName = CardComponent.displayName;
  WrappedCard.supportedTypes = CardComponent.supportedTypes;
  WrappedCard.position = CardComponent.position;
  WrappedCard.shouldRender = CardComponent.shouldRender;
  WrappedCard.dependencies = CardComponent.dependencies;
  WrappedCard.priority = CardComponent.priority;
  
  return WrappedCard;
};

// Utility to check if a card's dependencies are met
export const checkCardDependencies = (CardComponent, availableProps) => {
  if (!CardComponent.dependencies) return true;
  
  return CardComponent.dependencies.every(dep => 
    availableProps.hasOwnProperty(dep) && availableProps[dep] !== undefined
  );
};

// Standard card positions
export const CARD_POSITIONS = {
  MAIN: 'main',
  SIDEBAR: 'sidebar', 
  FULL: 'full'
};

// Standard card priorities
export const CARD_PRIORITIES = {
  HIGH: 1,
  NORMAL: 100,
  LOW: 200
};
