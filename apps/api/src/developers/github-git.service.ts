import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  DeveloperProfile,
  DeveloperProfileDocument,
  TemplateMarketplaceListing,
  TemplateMarketplaceListingDocument,
} from '@shopit/api-database';

interface GitHubTreeItem {
  path: string;
  mode: string;
  type: string;
  sha: string;
  size?: number;
}

interface GitHubFileContent {
  content: string;
  encoding: string;
  sha: string;
}

interface GitHubCommit {
  sha: string;
  message: string;
  author: { name: string; date: string };
  committer: { name: string; date: string };
}

@Injectable()
export class GithubGitService {
  private readonly logger = new Logger(GithubGitService.name);

  constructor(
    @InjectModel(DeveloperProfile.name)
    private readonly developerProfileModel: Model<DeveloperProfileDocument>,
    @InjectModel(TemplateMarketplaceListing.name)
    private readonly templateListingModel: Model<TemplateMarketplaceListingDocument>,
  ) {}

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async getRepoContext(userId: string, listingId: string) {
    const profile = await this.developerProfileModel
      .findOne({
        userId: new Types.ObjectId(userId),
        status: 'approved',
      })
      .select('+githubAccessToken');
    if (!profile) throw new NotFoundException('Developer profile not found');

    const accessToken = profile.get('githubAccessToken') as string | undefined;
    if (!accessToken || !profile.githubUsername) {
      throw new BadRequestException('GitHub account not connected');
    }

    const listing = await this.templateListingModel.findOne({
      _id: new Types.ObjectId(listingId),
      developerId: profile._id,
    });
    if (!listing) throw new NotFoundException('Template not found');
    if (!listing.githubRepo) {
      throw new BadRequestException('Template has no connected GitHub repository');
    }

    // Extract owner/repo from URL like https://github.com/user/repo
    const match = listing.githubRepo.match(
      /github\.com\/([^/]+)\/([^/\s]+)/,
    );
    if (!match) throw new BadRequestException('Invalid GitHub repo URL');
    const fullName = `${match[1]}/${match[2].replace(/\.git$/, '')}`;

    return { accessToken, fullName, listing, profile };
  }

  private async ghFetch<T>(
    url: string,
    token: string,
    options: RequestInit = {},
  ): Promise<T> {
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      this.logger.error(`GitHub API error: ${res.status} ${JSON.stringify(err)}`);
      throw new BadRequestException(
        (err as { message?: string }).message || `GitHub API error: ${res.status}`,
      );
    }

