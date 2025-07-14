export function getExperimentNamebyId(experimentId, experiments) {
    // Ensure experiments is an array and contains data
    if (Array.isArray(experiments)) {
      return experiments.find(experiment => experiment._id === experimentId)?.name || experiments.find(experiment => experiment.name === experimentId)?.name || '';
    }
    return '';
  };
  
  