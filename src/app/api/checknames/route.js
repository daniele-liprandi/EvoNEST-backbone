import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { isServiceRequest } from "@/app/api/utils/verifyServiceKey";

const REQUEST_TIMEOUT_MS = 10000;
const GNAMES_URL = "https://verifier.globalnames.org/api/v1/verifications";
// Catalogue of Life, Encyclopedia of Life, GBIF.
const GNAMES_DATA_SOURCES = [1, 12, 13];

async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

/** "araneus  DIADEMATUS" -> "Araneus diadematus" */
function titleCaseName(name) {
  const words = name.trim().split(/\s+/);
  if (words.length === 0) return name.trim();
  return [
    words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase(),
    ...words.slice(1).map((w) => w.toLowerCase()),
  ].join(" ");
}

/** Fallbacks proposed when GNames does not recognise a name (it never rejects). */
function suggestionsFor(name) {
  const cleaned = titleCaseName(name);
  const genus = cleaned.split(/\s+/)[0];
  return [...new Set([`${genus} sp.`, cleaned])];
}

function extractTaxonomicInfo(data) {
  const result = data.names?.[0]?.bestResult;
  if (!result) return null;

  const canonicalForm = result.currentCanonicalSimple || result.matchedCanonicalSimple;
  const path = result.classificationPath ? result.classificationPath.split("|") : [];
  const ranks = result.classificationRanks ? result.classificationRanks.split("|") : [];

  const info = { canonical_form: canonicalForm, kingdom: "", phylum: "", class: "", order: "", family: "", genus: "", species: "" };
  ranks.forEach((rank, i) => {
    const key = rank.toLowerCase();
    if (path[i] && Object.prototype.hasOwnProperty.call(info, key)) info[key] = path[i];
  });

  if (info.species && info.species.includes(" ")) {
    info.species = info.species.split(" ").pop();
  }
  if (!info.genus && info.family) {
    info.genus = "gen.";
    info.species = "sp.";
    info.canonical_form = `${info.family} gen. sp.`;
  } else if (!info.species && info.family) {
    info.species = "sp.";
    info.canonical_form = `${info.genus} sp.`;
  }
  return info;
}

async function queryGNames(taxa) {
  const response = await fetchWithTimeout(GNAMES_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nameStrings: [taxa],
      dataSources: GNAMES_DATA_SOURCES,
      withAllMatches: false,
      withStats: true,
      mainTaxonThreshold: 0.6,
    }),
  });
  if (!response.ok) {
    throw new Error(`GNames responded ${response.status}`);
  }
  const json = await response.json();
  return extractTaxonomicInfo(json); // null when nothing matched
}

/**
 * @swagger
 * /api/checknames:
 *   get:
 *     summary: Health check for the name checking service
 *     tags: [Utilities]
 *     responses:
 *       200: { description: OK }
 *   post:
 *     summary: Verify a scientific name against the Global Names verifier
 *     description: |
 *       Verifies a name via GNames (Catalogue of Life, Encyclopedia of Life, GBIF).
 *       An unrecognised name is never rejected: the response has
 *       `status: "unrecognised"` and a `suggestions` list ("Genus sp." and the
 *       entered name, title-cased).
 *     tags: [Utilities]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [taxa]
 *             properties:
 *               taxa: { type: string, example: "Araneus diadematus" }
 *               method:
 *                 type: string
 *                 enum: [correctName, fullTaxaInfo]
 *                 default: correctName
 *     responses:
 *       200:
 *         description: Verified, or unrecognised with suggestions
 *       400: { description: Missing or invalid body }
 *       502: { description: GNames unreachable }
 */
export async function GET() {
  return NextResponse.json({ message: "checkname API working" });
}

export async function POST(req) {
  // checknames is excluded from the auth middleware (proxy.js) so the Mastra
  // service can reach it. Accept a valid session or the service key.
  if (!isServiceRequest(req)) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let data;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body is not valid JSON" }, { status: 400 });
  }

  const taxa = typeof data.taxa === "string" ? data.taxa.trim() : "";
  const method = data.method === "fullTaxaInfo" ? "fullTaxaInfo" : "correctName";
  if (!taxa) {
    return NextResponse.json({ error: "taxa is required" }, { status: 400 });
  }

  let info;
  try {
    info = await queryGNames(taxa);
  } catch (error) {
    console.error("checknames: GNames request failed:", error);
    return NextResponse.json({ error: "Could not reach the Global Names verifier" }, { status: 502 });
  }

  if (!info) {
    return NextResponse.json({
      status: "unrecognised",
      data: taxa,
      suggestions: suggestionsFor(taxa),
      source: "GNames",
    });
  }

  return NextResponse.json({
    status: "success",
    data: method === "fullTaxaInfo" ? info : info.canonical_form,
    source: "GNames",
  });
}
