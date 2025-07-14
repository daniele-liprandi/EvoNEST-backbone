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
 *           enum: [auto, WSC, GNR]
 *           default: auto
 *           description: Data source for name checking (WSC = World Spider Catalog, GNR = Global Names Resolver)
 *           example: "auto"
 *     TaxonomicInfo:
 *       type: object
 *       properties:
 *         canonical_form:
 *           type: string
 *           description: Standardized scientific name
 *           example: "Araneus diadematus"
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
 *       - **GNR**: Global Names Resolver (general taxa)
 *       - **auto**: Tries WSC first, falls back to GNR
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
 *                 taxa: "Araneus diadematus"
 *                 method: "fullTaxaInfo"
 *                 source: "GNR"
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
    const results = data.data[0].results[0];
    const canonicalForm = results.canonical_form;

    const classificationPath = results.classification_path.split('|');
    const classificationRanks = results.classification_path_ranks.split('|');

    const taxonomicInfo = {};
    classificationRanks.forEach((rank, index) => {
        taxonomicInfo[rank.toLowerCase()] = classificationPath[index];
    });

    /* consider only the last word of species */
    const speciesname = taxonomicInfo.species.split(" ").pop()

    return {
        canonical_form: canonicalForm,
        class: taxonomicInfo.class || '',
        order: taxonomicInfo.order || '',
        family: taxonomicInfo.family || '',
        genus: taxonomicInfo.genus || '',
        species: speciesname || ''
    };
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
        if (source == 'GNR') {
            const gnrtaxa = data.taxa.replace(/ /g, '+'); // Replace spaces with pluses
            const GNRurl = `https://resolver.globalnames.org/name_resolvers.json?names=${gnrtaxa}&data_source_ids=3`;
            try {
                const GNRresponse = await fetch(GNRurl, {
                    method: 'GET',
                });
                if (GNRresponse.ok) {
                    const GNRjson = await GNRresponse.json();
                    const taxonomicInfo = extractTaxonomicInfo(GNRjson)
                    return new NextResponse(JSON.stringify({ status: 'success', data: taxonomicInfo.canonical_form }), { status: 200 });
                } else {
                    return new NextResponse(JSON.stringify({ error: 'Failed to fetch from GNR' }), { status: 500 });
                }
            } catch (error) {
                console.log(error);
                return new NextResponse(JSON.stringify({ error: { error } }), { status: 500 });
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
                const gnrtaxa = taxa.replace(/ /g, '+'); // Replace spaces with pluses
                const GNRurl = `https://resolver.globalnames.org/name_resolvers.json?names=${gnrtaxa}&data_source_ids=3`;
               try {
                    const GNRresponse = await fetch(GNRurl, {
                        method: 'GET',
                    });
                    if (GNRresponse.ok) {
                        const GNRjson = await GNRresponse.json();
                        const taxonomicInfo = extractTaxonomicInfo(GNRjson)
                        return new NextResponse(JSON.stringify({ status: 'success', data: taxonomicInfo.canonical_form }), { status: 200 });
                    } else {
                        return new NextResponse(JSON.stringify({ error: 'Failed to fetch from GNR fallback' }), { status: 500 });
                    }
                } catch (error) {
                    console.log(error);
                    return new NextResponse(JSON.stringify({ error: { error } }), { status: 500 });
                }
            }
        }
    }
    if (method === 'fullTaxaInfo') {
        if (source == 'WSC') {
            return new NextResponse(JSON.stringify({ error: 'WSC does not support fullTaxaInfo method' }), { status: 400 });
        }
        if (source == 'auto' || source == 'GNR') {
            const taxa = data.taxa.replace(/ /g, '+'); // Replace spaces with pluses
            const GNRurl = `https://resolver.globalnames.org/name_resolvers.json?names=${taxa}&data_source_ids=3`;
            try {
                const GNRresponse = await fetch(GNRurl, {
                    method: 'GET',
                });
                if (GNRresponse.ok) {
                    const GNRjson = await GNRresponse.json();
                    const taxonomicInfo = extractTaxonomicInfo(GNRjson)
                    return new NextResponse(JSON.stringify({ status: 'success', data: taxonomicInfo, source: 'GNR' }), { status: 200 });
                } else {
                    return new NextResponse(JSON.stringify({ error: 'Failed to fetch from GNR' }), { status: 500 });
                }
            } catch (error) {
                console.log(error);
                return new NextResponse(JSON.stringify({ error: { error } }), { status: 500 });
            }
        }
    }

    // Default fallback for unhandled cases
    return new NextResponse(JSON.stringify({ error: 'Invalid method or source combination' }), { status: 400 });
}



