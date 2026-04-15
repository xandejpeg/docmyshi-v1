import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateDocs } from "@/lib/doc-engine";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ repoId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { repoId } = await params;

  const nodes = await prisma.docNode.findMany({
    where: { repoId },
    orderBy: { createdAt: "asc" },
  });

  const links = await prisma.docLink.findMany({
    where: {
      fromNode: { repoId },
    },
  });

  return NextResponse.json({ nodes, links });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ repoId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !session.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { repoId } = await params;

  const repo = await prisma.repository.findUnique({ where: { id: repoId } });
  if (!repo || repo.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Create job
  const job = await prisma.docJob.create({
    data: {
      repoId,
      userId: session.user.id,
      status: "running",
    },
  });

  try {
    // Generate docs
    const result = await generateDocs({
      repoName: repo.name,
      repoFullName: repo.fullName,
      description: repo.description,
      language: repo.language,
      accessToken: session.accessToken,
      defaultBranch: repo.defaultBranch,
    });

    // Clear old docs
    await prisma.docNode.deleteMany({ where: { repoId } });

    // Save new docs
    const nodeMap: Record<string, string> = {};
    for (const doc of result.docs) {
      const node = await prisma.docNode.create({
        data: {
          slug: doc.slug,
          type: doc.type,
          title: doc.title,
          content: doc.content,
          confidence: doc.confidence,
          classification: doc.classification,
          evidence: JSON.stringify(doc.evidence),
          repoId,
        },
      });
      nodeMap[doc.slug] = node.id;
    }

    // Save links
    for (const link of result.links) {
      const fromId = nodeMap[link.fromSlug];
      const toId = nodeMap[link.toSlug];
      if (fromId && toId) {
        await prisma.docLink.create({
          data: {
            fromNodeId: fromId,
            toNodeId: toId,
            type: link.type,
            label: link.label,
          },
        });
      }
    }

    // Update job
    await prisma.docJob.update({
      where: { id: job.id },
      data: { status: "completed" },
    });

    // Return fresh data
    const nodes = await prisma.docNode.findMany({ where: { repoId } });
    const links = await prisma.docLink.findMany({
      where: { fromNode: { repoId } },
    });

    return NextResponse.json({ nodes, links });
  } catch (error) {
    await prisma.docJob.update({
      where: { id: job.id },
      data: {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}
