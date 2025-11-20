import { get_or_create_client } from "@/app/api/utils/mongodbClient";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { get_database_user } from "../utils/get_database_user";
import { get_name_authuser } from "../utils/get_database_user";

/**
 * @swagger
 * components:
 *   schemas:
 *     Trait:
 *       type: object
 *       required:
 *         - type
 *         - sampleId
 *         - responsible
 *         - date
 *       properties:
 *         _id:
 *           type: string
 *           description: MongoDB ObjectId
 *           example: "507f1f77bcf86cd799439011"
 *         type:
 *           type: string
 *           description: Type of trait measurement
 *           example: "silk_diameter"
 *         measurement:
 *           type: number
 *           description: The measured value
 *           example: 2.5
 *         std:
 *           type: number
 *           description: Standard deviation of measurements
 *           example: 0.3
 *         unit:
 *           type: string
 *           description: Unit of measurement
 *           example: "μm"
 *         sampleId:
 *           type: string
 *           description: Reference to the sample
 *           example: "507f1f77bcf86cd799439012"
 *         responsible:
 *           type: string
 *           description: ID of the user responsible for this measurement
 *           example: "507f1f77bcf86cd799439013"
 *         date:
 *           type: string
 *           format: date
 *           description: Date when the measurement was taken
 *           example: "2024-03-15"
 *         detail:
 *           type: string
 *           description: Additional details about the measurement
 *           example: "major ampullate silk"
 *         equipment:
 *           type: string
 *           description: Equipment used for measurement
 *           example: "SEM"
 *         nfibres:
 *           type: string
 *           description: Number of fibers measured
 *           example: "1"
 *         listvals:
 *           type: array
 *           items:
 *             type: number
 *           description: Individual measurement values
 *           example: [2.3, 2.5, 2.7, 2.4, 2.6]
 *         notes:
 *           type: string
 *           description: Additional notes about the measurement
 *           example: "Good quality sample"
 *         filesId:
 *           type: array
 *           items:
 *             type: string
 *           description: Associated file IDs
 *           example: ["507f1f77bcf86cd799439014"]
 *         recentChangeDate:
 *           type: string
 *           format: date-time
 *           description: Last modification date
 *           example: "2024-03-15T14:20:00Z"
 *         logbook:
 *           type: array
 *           items:
 *             type: string
 *           description: Activity log entries
 *     TraitCreateRequest:
 *       type: object
 *       required:
 *         - method
 *         - type
 *         - sampleId
 *         - responsible
 *         - date
 *       properties:
 *         method:
 *           type: string
 *           enum: [create]
 *           description: Action to perform
 *           example: "create"
 *         type:
 *           type: string
 *           description: Type of trait measurement
 *           example: "silk_diameter"
 *         sampleId:
 *           type: string
 *           description: Reference to the sample
 *           example: "507f1f77bcf86cd799439012"
 *         responsible:
 *           type: string
 *           description: ID of the user responsible for this measurement
 *           example: "507f1f77bcf86cd799439013"
 *         date:
 *           type: string
 *           format: date
 *           description: Date when the measurement was taken
 *           example: "2024-03-15"
 *         measurement:
 *           type: number
 *           description: The measured value
 *           example: 2.5
 *         unit:
 *           type: string
 *           description: Unit of measurement
 *           example: "μm"
 *         detail:
 *           type: string
 *           description: Additional details about the measurement
 *           example: "major ampullate silk"
 *         equipment:
 *           type: string
 *           description: Equipment used for measurement
 *           example: "SEM"
 *         nfibres:
 *           type: string
 *           description: Number of fibers measured
 *           example: "1"
 *         listvals:
 *           type: array
 *           items:
 *             type: number
 *           description: Individual measurement values
 *           example: [2.3, 2.5, 2.7, 2.4, 2.6]
 *         notes:
 *           type: string
 *           description: Additional notes about the measurement
 *           example: "Good quality sample"
 *         filesId:
 *           type: array
 *           items:
 *             type: string
 *           description: Associated file IDs
 *           example: ["507f1f77bcf86cd799439014"]
 */

