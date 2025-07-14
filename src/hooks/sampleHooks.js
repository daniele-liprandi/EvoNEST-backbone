// getSampleNameById.js

export function getSampleNamebyId(sampleId, samples) {
  // Ensure samples is an array and contains data
  if (Array.isArray(samples)) {
    return samples.find(sample => sample._id === sampleId)?.name || samples.find(sample => sample.name === sampleId)?.name || '';
  }
  return '';
};

export function getParentIdbyId(sampleId, samples) {
  // Ensure samples is an array and contains data
  if (Array.isArray(samples)) {
    return samples.find(sample => sample._id === sampleId)?.parentId || '';
  }
  return '';
}


export function getSampletypebyId(sampleId, samples) {
  // Ensure samples is an array and contains data
  if (Array.isArray(samples)) {
    return samples.find(sample => sample._id === sampleId)?.type || '';
  }
  return '';
};
export function getSampleSubtypebyId(sampleId, samples) {
  // Ensure samples is an array and contains data
  if (Array.isArray(samples)) {
    return samples.find(sample => sample._id === sampleId)?.subsampletype || '';
  }
  return '';
};

export function getSampleIdbyName(sampleName, samples) {
  // Ensure samples is an array and contains data
  if (Array.isArray(samples)) {
    return samples.find(sample => sample.name.toLowerCase() === sampleName.toLowerCase())?._id.toString() || '';
  }
  return '';
};