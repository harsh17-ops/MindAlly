import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Get PDF document
export async function GET(
  req: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    // Get the session token
    const token = await getToken({ 
      req,
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const documentId = params.documentId;
    const apiUrl = process.env.API_URL || 'http://localhost:5000';
    const apiEndpoint = `${apiUrl}/api`;
    
    // Forward the request with user ID in headers
    const response = await fetch(`${apiEndpoint}/pdf/${documentId}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': token.sub || '', // Forward the user ID
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to fetch PDF');
    }

    // Get the PDF data as JSON (backend returns JSON with base64 data)
    const data = await response.json();
    
    // Return the JSON response directly (PdfViewer expects JSON with data field)
    return NextResponse.json(data);
  } catch (err) {
    console.error('Error fetching PDF:', err);
    const error = err as Error;
    return NextResponse.json(
      { error: error.message || 'Failed to fetch PDF' },
      { status: 500 }
    );
  }
}

// Chat with PDF
export async function POST(
  req: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    // Get the session token
    const token = await getToken({ 
      req,
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const apiUrl = process.env.API_URL || 'http://localhost:5000';
    const apiEndpoint = `${apiUrl}/api`;
    
    const response = await fetch(
      `${apiEndpoint}/pdf/${params.documentId}/chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': token.sub || '', // Forward the user ID
        },
        body: JSON.stringify({
          ...body,
          userId: token.sub, // Include user ID in the request body
        }),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to process chat request');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Error in chat:', err);
    const error = err as Error;
    return NextResponse.json(
      { error: error.message || 'Failed to process chat request' },
      { status: 500 }
    );
  }
} 