/**
 * @swagger
 * /api/traits:
 *   get:
 *     summary: Retrieve trait measurements
 *     description: Get a list of trait measurements with optional filtering by type and optional inclusion of sample features for enhanced data analysis.
 *     tags:
 *       - Traits
 *     parameters:
 *       - in: query
 *         name: includeSampleFeatures
 *         schema:
 *           type: boolean
 *         description: Include associated sample information in the response
 *         example: true
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter traits by specific type
 *         example: "silk_diameter"
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *         description: Retrieve a specific trait by its ID
 *         example: "507f1f77bcf86cd799439011"
 *
 *     responses:
 *       200:
 *         description: Successfully retrieved traits
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Trait'
 *       500:
 *         description: Database connection error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     summary: Create, update, or delete trait measurements
 *     description: |
 *       Handles multiple trait operations based on the method field:
 *       - **create**: Add a new trait measurement
 *       - **update**: Modify an existing trait measurement
 *       - **delete**: Remove a trait measurement
 *       - **setfield**: Update a specific field of a trait
 *     tags:
 *       - Traits
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - $ref: '#/components/schemas/TraitCreateRequest'
 *           examples:
 *             createTrait:
 *               summary: Create a new trait measurement
 *               value:
 *                 method: "create"
 *                 type: "silk_diameter"
 *                 sampleId: "507f1f77bcf86cd799439012"
 *                 responsible: "507f1f77bcf86cd799439013"
 *                 date: "2024-03-15"
 *                 measurement: 2.5
 *                 unit: "μm"
 *                 equipment: "SEM"
 *                 nfibres: "1"
 *                 detail: "major ampullate silk"
 *                 notes: "Good quality sample"
 *     responses:
 *       200:
 *         description: Trait operation completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Trait created successfully"
 *                 id:
 *                   type: string
 *                   description: Trait ID (for create operations)
 *                   example: "507f1f77bcf86cd799439011"
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Trait or sample not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Database connection or server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * Fetches the complete chain of parent samples from a given sample up to the root
 * @param {Object} db - Database connection
 * @param {string|ObjectId} sampleId - Starting sample ID
 * @returns {Array} Array of samples from child to root
 */
async function getSampleChain(db, sampleId) {
    const samples = db.collection("samples");
    const chain = [];
    let currentId = sampleId;
    
    while (currentId) {
        // Convert to ObjectId only if it's a string
        const queryId = typeof currentId === 'string' ? new ObjectId(currentId) : currentId;
        const sample = await samples.findOne({ _id: queryId });
        if (!sample) break;
        chain.push(sample);
        currentId = sample.parentId;
    }
    
    return chain;
}

function parseNFibres(nfibres) {
  if (!nfibres) return { error: "Missing nfibres value" };

  // Handle bundle case
  if (nfibres.toLowerCase() === "bundle") {
    return { type: "single", value: 1 };
  }

  // Handle range case (e.g., "2-4")
  if (nfibres.includes("-")) {
    const [min, max] = nfibres.split("-").map((num) => parseInt(num.trim()));
    if (isNaN(min) || isNaN(max)) {
      return { error: "Invalid range format" };
    }
    return {
      type: "range",
      min: min,
      max: max,
      avg: (min + max) / 2,
    };
  }

  // Handle single number
  const value = parseInt(nfibres);
  if (isNaN(value)) {
    return { error: "Invalid number format" };
  }
  return { type: "single", value };
}

function calculateArea(diameter, count) {
  return ((Math.PI * diameter * diameter) / 4) * count;
}

async function getSingleTrait(client, traitId) {
  const dbname = await get_database_user();
  const db = client.db(dbname);
  const traits = db.collection("traits");

  const trait = await traits.findOne({ _id: new ObjectId(traitId) });
  if (!trait) {
    throw new Error(`Trait with ID ${traitId} not found`);
  }
  return trait;
}

