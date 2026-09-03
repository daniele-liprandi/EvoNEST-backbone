// Sample name / ID generation. Extracted from profile-form-samples so the
// server can reuse the exact same rules when a taxon change asks for the
// affected names to be regenerated.
//
// A name is `<baseId><number>`, where baseId is a genus+species prefix chosen
// from the lab's configured length combinations, and number is the first free
// integer for that baseId.

export const DEFAULT_ID_GENERATION = {
  combinations: [[3, 3], [3, 4], [3, 5], [4, 3], [4, 4], [5, 3], [5, 4], [4, 5]],
  startingNumber: 1,
  numberPadding: 0,
};

/** The alphabetic prefix of a name, i.e. the name without its trailing digits. */
export function baseOf(name) {
  return String(name ?? "").replace(/\d+$/, "");
}

function pad(num, numberPadding) {
  return numberPadding > 0 ? String(num).padStart(numberPadding, "0") : String(num);
}

/**
 * Pick the baseId for a genus/species/type. Walks the length combinations and
 * takes the first prefix that does not collide with a *different* species of
 * the same type already in `samples`.
 */
export function generateBaseId(genus, species, type, samples, combinations) {
  const g = String(genus ?? "");
  const s = String(species ?? "");
  if (!g) return "";

  const combos = combinations?.length ? combinations : DEFAULT_ID_GENERATION.combinations;

  const collidesWithOtherSpecies = (candidate) =>
    samples.some((sample) => {
      if (sample.type !== type) return false;
      if (sample.genus === g && sample.species === s) return false;
      return baseOf(sample.name) === candidate;
    });

  let last = "";
  for (const [genusLen, speciesLen] of combos) {
    last = g.slice(0, genusLen) + s.slice(0, speciesLen);
    if (!collidesWithOtherSpecies(last)) return last;
  }
  return last;
}

function firstFreeName(baseId, takenNames, { startingNumber, numberPadding }) {
  let n = startingNumber ?? DEFAULT_ID_GENERATION.startingNumber;
  while (takenNames.has(baseId + pad(n, numberPadding ?? 0))) n += 1;
  return baseId + pad(n, numberPadding ?? 0);
}

/**
 * The name a new sample of this genus/species/type would get: baseId plus the
 * first free number, checked against `samples`.
 */
export function nextNameFor({ genus, species, type }, samples, idGeneration = DEFAULT_ID_GENERATION) {
  const baseId = generateBaseId(genus, species, type, samples, idGeneration.combinations);
  if (!baseId) return "";
  const taken = new Set(
    samples
      .filter((s) => s.genus === genus && s.species === species && s.type === type)
      .map((s) => s.name),
  );
  return firstFreeName(baseId, taken, idGeneration);
}

/**
 * New names for a batch of samples whose taxonomy has just changed.
 *
 * @param {{_id: any, genus: string, species: string, type: string, name?: string}[]} targets
 *        the samples with their NEW genus/species already applied
 * @param {{name: string, genus: string, species: string, type: string, _id: any}[]} allSamples
 *        every sample in the database (for collision context)
 * @param {object} idGeneration - the lab's ID rules
 * @returns {Map<string, string>} target _id (as string) -> new name
 */
export function regenerateSampleNames(targets, allSamples, idGeneration = DEFAULT_ID_GENERATION) {
  const targetIds = new Set(targets.map((t) => String(t._id)));
  // Names already in use by samples we are NOT renaming. The targets' old names
  // are freed, so they can be reused.
  const takenNames = new Set(
    allSamples.filter((s) => !targetIds.has(String(s._id))).map((s) => s.name),
  );

  const baseIdCache = new Map();
  const result = new Map();

  for (const target of targets) {
    const key = `${target.type}|${target.genus}|${target.species}`;
    if (!baseIdCache.has(key)) {
      baseIdCache.set(
        key,
        generateBaseId(target.genus, target.species, target.type, allSamples, idGeneration.combinations),
      );
    }
    const baseId = baseIdCache.get(key);
    if (!baseId) {
      result.set(String(target._id), target.name ?? "");
      continue;
    }
    const name = firstFreeName(baseId, takenNames, idGeneration);
    takenNames.add(name);
    result.set(String(target._id), name);
  }

  return result;
}
