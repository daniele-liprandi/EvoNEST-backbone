const levenshtein = require('js-levenshtein');

// Utility function to remove 'sp' or 'spp' from names
function removeSpFromTax(taxArray) {
  return taxArray.map(t => t.replace(/ sp\.?$/, '').replace(/ spp\.?$/, ''));
}


// Function to find the closest matches using Levenshtein distance
function findClosestMatches(name, allNames) {
  const distances = allNames.map(n => levenshtein(name, n));
  const minDistance = Math.min(...distances);
  return allNames.filter((_, i) => distances[i] === minDistance);
}

// Function to handle individual mismatches
async function handleMismatch(mismatch, allNames) {
  // if mismatch.Species contains only one word and not two, then we should return only the genus
  const hasOneWord = mismatch.Species.split(' ').length === 1;
  const closestMatches = findClosestMatches(mismatch.Species, allNames);
  mismatch.Note = 'Misspelling';
  if (hasOneWord) {
    mismatch.Note = 'Genus';
    mismatch.best_match = closestMatches[0].split(' ')[0];
    return mismatch;
  }

  if (closestMatches.length === 1) {
    mismatch.best_match = closestMatches[0];
  } else {
    mismatch.best_match = closestMatches[0];
    mismatch.alternatives = closestMatches.slice(1).join(', ');
  }

  return mismatch;
}

// Function to handle all mismatches
async function handleMismatches(mismatches, allNames) {
  for (let i = 0; i < mismatches.length; i++) {
    await handleMismatch(mismatches[i], allNames);
  }
  return mismatches;
}

// Main function to check taxa
export async function spytraxCheckTaxa(tax, wscData) {
  
  // if sp. at the end, then 
  tax = removeSpFromTax(tax);

  // Extract all unique nomenclature names from wscData
  const allNames = [...new Set(wscData.map(item => item.nomenclature))];

  // Find mismatches
  const mismatches = tax.filter(t => !allNames.includes(t));

  // If no mismatches, return taxa as is
  if (mismatches.length === 0) {
    return tax.map(t => ({
      Species: t,
      best_match: t,
      Note: 'Ok',
      alternatives: null
    }));
  }

  // Initialize mismatch results
  const mismatchResults = mismatches.map(species => ({
    Species: species,
    best_match: '',
    Note: '',
    alternatives: ''
  }));

  // Handle mismatches
  await handleMismatches(mismatchResults, allNames);

  return mismatchResults;
}
