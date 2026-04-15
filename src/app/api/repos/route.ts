import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchGitHubRepos } from "@/lib/github";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Try to get from DB first
  const dbRepos = await prisma.repository.findMany({
    where: { userId: session.user.id },
    orderBy: { pushedAt: "desc" },
  });

  if (dbRepos.length > 0) {
    return NextResponse.json(dbRepos);
  }

  return NextResponse.json([]);
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || !session.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch from GitHub
  const ghRepos = await fetchGitHubRepos(session.accessToken);

  // Upsert into DB
  const results = [];
  for (const repo of ghRepos) {
    const upserted = await prisma.repository.upsert({
      where: { githubId: repo.id },
      create: {
        githubId: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        language: repo.language,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        size: repo.size,
        defaultBranch: repo.default_branch,
        pushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
        htmlUrl: repo.html_url,
        userId: session.user.id,
      },
      update: {
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        language: repo.language,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        size: repo.size,
        defaultBranch: repo.default_branch,
        pushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
        htmlUrl: repo.html_url,
      },
    });
    results.push(upserted);
  }

  return NextResponse.json(results);
}
