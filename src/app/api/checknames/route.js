import { get_or_create_client } from '../utils/mongodbClient';
import { spytraxCheckTaxa } from '@/utils/spytrax';
import { NextResponse } from "next/server";

/**
 * @swagger
 * components:
 *   schemas:
 *     CheckNameRequest:
 *       type: object
 *       required:
 *         - taxa
 *       properties:
 *         taxa:
 *           type: string
 *           description: Scientific name to check or validate
 *           example: "Araneus diadematus"
 *         method:
 *           type: string
 *           enum: [correctName, fullTaxaInfo]
 *           default: correctName
 *           description: Type of operation to perform
 *           example: "correctName"
 *         source:
 *           type: string
 *           enum: [auto, WSC, GNames]
 *           default: auto
 *           description: Data source for name checking (WSC = World Spider Catalog, GNames = Global Names Verifier)
 *           example: "auto"
 *         family:
 *           type: string
 *           description: Optional family name to provide taxonomic context (used with GNames)
 *           example: "Pholcidae"
 *     TaxonomicInfo:
 *       type: object
 *       properties:
 *         canonical_form:
 *           type: string
 *           description: Standardized scientific name
 *           example: "Araneus diadematus"
 *         kingdom:
 *           type: string
 *           description: Taxonomic kingdom
 *           example: "Animalia"
 *         phylum:
 *           type: string
 *           description: Taxonomic phylum
 *           example: "Arthropoda"
 *         class:
 *           type: string
 *           description: Taxonomic class
 *           example: "Arachnida"
 *         order:
 *           type: string
 *           description: Taxonomic order
 *           example: "Araneae"
 *         family:
 *           type: string
 *           description: Taxonomic family
 *           example: "Araneidae"
 *         genus:
 *           type: string
 *           description: Taxonomic genus
 *           example: "Araneus"
 *         species:
 *           type: string
 *           description: Species epithet
 *           example: "diadematus"
 *     CheckNameResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: "success"
 *         data:
 *           oneOf:
 *             - type: string
 *               description: Corrected name (for correctName method)
 *               example: "Araneus diadematus"
 *             - $ref: '#/components/schemas/TaxonomicInfo'
 *         source:
 *           type: string
 *           description: Data source used for the result
 *           example: "WSC"
 */

/**
 * @swagger
 * /api/checknames:
 *   get:
 *     summary: Check API status
 *     description: Simple health check endpoint for the taxonomic name checking service
 *     tags:
 *       - Utilities
 *     responses:
 *       200:
 *         description: API is working
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "checkname API working"
 *   post:
 *     summary: Validate and correct taxonomic names
 *     description: |
 *       Validates and corrects scientific names using various taxonomic databases.
 *       Supports two methods:
 *       - **correctName**: Returns the corrected/standardized name
 *       - **fullTaxaInfo**: Returns complete taxonomic hierarchy information
 *       
 *       Data sources:
 *       - **WSC**: World Spider Catalog (spider-specific)
 *       - **GNames**: Global Names Verifier (general taxa) - uses data sources 1, 12, 13 (Catalogue of Life, Encyclopedia of Life, GBIF)
 *       - **auto**: Tries WSC first, falls back to GNames
 *     tags:
 *       - Utilities
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CheckNameRequest'
 *           examples:
 *             correctName:
 *               summary: Correct a scientific name
 *               value:
 *                 taxa: "Araneus diadematus"
 *                 method: "correctName"
 *                 source: "auto"
 *             fullTaxaInfo:
 *               summary: Get complete taxonomic information
 *               value:
 *                 taxa: "Pholcus phalangioides"
 *                 method: "fullTaxaInfo"
 *                 source: "GNames"
 *                 family: "Pholcidae"
 *     responses:
 *       200:
 *         description: Name validation successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CheckNameResponse'
 *       500:
 *         description: Error during name validation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: object
 *                   description: Error details
 */

