/**
 * Clipping Auth API
 * POST /api/clipping/auth — Login for clipping users (separate from admin auth)
 * Returns a signed JWT token valid for 7 days.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';
import { createClippingToken, TOKEN_EXPIRY_DAYS } from '@/lib/services/clipping/jwt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    const user = await prisma.clippingUser.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user || !user.active) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    // Update last login
    await prisma.clippingUser.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Create JWT
    const token = createClippingToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      company: user.company,
      exp: Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    });

    // Set cookie + return token
    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        company: user.company,
      },
    });

    response.cookies.set('clipping-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[ClippingAuth] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