    return res.json() as Promise<T>;
  }

  // ---------------------------------------------------------------------------
  // List repo file tree
  // ---------------------------------------------------------------------------

  async listFiles(
    userId: string,
    listingId: string,
    ref = 'main',
  ): Promise<{ path: string; type: string; size?: number }[]> {
    const { accessToken, fullName } = await this.getRepoContext(userId, listingId);

    const data = await this.ghFetch<{ tree: GitHubTreeItem[] }>(
      `https://api.github.com/repos/${fullName}/git/trees/${ref}?recursive=1`,
      accessToken,
    );

    return data.tree
      .filter((item) => item.type === 'blob')
      .map((item) => ({
        path: item.path,
        type: item.type,
        size: item.size,
      }));
  }

  // ---------------------------------------------------------------------------
  // Get file content
  // ---------------------------------------------------------------------------

  async getFileContent(
    userId: string,
    listingId: string,
    filePath: string,
    ref = 'main',
  ): Promise<{ content: string; sha: string }> {
    const { accessToken, fullName } = await this.getRepoContext(userId, listingId);

    const data = await this.ghFetch<GitHubFileContent>(
      `https://api.github.com/repos/${fullName}/contents/${encodeURIComponent(filePath)}?ref=${ref}`,
      accessToken,
    );

    const content =
      data.encoding === 'base64'
        ? Buffer.from(data.content, 'base64').toString('utf-8')
        : data.content;

    return { content, sha: data.sha };
  }

  // ---------------------------------------------------------------------------
  // Commit & push (update/create multiple files in one commit)
  // ---------------------------------------------------------------------------

  async commitAndPush(
    userId: string,
    listingId: string,
    files: { path: string; content: string }[],
    message: string,
    ref = 'main',
    deletions: string[] = [],
  ): Promise<{ sha: string; message: string }> {
    const { accessToken, fullName } = await this.getRepoContext(userId, listingId);
    const apiBase = `https://api.github.com/repos/${fullName}`;

    // 1. Get latest commit SHA for the branch
    const refData = await this.ghFetch<{ object: { sha: string } }>(
      `${apiBase}/git/ref/heads/${ref}`,
      accessToken,
    );
    const latestCommitSha = refData.object.sha;

    // 2. Get the tree of the latest commit
    const commitData = await this.ghFetch<{ tree: { sha: string } }>(
      `${apiBase}/git/commits/${latestCommitSha}`,
      accessToken,
    );
    const baseTreeSha = commitData.tree.sha;

    // 3. Create blobs for each file
    const treeItems: { path: string; mode: '100644'; type: 'blob'; sha: string | null }[] =
      await Promise.all(
        files.map(async (file) => {
          const blob = await this.ghFetch<{ sha: string }>(
            `${apiBase}/git/blobs`,
            accessToken,
            {
              method: 'POST',
              body: JSON.stringify({
                content: file.content,
                encoding: 'utf-8',
              }),
            },
          );
          return {
            path: file.path,
            mode: '100644' as const,
            type: 'blob' as const,
            sha: blob.sha,
          };
        }),
      );

    // 3b. Add deletion entries (sha: null removes the file from the tree)
    for (const delPath of deletions) {
      treeItems.push({
        path: delPath,
        mode: '100644' as const,
        type: 'blob' as const,
        sha: null,
      });
    }

    // 4. Create new tree
    const newTree = await this.ghFetch<{ sha: string }>(
      `${apiBase}/git/trees`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems }),
      },
    );

    // 5. Create the commit
    const newCommit = await this.ghFetch<{ sha: string }>(
      `${apiBase}/git/commits`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({
          message,
          tree: newTree.sha,
          parents: [latestCommitSha],
        }),
      },
    );

    // 6. Update the branch ref
    await this.ghFetch(
      `${apiBase}/git/refs/heads/${ref}`,
      accessToken,
      {
        method: 'PATCH',
        body: JSON.stringify({ sha: newCommit.sha }),
      },
    );

    this.logger.log(
      `Committed ${files.length} file(s)${deletions.length ? `, deleted ${deletions.length}` : ''} to ${fullName}: ${newCommit.sha.slice(0, 7)}`,
    );

    return { sha: newCommit.sha, message };
  }

  // ---------------------------------------------------------------------------
  // Get recent commits (log)
  // ---------------------------------------------------------------------------

  async getCommitLog(
    userId: string,
    listingId: string,
    ref = 'main',
    limit = 20,
  ): Promise<
    { sha: string; message: string; author: string; date: string }[]
  > {
    const { accessToken, fullName } = await this.getRepoContext(userId, listingId);

    const commits = await this.ghFetch<
      {
        sha: string;
        commit: GitHubCommit;
        author?: { login: string };
      }[]
    >(
      `https://api.github.com/repos/${fullName}/commits?sha=${ref}&per_page=${limit}`,
      accessToken,
    );

    return commits.map((c) => ({
      sha: c.sha,
      message: c.commit.message,
      author: c.author?.login || c.commit.author.name,
      date: c.commit.author.date,
    }));
  }

  // ---------------------------------------------------------------------------
  // Get repo status (compare HEAD with working tree isn't possible via API,
  // but we can check if the repo exists and get branch info)
  // ---------------------------------------------------------------------------

  async getRepoInfo(
    userId: string,
    listingId: string,
  ): Promise<{
    fullName: string;
    defaultBranch: string;
    url: string;
    lastCommit?: { sha: string; message: string; date: string };
  }> {
    const { accessToken, fullName } = await this.getRepoContext(userId, listingId);

    const repo = await this.ghFetch<{
      html_url: string;
      default_branch: string;
    }>(`https://api.github.com/repos/${fullName}`, accessToken);

    // Get latest commit
    let lastCommit: { sha: string; message: string; date: string } | undefined;
    try {
      const commits = await this.ghFetch<
        { sha: string; commit: { message: string; author: { date: string } } }[]
      >(
        `https://api.github.com/repos/${fullName}/commits?per_page=1`,
        accessToken,
      );
      if (commits[0]) {
        lastCommit = {
          sha: commits[0].sha,
          message: commits[0].commit.message,
          date: commits[0].commit.author.date,
        };
      }
    } catch {
      // ignore
    }

    return {
      fullName,
      defaultBranch: repo.default_branch,
      url: repo.html_url,
      lastCommit,
    };
  }
}
