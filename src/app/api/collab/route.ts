import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// POST /api/collab — Create or join a collab session
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { projectId, inviteCode } = await req.json();

    // Join by invite code
    if (inviteCode) {
      const collabSession = await prisma.collabSession.findUnique({
        where: { inviteCode },
        include: { project: { select: { id: true, name: true, ownerId: true } } },
      });

      if (!collabSession || !collabSession.isActive) {
        return NextResponse.json(
          { error: 'Invalid or expired invite' },
          { status: 404 }
        );
      }

      // Add member (upsert to avoid duplicate)
      await prisma.collabMember.upsert({
        where: {
          userId_sessionId: {
            userId: session.user.id,
            sessionId: collabSession.id,
          },
        },
        update: { lastSeen: new Date() },
        create: {
          userId: session.user.id,
          sessionId: collabSession.id,
          role: 'editor',
        },
      });

      return NextResponse.json({
        sessionId: collabSession.id,
        projectId: collabSession.project.id,
        projectName: collabSession.project.name,
      });
    }

    // Create new session
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID or invite code required' },
        { status: 400 }
      );
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project || project.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const collabSession = await prisma.collabSession.upsert({
      where: { projectId },
      update: { isActive: true },
      create: {
        projectId,
        members: {
          create: {
            userId: session.user.id,
            role: 'owner',
          },
        },
      },
      include: { members: true },
    });

    return NextResponse.json({
      sessionId: collabSession.id,
      inviteCode: collabSession.inviteCode,
      projectId,
    });
  } catch (error) {
    logger.error('Collab error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
