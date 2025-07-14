import { get_or_create_client } from '../../utils/mongodbClient';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

/**
 * @swagger
 * components:
 *   schemas:
 *     UserControlResponse:
 *       type: object
 *       properties:
 *         user:
 *           type: object
 *           description: Session user information from authentication provider
 *           properties:
 *             sub:
 *               type: string
 *               description: User identifier from Auth0
 *               example: "auth0|507f1f77bcf86cd799439011"
 *             name:
 *               type: string
 *               description: User's display name
 *               example: "John Doe"
 *             email:
 *               type: string
 *               description: User's email address
 *               example: "john.doe@example.com"
 *         dbuser:
 *           $ref: '#/components/schemas/User'
 *         needsIdentification:
 *           type: boolean
 *           description: Whether the user needs to complete profile setup
 *           example: false
 */

/**
 * @swagger
 * /api/auth/usercontrol:
 *   get:
 *     summary: Get user authentication and profile status
 *     description: |
 *       Retrieves the current user's authentication status and database profile information.
 *       Used to determine if a user needs to complete their profile setup after authentication.
 *     tags:
 *       - Users
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: User control information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserControlResponse'
 *             examples:
 *               existingUser:
 *                 summary: User with complete profile
 *                 value:
 *                   user:
 *                     sub: "auth0|507f1f77bcf86cd799439011"
 *                     name: "John Doe"
 *                     email: "john.doe@example.com"
 *                   dbuser:
 *                     _id: "507f1f77bcf86cd799439012"
 *                     auth0id: "auth0|507f1f77bcf86cd799439011"
 *                     name: "John Doe"
 *                     email: "john.doe@example.com"
 *                   needsIdentification: false
 *               newUser:
 *                 summary: User needing profile setup
 *                 value:
 *                   user:
 *                     sub: "auth0|507f1f77bcf86cd799439011"
 *                     name: "Jane Smith"
 *                     email: "jane.smith@example.com"
 *                   needsIdentification: true
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Database connection error
 */
export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return new NextResponse(null, { status: 401 });
        }

        const userId = session.user.sub;  // We added this to the session in authOptions

        const client = await get_or_create_client();
        const db = client.db('usersdb');
        const usersCollection = db.collection('users');

        const dbuser = await usersCollection.findOne({ auth0id: userId });

        if (!dbuser) {
            return new NextResponse(JSON.stringify({ 
                user: session.user, 
                needsIdentification: true 
            }));
        } else {
            return new NextResponse(JSON.stringify({ 
                dbuser, 
                user: session.user, 
                needsIdentification: false 
            }));
        }

    } catch (error) {
        console.error(error);
        return new NextResponse(null, { status: 500 });
    }
}