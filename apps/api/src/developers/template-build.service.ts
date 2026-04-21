import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  TemplateMarketplaceListing,
  TemplateMarketplaceListingDocument,
  DeveloperProfile,
  DeveloperProfileDocument,
} from '@shopit/api-database';
import { UploadService } from '../upload/upload.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BuildResult {
  success: boolean;
  bundleUrl?: string;
  bundleSize?: number;
  errors: string[];
  warnings: string[];
  validationPassed: boolean;
}

interface ManifestJson {
  id: string;
  name: { en?: string; ka?: string };
  description?: { en?: string; ka?: string };
  version: string;
  author?: { name?: string; email?: string; url?: string };
  sdkVersion?: string;
  category?: string;
  tags?: string[];
  pricing?: { type: string; price?: number; monthlyPrice?: number };
  assets?: { thumbnail?: string; screenshots?: string[] };
  main: string;
  pages?: string[];
  optionalPages?: string[];
}

// Patterns that indicate potential security issues
const SECURITY_BLOCKLIST = [
  /\beval\s*\(/,
  /\bnew\s+Function\s*\(/,
  /\bdocument\s*\.\s*write\s*\(/,
  /\bdocument\s*\.\s*writeln\s*\(/,
  /\bwindow\s*\.\s*location\s*=(?!=)/,
  /\blocation\s*\.\s*href\s*=(?!=)/,
  /innerHTML\s*=\s*[^=]/,
];

// Allowlisted domains for external resource loading
const ALLOWED_EXTERNAL_DOMAINS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn.shopit.ge',
  'api.shopit.ge',
  'unpkg.com',
  'cdn.jsdelivr.net',
];

@Injectable()
export class TemplateBuildService {
  private readonly logger = new Logger(TemplateBuildService.name);

  constructor(
    @InjectModel(TemplateMarketplaceListing.name)
    private readonly templateListingModel: Model<TemplateMarketplaceListingDocument>,
    @InjectModel(DeveloperProfile.name)
    private readonly developerProfileModel: Model<DeveloperProfileDocument>,
    private readonly uploadService: UploadService,
  ) {}

  // ---------------------------------------------------------------------------
  // Build Pipeline: GitHub → Download → Validate → Bundle → Upload → Store URL
  // ---------------------------------------------------------------------------

  async buildTemplate(
    userId: string,
    listingId: string,
    versionOverride?: string,
  ): Promise<BuildResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Verify listing ownership and get GitHub info
    const { listing, profile } = await this.getListingForBuild(userId, listingId);

    if (!listing.githubRepo) {
      throw new BadRequestException(
        'Template must have a connected GitHub repository to build',
      );
    }

    // 2. Download source from GitHub
    const tmpDir = await this.createTempDir(listing.templateSlug);

    try {
      await this.downloadFromGithub(
        profile,
        listing.githubRepo,
        tmpDir,
      );

      // 3. Parse and validate manifest
      const manifest = await this.parseManifest(tmpDir, errors);
      if (!manifest) {
        return { success: false, errors, warnings, validationPassed: false };
      }

      // Use version override or manifest version
      const version = versionOverride || manifest.version || listing.version;

      // 4. Validate source code (security scan)
      const validationPassed = await this.validateSource(tmpDir, errors, warnings);
      if (!validationPassed) {
        return { success: false, errors, warnings, validationPassed: false };
      }

      // 5. Validate required exports / entry point
      const entryFile = manifest.main || 'src/index.ts';
      const entryPath = path.join(tmpDir, entryFile);
      const entryExists = await this.fileExists(entryPath);
      if (!entryExists) {
        errors.push(`Entry point "${entryFile}" not found`);
        return { success: false, errors, warnings, validationPassed: false };
      }

      // 6. Bundle with esbuild
      const bundleContent = await this.bundleTemplate(tmpDir, entryFile, errors);
      if (!bundleContent) {
        return { success: false, errors, warnings, validationPassed: true };
      }

      // 7. Post-build validation: check the bundle for security issues
      this.scanBundleForSecurityIssues(bundleContent, warnings);

      // 8. Upload bundle to S3
      const bundleUrl = await this.uploadBundle(
        listing.templateSlug,
        version,
        bundleContent,
      );

      // 9. Upload thumbnail if present in assets
      let thumbnailUrl = listing.thumbnail;
      if (manifest.assets?.thumbnail) {
        const thumbPath = path.join(tmpDir, manifest.assets.thumbnail);
        if (await this.fileExists(thumbPath)) {
          const thumbContent = await fs.readFile(thumbPath);
          thumbnailUrl = await this.uploadAsset(
            listing.templateSlug,
            'thumbnail',
            thumbContent,
            manifest.assets.thumbnail,
          );
        }
      }

      // 10. Update listing with bundle URL, version, and manifest data
      listing.bundleUrl = bundleUrl;
      listing.version = version;
      listing.sdkVersion = manifest.sdkVersion || listing.sdkVersion;
      if (thumbnailUrl) listing.thumbnail = thumbnailUrl;
      if (manifest.tags?.length) listing.tags = manifest.tags;
      if (manifest.category) listing.categories = [manifest.category];
      await listing.save();

      this.logger.log(
        `Template "${listing.templateSlug}" v${version} built successfully → ${bundleUrl}`,
      );

      return {
        success: true,
        bundleUrl,
        bundleSize: Buffer.byteLength(bundleContent, 'utf-8'),
        errors,
        warnings,
        validationPassed: true,
      };
    } finally {
      // Clean up temp directory
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => { /* cleanup */ });
    }
  }

  // ---------------------------------------------------------------------------
  // 1. Listing / profile resolution
  // ---------------------------------------------------------------------------

  private async getListingForBuild(userId: string, listingId: string) {
    const profile = await this.developerProfileModel
      .findOne({ userId: new Types.ObjectId(userId), status: 'approved' })
      .select('+githubAccessToken')
      .lean();

    if (!profile) {
      throw new NotFoundException('Approved developer profile not found');
    }

    const listing = await this.templateListingModel.findOne({
      _id: new Types.ObjectId(listingId),
      developerId: profile._id,
    });

    if (!listing) {
      throw new NotFoundException('Template listing not found');
    }

    return { listing, profile };
  }

  // ---------------------------------------------------------------------------
  // 2. Download source from GitHub
  // ---------------------------------------------------------------------------

  private async downloadFromGithub(
    profile: DeveloperProfileDocument,
    githubRepo: string,
    destDir: string,
  ): Promise<void> {
    // Extract owner/repo from the GitHub URL
    const repoMatch = githubRepo.match(
      /github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/,
    );
    if (!repoMatch) {
      throw new BadRequestException(
        `Invalid GitHub repo URL: ${githubRepo}`,
      );
    }

    const [, owner, repo] = repoMatch;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accessToken = (profile as any).githubAccessToken;
    if (!accessToken) {
      throw new BadRequestException(
        'GitHub access token not found. Please reconnect your GitHub account.',
      );
    }

    // Download tarball from GitHub API
    const tarballUrl = `https://api.github.com/repos/${owner}/${repo}/tarball`;
    const response = await fetch(tarballUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
      },
    });

    if (!response.ok) {
      throw new BadRequestException(
        `Failed to download repository: ${response.status} ${response.statusText}`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const tarPath = path.join(destDir, '__repo.tar.gz');
    await fs.writeFile(tarPath, Buffer.from(arrayBuffer));

    // Extract tarball
    const { execSync } = await import('child_process');
    execSync(`tar -xzf __repo.tar.gz --strip-components=1`, {
      cwd: destDir,
      stdio: 'pipe',
    });

    // Remove tarball
    await fs.unlink(tarPath);
  }

  // ---------------------------------------------------------------------------
  // 3. Parse + validate manifest
  // ---------------------------------------------------------------------------

  private async parseManifest(
    dir: string,
    errors: string[],
  ): Promise<ManifestJson | null> {
    const manifestPath = path.join(dir, 'shopit.template.json');

    if (!(await this.fileExists(manifestPath))) {
      errors.push('Missing shopit.template.json manifest file');
      return null;
    }

    try {
      const raw = await fs.readFile(manifestPath, 'utf-8');
      const manifest: ManifestJson = JSON.parse(raw);

      // Validate required fields
      if (!manifest.id) errors.push('Manifest missing "id"');
      if (!manifest.name?.en && !manifest.name?.ka)
        errors.push('Manifest missing "name" (en or ka)');
      if (!manifest.version) errors.push('Manifest missing "version"');
      if (!manifest.main) errors.push('Manifest missing "main" entry point');

      // Validate pages declaration
      const requiredPages = ['home', 'products', 'productDetail', 'about'];
      if (manifest.pages) {
        for (const page of requiredPages) {
          if (!manifest.pages.includes(page)) {
            errors.push(`Manifest missing required page: "${page}"`);
          }
        }
      }

      if (errors.length > 0) return null;
      return manifest;
    } catch {
      errors.push('Invalid JSON in shopit.template.json');
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Security validation of source code
  // ---------------------------------------------------------------------------

  private async validateSource(
    dir: string,
    errors: string[],
    warnings: string[],
  ): Promise<boolean> {
    const sourceFiles = await this.findFiles(dir, [
      '.ts',
      '.tsx',
      '.js',
      '.jsx',
    ]);

    let hasSecurityIssues = false;

    for (const file of sourceFiles) {
      const content = await fs.readFile(file, 'utf-8');
      const relativePath = path.relative(dir, file);

      // Check for security blocklist patterns
      for (const pattern of SECURITY_BLOCKLIST) {
        if (pattern.test(content)) {
          errors.push(
            `Security violation in ${relativePath}: found "${pattern.source}" — this is not allowed in templates`,
          );
          hasSecurityIssues = true;
        }
      }

      // Check for external fetch calls to non-allowlisted domains
      const fetchMatches = content.matchAll(
        /fetch\s*\(\s*['"`](https?:\/\/[^'"`\s)]+)/g,
      );
      for (const match of fetchMatches) {
        const url = match[1];
        try {
          const hostname = new URL(url).hostname;
          if (!ALLOWED_EXTERNAL_DOMAINS.some((d) => hostname.endsWith(d))) {
            warnings.push(
              `External fetch to "${hostname}" in ${relativePath} — only allowlisted domains are permitted`,
            );
          }
        } catch {
          // malformed URL — skip
        }
      }

      // Check for dynamic import of arbitrary URLs
      const dynamicImports = content.matchAll(
        /import\s*\(\s*['"`](https?:\/\/[^'"`\s)]+)/g,
      );
      for (const match of dynamicImports) {
        errors.push(
          `Dynamic import of external URL "${match[1]}" in ${relativePath} is not allowed`,
        );
        hasSecurityIssues = true;
      }
    }

    return !hasSecurityIssues;
  }

  private scanBundleForSecurityIssues(
    bundleContent: string,
    warnings: string[],
  ): void {
    // Light-touch check on the final bundle
    if (/\beval\s*\(/.test(bundleContent)) {
      warnings.push(
        'Bundle contains eval() — this may be flagged during review',
      );
    }
    if (/\bnew\s+Function\s*\(/.test(bundleContent)) {
      warnings.push(
        'Bundle contains new Function() — this may be flagged during review',
      );
    }
  }

  // ---------------------------------------------------------------------------
  // 6. Bundle with esbuild
  // ---------------------------------------------------------------------------

  async bundleTemplate(
    dir: string,
    entryFile: string,
    errors: string[],
  ): Promise<string | null> {
    try {
      const esbuild = await import('esbuild');
      const entryPath = path.join(dir, entryFile);

      const result = await esbuild.build({
        entryPoints: [entryPath],
        bundle: true,
        format: 'esm',
        target: 'es2020',
        platform: 'browser',
        minify: true,
        // Externalize React & SDK — they are provided by the host app
        external: [
          'react',
          'react-dom',
          'react/jsx-runtime',
          'next',
          'next/*',
          '@shopit/template-sdk',
          '@shopit/template-sdk/*',
        ],
        write: false,
        metafile: true,
        jsx: 'automatic',
        loader: {
          '.ts': 'ts',
          '.tsx': 'tsx',
          '.js': 'js',
          '.jsx': 'jsx',
          '.css': 'css',
          '.json': 'json',
          '.svg': 'dataurl',
          '.png': 'dataurl',
          '.jpg': 'dataurl',
          '.gif': 'dataurl',
          '.webp': 'dataurl',
        },
      });

      if (result.errors.length > 0) {
        for (const err of result.errors) {
          errors.push(`Build error: ${err.text}`);
        }
        return null;
      }

      if (result.outputFiles && result.outputFiles.length > 0) {
        return result.outputFiles[0].text;
      }

      errors.push('Build produced no output');
      return null;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      errors.push(`Build failed: ${message}`);
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // 8. Upload bundle to S3
  // ---------------------------------------------------------------------------

  private async uploadBundle(
    templateSlug: string,
    version: string,
    bundleContent: string,
  ): Promise<string> {
    const hash = crypto
      .createHash('sha256')
      .update(bundleContent)
      .digest('hex')
      .slice(0, 8);

    const buffer = Buffer.from(bundleContent, 'utf-8');

    // Upload raw buffer to S3
    const file: Express.Multer.File = {
      buffer,
      originalname: `bundle.${hash}.js`,
      mimetype: 'application/javascript',
      size: buffer.length,
      fieldname: 'bundle',
      encoding: '7bit',
      destination: '',
      filename: '',
      path: '',
      stream: null as unknown as Express.Multer.File['stream'],
    };

    const result = await this.uploadService.uploadFile(file, {
      folder: `templates/${templateSlug}/${version}`,
      maxSizeBytes: 10 * 1024 * 1024, // 10MB max for bundles
      allowedMimeTypes: ['application/javascript'],
    });

    return result.url;
  }

  private async uploadAsset(
    templateSlug: string,
    assetName: string,
    content: Buffer,
    originalFilename: string,
  ): Promise<string> {
    const ext = path.extname(originalFilename);
    const file: Express.Multer.File = {
      buffer: content,
      originalname: `${assetName}${ext}`,
      mimetype: ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg',
      size: content.length,
      fieldname: 'asset',
      encoding: '7bit',
      destination: '',
      filename: '',
      path: '',
      stream: null as unknown as Express.Multer.File['stream'],
    };

    const result = await this.uploadService.uploadFile(file, {
      folder: `templates/${templateSlug}/assets`,
      maxSizeBytes: 5 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    });

    return result.url;
  }

  // ---------------------------------------------------------------------------
  // Version management
  // ---------------------------------------------------------------------------

  async getVersionHistory(
    userId: string,
    listingId: string,
  ): Promise<{ versions: VersionEntry[] }> {
    const { listing } = await this.getListingForBuild(userId, listingId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const versions = (listing as any).versionHistory || [];
    return { versions };
  }

  async publishVersion(
    userId: string,
    listingId: string,
    version: string,
    changelog?: string,
  ): Promise<BuildResult> {
    const { listing } = await this.getListingForBuild(userId, listingId);

    // Verify current build matches the version being published
    if (listing.version !== version) {
      throw new BadRequestException(
        `Version mismatch: listing is at v${listing.version} but tried to publish v${version}. Run a build first.`,
      );
    }

    if (!listing.bundleUrl) {
      throw new BadRequestException(
        'Template must be built before publishing a version. Run the build first.',
      );
    }

    // Add to version history
    const historyEntry: VersionEntry = {
      version,
      bundleUrl: listing.bundleUrl,
      changelog: changelog || '',
      publishedAt: new Date(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const history: VersionEntry[] = (listing as any).versionHistory || [];

    // Check for duplicate version
    if (history.some((v) => v.version === version)) {
      throw new BadRequestException(
        `Version ${version} already exists in history. Bump the version number.`,
      );
    }

    history.push(historyEntry);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (listing as any).versionHistory = history;
    await listing.save();

    this.logger.log(
      `Template "${listing.templateSlug}" version ${version} published`,
    );

    return {
      success: true,
      bundleUrl: listing.bundleUrl,
      errors: [],
      warnings: [],
      validationPassed: true,
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async createTempDir(slug: string): Promise<string> {
    const dir = path.join(os.tmpdir(), `shopit-build-${slug}-${Date.now()}`);
    await fs.mkdir(dir, { recursive: true });
    return dir;
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async findFiles(dir: string, extensions: string[]): Promise<string[]> {
    const results: string[] = [];

    const walk = async (currentDir: string) => {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;

        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
          results.push(fullPath);
        }
      }
    };

    await walk(dir);
    return results;
  }
}

export interface VersionEntry {
  version: string;
  bundleUrl: string;
  changelog: string;
  publishedAt: Date;
}