function extractTaxonomicInfo(data) {
    // Handle the Global Names Verifier POST API response format
    if (!data.names || !data.names[0] || !data.names[0].bestResult) {
        throw new Error('Invalid response format from Global Names API');
    }

    const result = data.names[0].bestResult;
    const canonicalForm = result.currentCanonicalSimple || result.matchedCanonicalSimple;

    // Parse classification path and ranks
    const classificationPath = result.classificationPath ? result.classificationPath.split('|') : [];
    const classificationRanks = result.classificationRanks ? result.classificationRanks.split('|') : [];

    // Build taxonomic info object from classification data
    const taxonomicInfo = {
        canonical_form: canonicalForm,
        kingdom: '',
        phylum: '',
        class: '',
        order: '',
        family: '',
        genus: '',
        species: ''
    };

    // Map the classification path to taxonomic ranks
    classificationRanks.forEach((rank, index) => {
        if (classificationPath[index] && taxonomicInfo.hasOwnProperty(rank.toLowerCase())) {
            taxonomicInfo[rank.toLowerCase()] = classificationPath[index];
        }
    });

    // if species has two words, split them and take the second one
    if (taxonomicInfo.species && taxonomicInfo.species.includes(' ')) {
        const speciesParts = taxonomicInfo.species.split(' ');
        taxonomicInfo.species = speciesParts[speciesParts.length - 1]; // Take the last part as species
    }

    // If genus is unknown, use gen.
    if (!taxonomicInfo.genus && taxonomicInfo.family) {
        taxonomicInfo.genus = "gen.";
        taxonomicInfo.species = "sp.";
        taxonomicInfo.canonical_form = `${taxonomicInfo.family} gen. sp.`;
    }

    // If species is unknown, use sp.
    if (!taxonomicInfo.species && taxonomicInfo.family) {
        taxonomicInfo.species = "sp.";
        taxonomicInfo.canonical_form = `${taxonomicInfo.genus} sp.`;
    }

    
    

    return taxonomicInfo;
}


async function getWSCData() {
    const client = await get_or_create_client()
    const db = await client.db('evonest');
    const collection = await db.collection('wsc');
    const wscData = await collection.find({}).toArray();
    return wscData;
}



export async function GET() {
    return new NextResponse(JSON.stringify({ message: "checkname API working" }), { status: 200 });
}


