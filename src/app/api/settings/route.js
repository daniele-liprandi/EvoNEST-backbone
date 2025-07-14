import { get_or_create_client } from '@/app/api/utils/mongodbClient'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { get_database_user, get_name_authuser } from '@/app/api/utils/get_database_user'

/**
 * @swagger
 * /api/settings:
 *   get:
 *     summary: Get main settings
 *     description: Retrieve the main settings configuration including ID generation and lab info
 *     tags:
 *       - Settings  
 *     responses:
 *       200:
 *         description: Settings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     idGeneration:
 *                       type: object
 *                       properties:
 *                         combinations:
 *                           type: array
 *                           items:
 *                             type: array
 *                             items:
 *                               type: number
 *                         defaultGenusLength:
 *                           type: number
 *                         defaultSpeciesLength:
 *                           type: number
 *                         startingNumber:
 *                           type: number
 *                         useCollisionAvoidance:
 *                           type: boolean
 *                         numberPadding:
 *                           type: number
 *                     labInfo:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                         location:
 *                           type: string
 *                         latitude:
 *                           type: number
 *                         longitude:
 *                           type: number
 *       500:
 *         description: Server error
 */
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = await get_or_create_client()
    if (client == null) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const dbname = await get_database_user()
    const db = client.db(dbname)
    const collection = db.collection('settings')
    
    // Get main settings
    const settings = await collection.findOne({ type: 'main' })
    
    if (!settings) {
      // Return default settings if none exist
      const defaultSettings = {
        idGeneration: {
          combinations: [[3, 3], [3, 4], [3, 5], [4, 3], [4, 4], [5, 3], [5, 4], [4, 5]],
          defaultGenusLength: 3,
          defaultSpeciesLength: 3,
          maxGenusLength: 6,
          maxSpeciesLength: 6,
          startingNumber: 1,
          useCollisionAvoidance: true,
          numberPadding: 0,
        },
        labInfo: {
          name: "",
          location: "",
          latitude: null,
          longitude: null,
        }
      }
      
      return NextResponse.json({ 
        success: true, 
        data: defaultSettings 
      })
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        idGeneration: settings.idGeneration,
        labInfo: settings.labInfo
      }
    })

  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * @swagger
 * /api/settings:
 *   post:
 *     summary: Update main settings
 *     description: Update the main settings configuration
 *     tags:
 *       - Settings
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               idGeneration:
 *                 type: object
 *                 properties:
 *                   combinations:
 *                     type: array
 *                     items:
 *                       type: array
 *                       items:
 *                         type: number
 *                   defaultGenusLength:
 *                     type: number
 *                   defaultSpeciesLength:
 *                     type: number
 *                   maxGenusLength:
 *                     type: number
 *                   maxSpeciesLength:
 *                     type: number
 *                   startingNumber:
 *                     type: number
 *                   useCollisionAvoidance:
 *                     type: boolean
 *                   numberPadding:
 *                     type: number
 *               labInfo:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   location:
 *                     type: string
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *     responses:
 *       200:
 *         description: Settings updated successfully  
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { idGeneration, labInfo } = body

    // Validate required fields
    if (!idGeneration || !labInfo) {
      return NextResponse.json(
        { error: 'Missing required fields: idGeneration and labInfo' },
        { status: 400 }
      )
    }

    // Validate idGeneration structure
    const requiredIdFields = [
      'combinations', 'defaultGenusLength', 'defaultSpeciesLength',
      'startingNumber',
      'useCollisionAvoidance', 'numberPadding'
    ]
    
    for (const field of requiredIdFields) {
      if (idGeneration[field] === undefined || idGeneration[field] === null) {
        return NextResponse.json(
          { error: `Missing required field in idGeneration: ${field}` },
          { status: 400 }
        )
      }
    }

    // Validate combinations array
    if (!Array.isArray(idGeneration.combinations) || idGeneration.combinations.length === 0) {
      return NextResponse.json(
        { error: 'combinations must be a non-empty array' },
        { status: 400 }
      )
    }

    // Validate each combination pair
    for (const combo of idGeneration.combinations) {
      if (!Array.isArray(combo) || combo.length !== 2 || 
          typeof combo[0] !== 'number' || typeof combo[1] !== 'number') {
        return NextResponse.json(
          { error: 'Each combination must be an array of two numbers' },
          { status: 400 }
        )
      }
    }

    // Validate labInfo structure
    if (!labInfo.name || !labInfo.location) {
      return NextResponse.json(
        { error: 'Lab name and location are required' },
        { status: 400 }
      )
    }

    const client = await get_or_create_client()
    if (client == null) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const dbname = await get_database_user()
    const db = client.db(dbname)
    const collection = db.collection('settings')
    const authuser = await get_name_authuser() || "unknown user"

    const settingsDoc = {
      type: 'main',
      idGeneration,
      labInfo,
      lastModified: new Date(),
      modifiedBy: authuser,
      version: 1
    }

    // Upsert the settings document
    const result = await collection.replaceOne(
      { type: 'main' },
      settingsDoc,
      { upsert: true }
    )

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      data: {
        acknowledged: result.acknowledged,
        modifiedCount: result.modifiedCount,
        upsertedCount: result.upsertedCount
      }
    })

  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