async function getTraits(
  client,
  includeSampleFeatures,
  type = "",
  trait_id = null,
  includeRelated = false
) {
  const dbname = await get_database_user();
  const db = client.db(dbname);
  const traits = db.collection("traits");

  // Construct the query object for the type filter
  const query = type ? { type: type } : {};
  let traitsData = await traits.find(query).toArray();

  if (includeSampleFeatures) {
    const samples = db.collection("samples");
    const samplesData = await samples.find().toArray();
    traitsData.forEach((trait) => {
      const sample = samplesData.find(
        (sample) => sample._id.toString() === trait.sampleId.toString()
      );
      trait.sampleName = sample?.name || "";
      trait.sampletype = sample?.type || "";
      trait.samplesubtype = sample?.subsampletype || "";
      trait.family = sample?.family || "";
      trait.genus = sample?.genus || "";
      trait.species = sample?.species || "";
    });
  }

  // Include related sample data if requested
  if (includeRelated) {
    for (const trait of traitsData) {
      if (trait.sampleId) {
        // Get complete sample chain (from child to root)
        const sampleChain = await getSampleChain(db, trait.sampleId);
        trait.sampleChain = sampleChain;
        
        // Add direct sample info at top level for convenience
        if (sampleChain.length > 0) {
          const directSample = sampleChain[0];
          trait.sample = directSample;
        }
      }
    }
  }

  // TODO This is an optional module and should be moved to a separate module
  // Calculate cross sections for diameter traits and add cross-section rows
  const crossSectionTraits = [];

  traitsData.forEach((trait) => {
    if (trait.type === "diameter" && trait.measurement) {
      // First, calculate the crossSection field for the original trait
      const fibres = parseNFibres(trait.nfibres);
      if (fibres.error) {
        trait.crossSection = {
          error: fibres.error,
          unit: `${trait.unit}²`,
        };
      } else if (fibres.type === "single") {
        trait.crossSection = {
          area: {
            single: calculateArea(trait.measurement, fibres.value),
          },
          unit: `${trait.unit}²`,
        };
      } else if (fibres.type === "range") {
        trait.crossSection = {
          area: {
            min: calculateArea(trait.measurement, fibres.min),
            avg: calculateArea(trait.measurement, fibres.avg),
            max: calculateArea(trait.measurement, fibres.max),
          },
          unit: `${trait.unit}²`,
        };
      }

      // Now, create a new cross-section area trait
      const crossSectionTrait = JSON.parse(JSON.stringify(trait));
      crossSectionTrait._id = new ObjectId(); // Generate a new ID
      crossSectionTrait.type = "cross_section";
      crossSectionTrait.measurement =
        Math.PI * Math.pow(trait.measurement / 2, 2); // Calculate area
      crossSectionTrait.listvals = ""; // Clear list values

      // Handle standard deviation if it exists
      // std dev of a power of a scalar is
      // std = |n * x^(n-1) * std_x|
      if (trait.std) {
        crossSectionTrait.std = ((Math.PI * trait.measurement) / 2) * trait.std;
      }

      // Update the unit to indicate square units
      crossSectionTrait.unit = `${trait.unit}²`;

      // Add to our array of new traits
      crossSectionTraits.push(crossSectionTrait);
    }
  });

  // Add the new cross-section traits to the original data
  traitsData = traitsData.concat(crossSectionTraits);

  return traitsData;
}

export async function GET(req) {
  // Get the includeRawData parameter from the URL
  const { searchParams } = new URL(req.url);
  const includeSampleFeatures =
    searchParams.get("includeSampleFeatures") === "true";
  const includeRelated = searchParams.get("related") === "true";

  //get the type from the URL
  const type = searchParams.get("type");

  // If a specific trait ID is provided, fetch that single trait
  const traitId = searchParams.get("id");
  if (traitId) {
    const client = await get_or_create_client();
    if (client == null) {
      // If the client is not connected, return an error response
      return new NextResponse(null, { status: 500 });
    }
    try {
      const trait = await getSingleTrait(client, traitId);
      return NextResponse.json(trait);
    } catch (error) {
      return new NextResponse(JSON.stringify({ error: error.message }), {
        status: 404,
      });
    }
  }

  // Ensure the database client is connected
  const client = await get_or_create_client();
  if (client == null) {
    // If the client is not connected, return an error response
    return new NextResponse(null, { status: 500 });
  }

  // Access the database and the 'users' collection
  let traits = await getTraits(client, includeSampleFeatures, type, null, includeRelated);

  // Retrieve all users and return them as a JSON response
  return NextResponse.json(traits);
}