export async function POST(req) {
    const data = await req.json();

    const method = data.method || 'correctName';  // Default to correctName if no method is provided
    const source = data.source || 'auto';  // Default to auto if no source is provided

    if (method === 'correctName') {
        if (source == 'WSC') {
            const wsctaxa = data.taxa.split(','); // wsc requires an array right now // FIXME Daniele
            try {
                const wscData = await getWSCData();
                const checkedNames = await spytraxCheckTaxa(wsctaxa, wscData);
                return new NextResponse(JSON.stringify({ status: 'success', data: checkedNames[0].best_match }), { status: 200 });
            } catch (error) {
                console.log(error);
                return new NextResponse(JSON.stringify({ error: { error } }), { status: 500 });
            }
        }
        if (source == 'GNames') {
            const requestBody = {
                nameStrings: [data.taxa],
                dataSources: [1, 12, 13], // Your favorite data sources
                withAllMatches: false,
                withCapitalization: false,
                withSpeciesGroup: false,
                withUninomialFuzzyMatch: false,
                withStats: true,
                mainTaxonThreshold: 0.6
            };
            
            const GNRurl = 'https://verifier.globalnames.org/api/v1/verifications';
            try {
                const GNRresponse = await fetch(GNRurl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody),
                });
                if (GNRresponse.ok) {
                    const GNRjson = await GNRresponse.json();
                    if (GNRjson.names && GNRjson.names[0] && GNRjson.names[0].bestResult) {
                        const taxonomicInfo = extractTaxonomicInfo(GNRjson);
                        return new NextResponse(JSON.stringify({ 
                            status: 'success', 
                            data: taxonomicInfo.canonical_form,
                            source: 'GNames'
                        }), { status: 200 });
                    } else {
                        return new NextResponse(JSON.stringify({ error: 'No results found from GNames' }), { status: 404 });
                    }
                } else {
                    return new NextResponse(JSON.stringify({ error: 'Failed to fetch from GNames' }), { status: 500 });
                }
            } catch (error) {
                console.log(error);
                return new NextResponse(JSON.stringify({ error: 'Failed to fetch from GNames' }), { status: 500 });
            }
        }
        if (source == 'auto') {
            const taxa = data.taxa;
            const wsctaxa = taxa;
            try {
                const wscData = await getWSCData();
                const checkedNames = await spytraxCheckTaxa(wsctaxa, wscData);
                return new NextResponse(JSON.stringify({ status: 'success', data: checkedNames.data[0].best_match }), { status: 200 });
            } catch (error) {
                const requestBody = {
                    nameStrings: [taxa],
                    dataSources: [1, 12, 13], // Your favorite data sources
                    withAllMatches: false,
                    withCapitalization: false,
                    withSpeciesGroup: false,
                    withUninomialFuzzyMatch: false,
                    withStats: true,
                    mainTaxonThreshold: 0.6
                };
                
                const GNRurl = 'https://verifier.globalnames.org/api/v1/verifications';
               try {
                    const GNRresponse = await fetch(GNRurl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(requestBody),
                    });
                    if (GNRresponse.ok) {
                        const GNRjson = await GNRresponse.json();
                        if (GNRjson.names && GNRjson.names[0] && GNRjson.names[0].bestResult) {
                            const taxonomicInfo = extractTaxonomicInfo(GNRjson);
                            return new NextResponse(JSON.stringify({ 
                                status: 'success', 
                                data: taxonomicInfo.canonical_form,
                                source: 'GNames'
                            }), { status: 200 });
                        } else {
                            return new NextResponse(JSON.stringify({ error: 'No results found from GNames fallback' }), { status: 404 });
                        }
                    } else {
                        return new NextResponse(JSON.stringify({ error: 'Failed to fetch from GNames fallback' }), { status: 500 });
                    }
                } catch (error) {
                    console.log(error);
                    return new NextResponse(JSON.stringify({ error: 'Failed to fetch from GNames fallback' }), { status: 500 });
                }
            }
        }
    }
    if (method === 'fullTaxaInfo') {
        if (source == 'WSC') {
            return new NextResponse(JSON.stringify({ error: 'WSC does not support fullTaxaInfo method' }), { status: 400 });
        }
        if (source == 'auto' || source == 'GNames') {
            let taxa = data.taxa;
            
            // Build request body for POST API
            const requestBody = {
                nameStrings: [taxa],
                dataSources: [1, 12, 13], // Your favorite data sources
                withAllMatches: false,
                withCapitalization: false,
                withSpeciesGroup: false,
                withUninomialFuzzyMatch: false,
                withStats: true,
                mainTaxonThreshold: 0.6
            };
            
            // If family information is provided, we could potentially include it in the search
            // but the POST API doesn't directly support context - it works better with clean names
            
            const GNRurl = 'https://verifier.globalnames.org/api/v1/verifications';
            try {
                const GNRresponse = await fetch(GNRurl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody),
                });
                if (GNRresponse.ok) {
                    const GNRjson = await GNRresponse.json();
                    console.log(GNRjson.names[0].bestResult);
                    if (GNRjson.names && GNRjson.names[0] && GNRjson.names[0].bestResult) {
                        const taxonomicInfo = extractTaxonomicInfo(GNRjson);
                        return new NextResponse(JSON.stringify({ 
                            status: 'success', 
                            data: taxonomicInfo, 
                            source: 'GNames' 
                        }), { status: 200 });
                    } else {
                        return new NextResponse(JSON.stringify({ error: 'No results found from GNames' }), { status: 404 });
                    }
                } else {
                    return new NextResponse(JSON.stringify({ error: 'Failed to fetch from GNames' }), { status: 500 });
                }
            } catch (error) {
                console.log(error);
                return new NextResponse(JSON.stringify({ error: 'Failed to fetch from GNames' }), { status: 500 });
            }
        }
    }

    // Default fallback for unhandled cases
    return new NextResponse(JSON.stringify({ error: 'Invalid method or source combination' }), { status: 400 });
}



