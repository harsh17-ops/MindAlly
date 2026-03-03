import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const apiUrl = process.env.API_URL || 'http://localhost:5000';
const apiEndpoint = `${apiUrl}/api`;

export async function POST(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    // Get the session token
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token || !token.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const { documentId } = params;
    const body = await request.json();

    const response = await fetch(`${apiEndpoint}/pdf/${documentId}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': token.id.toString(),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.message || 'Failed to process chat request' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PDF chat:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 