export async function POST(req) {
  const data = await req.json();
  const client = await get_or_create_client();
  const authuser = await get_name_authuser();

  if (client == null) {
    return new NextResponse(
      JSON.stringify({ error: "Failed to connect to database" }),
      { status: 500 }
    );
  }

  const dbname = await get_database_user();
  const db = client.db(dbname);
  const traits = db.collection("traits");

  // Check if the request is to update a trait
  if (data.method === "update") {
    const logbookEntry = [
      `${new Date().toISOString()}`,
      `Updated trait ${data.id}`,
    ];
    const sampleLogbookEntry = [
      `${new Date().toISOString()}`,
      `Updated trait ${data.id}`,
    ];
    const updateData = {
      // Add other fields that you want to update
      ...data,
      recentChangeDate: new Date().toISOString(),
    };
    const updateDataSample = {
      recentTraitChangeDate: new Date().toISOString(),
    };

    const result = await traits.updateOne(
      { _id: new ObjectId(data.id) },
      { $set: updateData, $push: { logbook: logbookEntry } }
    );

    const sampleResult = await samples.updateOne(
      { _id: new ObjectId(data.sampleId) },
      { $set: updateDataSample, $push: { logbook: sampleLogbookEntry } }
    );

    if (result.modifiedCount === 0) {
      return new NextResponse(
        JSON.stringify({ error: "Failed to update trait" }),
        { status: 404 }
      );
    } else {
      return new NextResponse(
        JSON.stringify({ message: "Trait updated successfully" }),
        { status: 200 }
      );
    }
  }

  // Check if the request is to update a trait
  if (data.method === "setfield") {
    let field = data.field;
    const updateData = {
      // Add other fields that you want to update
      [field]: data.value,
      recentChangeDate: new Date().toISOString(),
    };

    // Construct logbook entry
    const logbookEntry = [
      `${new Date().toISOString()}`,
      `Set ${data.field} to ${data.value} by ${authuser}`,
    ];
    // MongoDB update operation to append to the logbook array
    const result = await traits.updateOne(
      { _id: new ObjectId(data.id) },
      { $set: updateData, $push: { logbook: logbookEntry } }
    );

    if (result.modifiedCount === 0) {
      return new NextResponse(
        JSON.stringify({ error: "Failed to update trait" }),
        { status: 404 }
      );
    } else {
      return new NextResponse(
        JSON.stringify({ message: "Trait updated successfully" }),
        { status: 200 }
      );
    }
  }

  // Assuming data.method is "incrementfield" and data contains 'id' and the field name to increment
  if (data.method === "incrementfield") {
    // Field to increment, e.g., 'timesMolted' or 'timesFed'
    const fieldToIncrement = data.field;
    const logbookEntry = [
      `${new Date().toISOString()}`,
      ` ${data.field} by ${authuser}`,
    ];

    // MongoDB update operation to increment the specified field
    const updateQuery = {
      $set: { recentChangeDate: new Date().toISOString() }, // Update the recentChangeDate field
      $inc: { [fieldToIncrement]: 1 },
      $push: { logbook: logbookEntry }, // Increment the specified field by 1
    };

    const result = await traits.updateOne(
      { _id: new ObjectId(data.id) },
      updateQuery
    );

    if (result.modifiedCount === 0) {
      return new NextResponse(
        JSON.stringify({ error: "Failed to increment counter" }),
        { status: 404 }
      );
    } else {
      return new NextResponse(
        JSON.stringify({ message: "Counter incremented successfully" }),
        { status: 200 }
      );
    }
  }

  if (data.method === "conversion") {
    // Validate at least one trait exists
    if (
      !data.traits ||
      !Array.isArray(data.traits) ||
      data.traits.length === 0
    ) {
      return new NextResponse(JSON.stringify({ error: "No traits provided" }), {
        status: 400,
      });
    }

    // Find all associated experiments first
    const experiments = db.collection("experiments");
    const rawdata = db.collection("rawdata");

    // Get the first trait to find the sampleId
    const firstTrait = await traits.findOne({
      _id: new ObjectId(data.traits[0].id),
    });
    if (!firstTrait) {
      return new NextResponse(JSON.stringify({ error: "Trait not found" }), {
        status: 404,
      });
    }

    // Find and update all associated experiments (only once)
    const associatedExperiments = await experiments
      .find({ sampleId: firstTrait.sampleId })
      .toArray();

    if (associatedExperiments.length > 0) {
      for (const experiment of associatedExperiments) {
        const rawExperimentData = await rawdata.findOne({
          experimentId: experiment._id,
        });
        if (!rawExperimentData) continue;

        const originalData =
          rawExperimentData.originalData || rawExperimentData.data;
        const updatedData = {
          ...rawExperimentData.data,
          EngineeringStress: rawExperimentData.data.EngineeringStress.map(
            (value) => value * data.conversion.ratio
          ),
        };

        await rawdata.updateOne(
          { experimentId: experiment._id },
          {
            $set: {
              data: updatedData,
              originalData: originalData,
              version: (rawExperimentData.version || 0) + 1,
            },
          }
        );

        const experimentLogEntry = [
          `${new Date().toISOString()}`,
          `Updated data points based on diameter conversion`,
          `Ratio: ${data.conversion.ratio}`,
        ];

        // If the original values don't exist, store them
        if (!experiment.originalStressAtBreak) {
          await experiments.updateOne(
            { _id: experiment._id },
            {
              $set: {
                originalStressAtBreak: experiment.stressAtBreak,
                originalToughness: experiment.toughness,
                originalOffsetYieldStress: experiment.offsetYieldStress,
                originalModulus: experiment.modulus,
                originalSpecimenDiameter: experiment.specimenDiameter,
              },
            }
          );
        }

        await experiments.updateOne(
          { _id: experiment._id },
          {
            $set: {
              version: (experiment.version || 0) + 1,
              lastConversionDate: new Date().toISOString(),
              lastConversionRatio: data.conversion.ratio,
              stressAtBreak: experiment.stressAtBreak * data.conversion.ratio,
              toughness: experiment.toughness * data.conversion.ratio,
              offsetYieldStress:
                experiment.offsetYieldStress * data.conversion.ratio,
              modulus: experiment.modulus * data.conversion.ratio,
              specimenDiameter:
                experiment.specimenDiameter / Math.sqrt(data.conversion.ratio), // diameter scales with square root of area
            },
            $push: { logbook: experimentLogEntry },
          }
        );
      }
    }

    // Update all traits in a single batch
    for (const trait of data.traits) {
      const traitEntry = await traits.findOne({ _id: new ObjectId(trait.id) });
      if (!traitEntry) continue;

      const logbookEntry = [
        `${new Date().toISOString()}`,
        `Converted value from ${traitEntry.measurement} to ${trait.value} based on diameter change`,
        `Old diameters: ${data.conversion.oldDiameters.join(", ")}`,
        `New diameters: ${data.conversion.newDiameters.join(", ")}`,
        `Cross sections: ${data.conversion.oldCrossSection} → ${data.conversion.newCrossSection}`,
        `Ratio: ${data.conversion.ratio}`,
      ];

      await traits.updateOne(
        { _id: traitEntry._id },
        {
          $set: {
            measurement: trait.value,
            diameterConversion: {
              oldDiameters: data.conversion.oldDiameters,
              newDiameters: data.conversion.newDiameters,
              oldCrossSection: data.conversion.oldCrossSection,
              newCrossSection: data.conversion.newCrossSection,
              ratio: data.conversion.ratio,
              date: new Date().toISOString(),
            },
            recentChangeDate: new Date().toISOString(),
          },
          $push: { logbook: logbookEntry },
        }
      );
    }

    return new NextResponse(
      JSON.stringify({
        message: "Traits and experiments updated successfully",
      }),
      { status: 200 }
    );
  }

  if (data.method === "reset") {
    // Validate traits array
    if (
      !data.traits ||
      !Array.isArray(data.traits) ||
      data.traits.length === 0
    ) {
      return new NextResponse(JSON.stringify({ error: "No traits provided" }), {
        status: 400,
      });
    }

    // Get the first trait to find the sampleId
    const firstTrait = await traits.findOne({
      _id: new ObjectId(data.traits[0].id),
    });
    if (!firstTrait) {
      return new NextResponse(JSON.stringify({ error: "Trait not found" }), {
        status: 404,
      });
    }

    // Find all associated experiments
    const experiments = db.collection("experiments");
    const rawdata = db.collection("rawdata");
    const associatedExperiments = await experiments
      .find({ sampleId: firstTrait.sampleId })
      .toArray();

    // Reset experiments data
    if (associatedExperiments.length > 0) {
      for (const experiment of associatedExperiments) {
        const rawExperimentData = await rawdata.findOne({
          experimentId: experiment._id,
        });
        if (!rawExperimentData || !rawExperimentData.originalData) continue;

        // Reset the data to original values
        await rawdata.updateOne(
          { experimentId: experiment._id },
          {
            $set: {
              data: rawExperimentData.originalData,
              version: (rawExperimentData.version || 0) + 1,
            },
          }
        );

        const experimentLogEntry = [
          `${new Date().toISOString()}`,
          `Reset data points to original values`,
        ];

        await experiments.updateOne(
          { _id: experiment._id },
          {
            $set: {
              version: (experiment.version || 0) + 1,
              stressAtBreak: experiment.originalStressAtBreak,
              toughness: experiment.originalToughness,
              offsetYieldStress: experiment.originalOffsetYieldStress,
              modulus: experiment.originalModulus,
              specimenDiameter: experiment.originalSpecimenDiameter,
            },
            $unset: {
              lastConversionDate: "",
              lastConversionRatio: "",
              originalStressAtBreak: "",
              originalToughness: "",
              originalOffsetYieldStress: "",
              originalModulus: "",
              originalSpecimenDiameter: "",
            },
            $push: { logbook: experimentLogEntry },
          }
        );
      }
    }

    // Reset all traits
    for (const trait of data.traits) {
      const traitEntry = await traits.findOne({ _id: new ObjectId(trait.id) });
      if (!traitEntry || !traitEntry.diameterConversion) continue;

      // Store the reset action in the logbook
      const logbookEntry = [
        `${new Date().toISOString()}`,
        `Reset value to original measurement before diameter conversion`,
        `Previous cross-section: ${traitEntry.diameterConversion.oldCrossSection} → ${traitEntry.diameterConversion.newCrossSection}`,
        `Previous ratio: ${traitEntry.diameterConversion.ratio}`,
      ];

      // Calculate original value by dividing by the conversion ratio
      const originalValue =
        traitEntry.measurement / traitEntry.diameterConversion.ratio;

      await traits.updateOne(
        { _id: traitEntry._id },
        {
          $set: {
            measurement: originalValue,
            recentChangeDate: new Date().toISOString(),
          },
          $push: { logbook: logbookEntry },
          $unset: { diameterConversion: "" }, // Remove the conversion data
        }
      );
    }

    return new NextResponse(
      JSON.stringify({ message: "Traits and experiments reset successfully" }),
      { status: 200 }
    );
  }

  if (data.method === "create") {
    // Check for Sample existence and configure logbook entry
    const samples = db.collection("samples");
    const sample = await samples.findOne({ _id: new ObjectId(data.sampleId) });
    if (sample == null) {
      return new NextResponse(JSON.stringify({ error: "Sample not found" }), {
        status: 404,
      });
    }

    // Validate responsible user exists
    const users = client.db("usersdb").collection("users");
    const responsibleUser = await users.findOne({
      _id: new ObjectId(data.responsible),
    });

    if (responsibleUser == null) {
      return new NextResponse(
        JSON.stringify({ error: "Responsible not found" }),
        { status: 500 }
      );
    }

    // Create a new trait if it's not an update
    const traitData = {
      ...data,
      recentChangeDate: new Date().toISOString(),
      logbook: [
        [
          `${new Date().toISOString()}`,
          `Uploaded trait for ${data.sampleId} by ${authuser}`,
        ],
      ],
    };

    {
      // If the trait doesn't exist, create a new one
      const result = await traits.insertOne(traitData);
      const sampleResult = await samples.updateOne(
        { _id: new ObjectId(data.sampleId) },
        {
          $set: { recentTraitChangeDate: new Date().toISOString() },
          $push: {
            logbook: [
              `${new Date().toISOString()}`,
              `New trait of type ${data.type} and value ${data.measurement} for ${data.sampleId} by ${authuser}`,
            ],
          },
        }
      );

      if (result.insertedCount == 0 || sampleResult.modifiedCount == 0) {
        return new NextResponse(
          JSON.stringify({ error: "Failed to create trait" }),
          { status: 500 }
        );
      } else {
        return new NextResponse(
          JSON.stringify({ success: true, id: result.insertedId }),
          { status: 200 }
        );
      }
    }
  }
}

export async function DELETE(req) {
  try {
    // Parse the request body to get the trait ID
    const { id } = await req.json();

    // Ensure the database client is connected
    const client = await get_or_create_client();
    if (!client) {
      return new NextResponse(
        JSON.stringify({ error: "Failed to connect to database" }),
        { status: 500 }
      );
    }

    // Access the database and the 'traits' collection
    const dbname = await get_database_user();
    const db = client.db(dbname);
    const traits = db.collection("traits");

    // Perform the delete operation
    const result = await traits.deleteOne({ _id: new ObjectId(id) });

    // Check if the delete operation was successful
    if (result.deletedCount === 0) {
      return new NextResponse(
        JSON.stringify({ error: "Trait not found or already deleted" }),
        { status: 404 }
      );
    }

    return new NextResponse(
      JSON.stringify({ message: "Trait deleted successfully" }),
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}
