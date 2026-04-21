import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  DeveloperProfile,
  DeveloperProfileDocument,
  TemplateMarketplaceListing,
  TemplateMarketplaceListingDocument,
  User,
  UserDocument,
} from '@shopit/api-database';
import { Role, addRole } from '@shopit/constants';
import {
  ApplyDeveloperDto,
  UpdateDeveloperProfileDto,
  CreateTemplateListingDto,
  UpdateTemplateListingDto,
  ScaffoldTemplateDto,
} from './dto';

@Injectable()
export class DevelopersService {
  private readonly logger = new Logger(DevelopersService.name);

  constructor(
    @InjectModel(DeveloperProfile.name)
    private readonly developerProfileModel: Model<DeveloperProfileDocument>,
    @InjectModel(TemplateMarketplaceListing.name)
    private readonly templateListingModel: Model<TemplateMarketplaceListingDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  // ---------------------------------------------------------------------------
  // Developer Registration
  // ---------------------------------------------------------------------------

  async apply(userId: string, dto: ApplyDeveloperDto) {
    const existing = await this.developerProfileModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .lean();

    if (existing) {
      throw new ConflictException('You have already applied as a developer');
    }

    const profile = await this.developerProfileModel.create({
      userId: new Types.ObjectId(userId),
      displayName: dto.displayName,
      bio: dto.bio,
      website: dto.website,
      githubUsername: dto.githubUsername,
      status: 'pending',
      earnings: { total: 0, pending: 0, withdrawn: 0 },
      templatesCount: 0,
    });

    this.logger.log(`Developer application created for user ${userId}`);

    return {
      message: 'Developer application submitted successfully',
      profile: this.toProfileResponse(profile),
    };
  }

  async getMyProfile(userId: string) {
    const profile = await this.developerProfileModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .lean();

    if (!profile) {
      throw new NotFoundException('Developer profile not found');
    }

    return { profile: this.toProfileResponse(profile) };
  }

  async getMyStats(userId: string) {
    const profile = await this.developerProfileModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .lean();

    if (!profile) {
      throw new NotFoundException('Developer profile not found');
    }

    const [totalTemplates, publishedTemplates, pendingReviewTemplates, draftTemplates] =
      await Promise.all([
        this.templateListingModel.countDocuments({ developerId: profile._id }),
        this.templateListingModel.countDocuments({ developerId: profile._id, status: 'published' }),
        this.templateListingModel.countDocuments({ developerId: profile._id, status: 'pending_review' }),
        this.templateListingModel.countDocuments({ developerId: profile._id, status: 'draft' }),
      ]);

    // Aggregate total installs across all templates
    const installsResult = await this.templateListingModel.aggregate([
      { $match: { developerId: profile._id } },
      { $group: { _id: null, totalInstalls: { $sum: '$stats.installs' } } },
    ]);
    const totalInstalls = installsResult[0]?.totalInstalls || 0;

    return {
      templates: {
        total: totalTemplates,
        published: publishedTemplates,
        pendingReview: pendingReviewTemplates,
        draft: draftTemplates,
      },
      earnings: profile.earnings,
      totalInstalls,
      displayName: profile.displayName,
      status: profile.status,
    };
  }

  // ---------------------------------------------------------------------------
  // Template Scaffold Generator
  // ---------------------------------------------------------------------------

  generateScaffold(dto: ScaffoldTemplateDto): Record<string, string> {
    const { slug, name, description, category, pricingType } = dto;
    const desc = description || `A ShopIt store template`;
    const cat = category || 'general';
    const pricing = pricingType || 'free';

    const files: Record<string, string> = {};

    // package.json
    files['package.json'] = JSON.stringify(
      {
        name: `@shopit-template/${slug}`,
        version: '1.0.0',
        private: true,
        type: 'module',
        main: 'src/index.ts',
        scripts: {
          dev: 'shopit-template dev',
          build: 'shopit-template build',
          lint: 'eslint src/',
        },
        peerDependencies: {
          react: '>=18.0.0',
          'react-dom': '>=18.0.0',
        },
        dependencies: {
          '@shopit/template-sdk': '^0.1.0',
        },
        devDependencies: {
          typescript: '^5.0.0',
          eslint: '^9.0.0',
        },
      },
      null,
      2,
    );

    // tsconfig.json
    files['tsconfig.json'] = JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2020',
          module: 'ESNext',
          moduleResolution: 'bundler',
          jsx: 'react-jsx',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          outDir: 'dist',
          rootDir: 'src',
          declaration: true,
        },
        include: ['src'],
      },
      null,
      2,
    );

    // shopit.template.json manifest
    files['shopit.template.json'] = JSON.stringify(
      {
        $schema:
          'https://shopit.ge/schemas/shopit.template.schema.json',
        id: slug,
        name: { en: name, ka: name },
        description: { en: desc, ka: desc },
        version: '1.0.0',
        author: '',
        sdkVersion: '0.1.0',
        category: cat,
        tags: [],
        pricing:
          pricing === 'free'
            ? { type: 'free' }
            : pricing === 'one-time'
              ? { type: 'one-time', price: 0 }
              : { type: 'subscription', monthlyPrice: 0 },
        assets: {
          thumbnail: 'assets/thumbnail.png',
          screenshots: [],
        },
        main: 'src/index.ts',
        pages: ['home', 'products', 'productDetail', 'about'],
        optionalPages: [],
        attributes: [],
      },
      null,
      2,
    );

    // src/index.ts — entry point
    files['src/index.ts'] = [
      `import { defineTemplate } from '@shopit/template-sdk';`,
      `import { HomePage } from './pages/HomePage';`,
      `import { ProductsPage } from './pages/ProductsPage';`,
      `import { ProductDetailPage } from './pages/ProductDetailPage';`,
      `import { AboutPage } from './pages/AboutPage';`,
      `import { LayoutWrapper } from './layout/Wrapper';`,
      `import { Header } from './layout/Header';`,
      `import { Footer } from './layout/Footer';`,
      ``,
      `export default defineTemplate({`,
      `  id: '${slug}',`,
      `  name: '${name}',`,
      `  description: '${desc}',`,
      `  version: '1.0.0',`,
      `  pages: {`,
      `    home: HomePage,`,
      `    products: ProductsPage,`,
      `    productDetail: ProductDetailPage,`,
      `    about: AboutPage,`,
      `  },`,
      `  layout: {`,
      `    wrapper: LayoutWrapper,`,
      `    header: Header,`,
      `    footer: Footer,`,
      `  },`,
      `  attributes: [],`,
      `  defaultAttributeValues: {},`,
      `});`,
    ].join('\n');

    // Page components
    files['src/pages/HomePage.tsx'] = [
      `import type { HomePageProps } from '@shopit/template-sdk';`,
      `import { PriceDisplay } from '@shopit/template-sdk';`,
      ``,
      `export function HomePage({ store, products, locale }: HomePageProps) {`,
      `  return (`,
      `    <div style={{ padding: '2rem' }}>`,
      `      <h1>{store.name}</h1>`,
      `      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem', marginTop: '2rem' }}>`,
      `        {products.map((product) => (`,
      `          <div key={product._id} style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '1rem' }}>`,
      `            {product.images[0] && <img src={product.images[0]} alt={product.name} style={{ width: '100%', borderRadius: '0.25rem' }} />}`,
      `            <h3 style={{ marginTop: '0.5rem' }}>{product.name}</h3>`,
      `            <PriceDisplay price={product.price} salePrice={product.salePrice} isOnSale={product.isOnSale} locale={locale} />`,
      `          </div>`,
      `        ))}`,
      `      </div>`,
      `    </div>`,
      `  );`,
      `}`,
    ].join('\n');

    files['src/pages/ProductsPage.tsx'] = [
      `import type { ProductsPageProps } from '@shopit/template-sdk';`,
      ``,
      `export function ProductsPage({ locale, subdomain }: ProductsPageProps) {`,
      `  return (`,
      `    <div style={{ padding: '2rem' }}>`,
      `      <h1>Products</h1>`,
      `      <p>Browse all products from {subdomain}</p>`,
      `    </div>`,
      `  );`,
      `}`,
    ].join('\n');

    files['src/pages/ProductDetailPage.tsx'] = [
      `import type { ProductDetailPageProps } from '@shopit/template-sdk';`,
      ``,
      `export function ProductDetailPage({ locale, subdomain, productId }: ProductDetailPageProps) {`,
      `  return (`,
      `    <div style={{ padding: '2rem' }}>`,
      `      <h1>Product Detail</h1>`,
      `      <p>Product ID: {productId}</p>`,
      `    </div>`,
      `  );`,
      `}`,
    ].join('\n');

    files['src/pages/AboutPage.tsx'] = [
      `import type { AboutPageProps } from '@shopit/template-sdk';`,
      ``,
      `export function AboutPage({ locale, subdomain }: AboutPageProps) {`,
      `  return (`,
      `    <div style={{ padding: '2rem' }}>`,
      `      <h1>About Us</h1>`,
      `      <p>Welcome to {subdomain}</p>`,
      `    </div>`,
      `  );`,
      `}`,
    ].join('\n');

    // Layout components
    files['src/layout/Wrapper.tsx'] = [
      `import type { LayoutWrapperProps } from '@shopit/template-sdk';`,
      ``,
      `export function LayoutWrapper({ store, accentColors, locale, children }: LayoutWrapperProps) {`,
      `  return (`,
      `    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', ...accentColors }}>`,
      `      {children}`,
      `    </div>`,
      `  );`,
      `}`,
    ].join('\n');

    files['src/layout/Header.tsx'] = [
      `import type { HeaderProps } from '@shopit/template-sdk';`,
      ``,
      `export function Header({ store }: HeaderProps) {`,
      `  return (`,
      `    <header style={{ padding: '1rem 2rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem' }}>`,
      `      {store.logo && <img src={store.logo} alt={store.name} style={{ height: 40, width: 40, borderRadius: '50%' }} />}`,
      `      <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{store.name}</h1>`,
      `    </header>`,
      `  );`,
      `}`,
    ].join('\n');

    files['src/layout/Footer.tsx'] = [
      `import type { FooterProps } from '@shopit/template-sdk';`,
      ``,
      `export function Footer({ store, locale }: FooterProps) {`,
      `  return (`,
      `    <footer style={{ padding: '2rem', borderTop: '1px solid #e2e8f0', marginTop: 'auto', textAlign: 'center' }}>`,
      `      <p>&copy; {new Date().getFullYear()} {store.name}</p>`,
      `    </footer>`,
      `  );`,
      `}`,
    ].join('\n');

    // README.md
    files['README.md'] = [
      `# ${name}`,
      ``,
      `${desc}`,
      ``,
      `## Getting Started`,
      ``,
      '```bash',
      `npm install`,
      `npm run dev`,
      '```',
      ``,
      `## Project Structure`,
      ``,
      '```',
      `${slug}/`,
      `├── package.json`,
      `├── shopit.template.json    # Template manifest`,
      `├── tsconfig.json`,
      `├── src/`,
      `│   ├── index.ts            # Template entry point`,
      `│   ├── pages/`,
      `│   │   ├── HomePage.tsx`,
      `│   │   ├── ProductsPage.tsx`,
      `│   │   ├── ProductDetailPage.tsx`,
      `│   │   └── AboutPage.tsx`,
      `│   └── layout/`,
      `│       ├── Wrapper.tsx`,
      `│       ├── Header.tsx`,
      `│       └── Footer.tsx`,
      `└── assets/`,
      `    └── thumbnail.png`,
      '```',
      ``,
      `## Documentation`,
      ``,
      `See the [ShopIt Template SDK documentation](https://developers.shopit.ge) for more details.`,
    ].join('\n');

    // .gitignore
    files['.gitignore'] = ['node_modules/', 'dist/', '.env', '.DS_Store'].join('\n');

    return files;
  }

  async updateMyProfile(userId: string, dto: UpdateDeveloperProfileDto) {
    const profile = await this.developerProfileModel.findOne({
      userId: new Types.ObjectId(userId),
    });

    if (!profile) {
      throw new NotFoundException('Developer profile not found');
    }

    if (dto.displayName !== undefined) profile.displayName = dto.displayName;
    if (dto.bio !== undefined) profile.bio = dto.bio;
    if (dto.website !== undefined) profile.website = dto.website;
    if (dto.githubUsername !== undefined)
      profile.githubUsername = dto.githubUsername;
    if (dto.avatar !== undefined) profile.avatar = dto.avatar;

    await profile.save();

    return {
      message: 'Profile updated successfully',
      profile: this.toProfileResponse(profile),
    };
  }

  async connectGithub(
    userId: string,
    githubUsername: string,
    githubAccessToken: string,
  ) {
    const profile = await this.developerProfileModel.findOne({
      userId: new Types.ObjectId(userId),
    });

    if (!profile) {
      throw new NotFoundException('Developer profile not found');
    }

    profile.githubUsername = githubUsername;
    profile.set('githubAccessToken', githubAccessToken);
    await profile.save();

    this.logger.log(`GitHub connected for developer ${userId}: ${githubUsername}`);
    return { message: 'GitHub connected', githubUsername };
  }

  async createGithubRepo(
    userId: string,
    dto: ScaffoldTemplateDto,
  ): Promise<{ repoUrl: string; cloneUrl: string }> {
    const profile = await this.developerProfileModel
      .findOne({ userId: new Types.ObjectId(userId), status: 'approved' })
      .select('+githubAccessToken');

    if (!profile) {
      throw new NotFoundException('Developer profile not found');
    }

    const accessToken = profile.get('githubAccessToken') as string | undefined;
    if (!accessToken || !profile.githubUsername) {
      throw new BadRequestException(
        'GitHub account not connected. Please connect your GitHub account first.',
      );
    }

    const files = this.generateScaffold(dto);
    const repoName = `shopit-template-${dto.slug}`;

    // Create the repository via GitHub API
    const createRepoRes = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: repoName,
        description: dto.description || `ShopIt store template: ${dto.name}`,
        private: false,
        auto_init: true,
      }),
    });

    if (!createRepoRes.ok) {
      const err = await createRepoRes.json().catch(() => ({}));
      this.logger.error(`GitHub repo creation failed: ${JSON.stringify(err)}`);
      throw new BadRequestException(
        (err as { message?: string }).message || 'Failed to create GitHub repository',
      );
    }

    const repo = (await createRepoRes.json()) as {
      html_url: string;
      clone_url: string;
      full_name: string;
    };

    // Create a tree with all scaffold files
    const blobs = await Promise.all(
      Object.entries(files).map(async ([path, content]) => {
        const blobRes = await fetch(
          `https://api.github.com/repos/${repo.full_name}/git/blobs`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/vnd.github+json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content, encoding: 'utf-8' }),
          },
        );
        const blob = (await blobRes.json()) as { sha: string };
        return { path, mode: '100644' as const, type: 'blob' as const, sha: blob.sha };
      }),
    );

    // Get the default branch's latest commit
    const refRes = await fetch(
      `https://api.github.com/repos/${repo.full_name}/git/ref/heads/main`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
        },
      },
    );
    const refData = (await refRes.json()) as { object: { sha: string } };

    // Create tree
    const treeRes = await fetch(
      `https://api.github.com/repos/${repo.full_name}/git/trees`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ base_tree: refData.object.sha, tree: blobs }),
      },
    );
    const tree = (await treeRes.json()) as { sha: string };

    // Create commit
    const commitRes = await fetch(
      `https://api.github.com/repos/${repo.full_name}/git/commits`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Initial template scaffold from ShopIt Developer Portal',
          tree: tree.sha,
          parents: [refData.object.sha],
        }),
      },
    );
    const commit = (await commitRes.json()) as { sha: string };

    // Update the ref to point to new commit
    await fetch(
      `https://api.github.com/repos/${repo.full_name}/git/refs/heads/main`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sha: commit.sha }),
      },
    );

    this.logger.log(
      `GitHub repo "${repo.full_name}" created for developer ${userId}`,
    );

    return { repoUrl: repo.html_url, cloneUrl: repo.clone_url };
  }

  // ---------------------------------------------------------------------------
  // Admin: Developer approval
  // ---------------------------------------------------------------------------

  async getPendingApplications() {
    const profiles = await this.developerProfileModel
      .find({ status: 'pending' })
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: 1 })
      .lean();

    return { profiles: profiles.map((p) => this.toProfileResponse(p)) };
  }

  async approveApplication(profileId: string) {
    const profile = await this.developerProfileModel.findById(profileId);
    if (!profile) {
      throw new NotFoundException('Developer profile not found');
    }

    if (profile.status !== 'pending') {
      throw new BadRequestException('Profile is not pending review');
    }

    profile.status = 'approved';
    await profile.save();

    // Add DEVELOPER role to the user
    const user = await this.userModel.findById(profile.userId);
    if (user) {
      user.role = addRole(user.role, Role.DEVELOPER);
      await user.save();
    }

    this.logger.log(
      `Developer application approved for profile ${profileId}`,
    );

    return {
      message: 'Developer approved successfully',
      profile: this.toProfileResponse(profile),
    };
  }

  async rejectApplication(profileId: string, reason?: string) {
    const profile = await this.developerProfileModel.findById(profileId);
    if (!profile) {
      throw new NotFoundException('Developer profile not found');
    }

    if (profile.status !== 'pending') {
      throw new BadRequestException('Profile is not pending review');
    }

    profile.status = 'suspended';
    await profile.save();

    this.logger.log(
      `Developer application rejected for profile ${profileId}: ${reason || 'No reason'}`,
    );

    return {
      message: 'Developer application rejected',
      profile: this.toProfileResponse(profile),
    };
  }

  // ---------------------------------------------------------------------------
  // Template CRUD (developer-facing)
  // ---------------------------------------------------------------------------

  async createTemplateListing(userId: string, dto: CreateTemplateListingDto) {
    const profile = await this.getApprovedProfile(userId);

    // Validate slug format
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(dto.templateSlug)) {
      throw new BadRequestException(
        'Template slug must be lowercase alphanumeric with hyphens only',
      );
    }

    const existing = await this.templateListingModel
      .findOne({ templateSlug: dto.templateSlug })
      .lean();

    if (existing) {
      throw new ConflictException(
        `Template slug "${dto.templateSlug}" is already taken`,
      );
    }

    const listing = await this.templateListingModel.create({
      templateSlug: dto.templateSlug,
      developerId: profile._id,
      name: dto.name,
      description: dto.description,
      longDescription: dto.longDescription,
      pricing: dto.pricing,
      categories: dto.categories || [],
      tags: dto.tags || [],
      githubRepo: dto.githubRepo,
      status: 'draft',
      version: '1.0.0',
      sdkVersion: '1.0.0',
      stats: { installs: 0, rating: 0, reviewCount: 0, activeSubscriptions: 0 },
    });

    // Increment templates count
    await this.developerProfileModel.updateOne(
      { _id: profile._id },
      { $inc: { templatesCount: 1 } },
    );

    this.logger.log(
      `Template listing "${dto.templateSlug}" created by developer ${profile._id}`,
    );

    return {
      message: 'Template listing created',
      listing: this.toListingResponse(listing),
    };
  }

  async getMyTemplateListings(userId: string) {
    const profile = await this.getProfileForUser(userId);

    const listings = await this.templateListingModel
      .find({ developerId: profile._id })
      .sort({ createdAt: -1 })
      .lean();

    return { listings: listings.map((l) => this.toListingResponse(l)) };
  }

  async getTemplateListing(userId: string, listingId: string) {
    const profile = await this.getProfileForUser(userId);

    const listing = await this.templateListingModel.findOne({
      _id: new Types.ObjectId(listingId),
      developerId: profile._id,
    });

    if (!listing) {
      throw new NotFoundException('Template listing not found');
    }

    return { listing: this.toListingResponse(listing) };
  }

  async updateTemplateListing(
    userId: string,
    listingId: string,
    dto: UpdateTemplateListingDto,
  ) {
    const profile = await this.getApprovedProfile(userId);

    const listing = await this.templateListingModel.findOne({
      _id: new Types.ObjectId(listingId),
      developerId: profile._id,
    });

    if (!listing) {
      throw new NotFoundException('Template listing not found');
    }

    if (dto.name !== undefined) listing.name = dto.name;
    if (dto.description !== undefined) listing.description = dto.description;
    if (dto.longDescription !== undefined)
      listing.longDescription = dto.longDescription;
    if (dto.thumbnail !== undefined) listing.thumbnail = dto.thumbnail;
    if (dto.screenshots !== undefined) listing.screenshots = dto.screenshots;
    if (dto.demoStoreUrl !== undefined) listing.demoStoreUrl = dto.demoStoreUrl;
    if (dto.version !== undefined) listing.version = dto.version;
    if (dto.pricing !== undefined) listing.pricing = dto.pricing;
    if (dto.categories !== undefined) listing.categories = dto.categories;
    if (dto.tags !== undefined) listing.tags = dto.tags;
    if (dto.githubRepo !== undefined) listing.githubRepo = dto.githubRepo;

    await listing.save();

    return {
      message: 'Template listing updated',
      listing: this.toListingResponse(listing),
    };
  }

  async deleteTemplateListing(userId: string, listingId: string) {
    const profile = await this.getApprovedProfile(userId);

    const listing = await this.templateListingModel.findOne({
      _id: new Types.ObjectId(listingId),
      developerId: profile._id,
    });

    if (!listing) {
      throw new NotFoundException('Template listing not found');
    }

    if (listing.status === 'published') {
      throw new BadRequestException(
        'Cannot delete a published template. Please unpublish first.',
      );
    }

    await this.templateListingModel.deleteOne({ _id: listing._id });

    await this.developerProfileModel.updateOne(
      { _id: profile._id },
      { $inc: { templatesCount: -1 } },
    );

    this.logger.log(`Template listing "${listing.templateSlug}" deleted`);

    return { message: 'Template listing deleted' };
  }

  async submitForReview(userId: string, listingId: string) {
    const profile = await this.getApprovedProfile(userId);

    const listing = await this.templateListingModel.findOne({
      _id: new Types.ObjectId(listingId),
      developerId: profile._id,
    });

    if (!listing) {
      throw new NotFoundException('Template listing not found');
    }

    if (listing.status !== 'draft' && listing.status !== 'rejected') {
      throw new BadRequestException(
        `Cannot submit for review from "${listing.status}" status`,
      );
    }

    // Basic validation before submission
    if (!listing.name?.en && !listing.name?.ka) {
      throw new BadRequestException('Template must have a name');
    }
    if (!listing.description?.en && !listing.description?.ka) {
      throw new BadRequestException('Template must have a description');
    }
    if (!listing.bundleUrl) {
      throw new BadRequestException(
        'Template must be built before submitting for review. Use the Build button first.',
      );
    }

    listing.status = 'pending_review';
    listing.rejectionReason = undefined;
    await listing.save();

    this.logger.log(
      `Template "${listing.templateSlug}" submitted for review`,
    );

    return {
      message: 'Template submitted for review',
      listing: this.toListingResponse(listing),
    };
  }

  // ---------------------------------------------------------------------------
  // Admin: Template review
  // ---------------------------------------------------------------------------

  async getPendingTemplateReviews() {
    const listings = await this.templateListingModel
      .find({ status: 'pending_review' })
      .populate('developerId', 'displayName userId')
      .sort({ updatedAt: 1 })
      .lean();

    return { listings: listings.map((l) => this.toListingResponse(l)) };
  }

  async approveTemplate(listingId: string) {
    const listing = await this.templateListingModel.findById(listingId);
    if (!listing) {
      throw new NotFoundException('Template listing not found');
    }

    if (listing.status !== 'pending_review') {
      throw new BadRequestException('Template is not pending review');
    }

    listing.status = 'published';
    listing.publishedAt = new Date();
    await listing.save();

    this.logger.log(`Template "${listing.templateSlug}" approved and published`);

    return {
      message: 'Template approved and published',
      listing: this.toListingResponse(listing),
    };
  }

  async rejectTemplate(listingId: string, reason?: string) {
    const listing = await this.templateListingModel.findById(listingId);
    if (!listing) {
      throw new NotFoundException('Template listing not found');
    }

    if (listing.status !== 'pending_review') {
      throw new BadRequestException('Template is not pending review');
    }

    listing.status = 'rejected';
    listing.rejectionReason = reason || 'No reason provided';
    await listing.save();

    this.logger.log(
      `Template "${listing.templateSlug}" rejected: ${reason || 'No reason'}`,
    );

    return {
      message: 'Template rejected',
      listing: this.toListingResponse(listing),
    };
  }

  // ---------------------------------------------------------------------------
  // Public: Browse published templates (for marketplace)
  // ---------------------------------------------------------------------------

  async getPublishedTemplates(query: {
    search?: string;
    category?: string;
    pricingType?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
  }) {
    const { page = 1, limit = 20, search, category, pricingType, sortBy } = query;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { status: 'published' };

    if (category) {
      filter.categories = category;
    }
    if (pricingType) {
      filter['pricing.type'] = pricingType;
    }
    if (search) {
      filter.$text = { $search: search };
    }

    let sort: Record<string, 1 | -1> = { publishedAt: -1 };
    switch (sortBy) {
      case 'popular':
        sort = { 'stats.installs': -1 };
        break;
      case 'rating':
        sort = { 'stats.rating': -1 };
        break;
      case 'price_asc':
        sort = { 'pricing.price': 1 };
        break;
      case 'price_desc':
        sort = { 'pricing.price': -1 };
        break;
      case 'newest':
      default:
        sort = { publishedAt: -1 };
        break;
    }

    const [listings, total] = await Promise.all([
      this.templateListingModel
        .find(filter)
        .populate('developerId', 'displayName avatar')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.templateListingModel.countDocuments(filter),
    ]);

    return {
      listings: listings.map((l) => this.toListingResponse(l)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPublishedTemplateBySlug(slug: string) {
    const listing = await this.templateListingModel
      .findOne({ templateSlug: slug, status: 'published' })
      .populate('developerId', 'displayName avatar bio')
      .lean();

    if (!listing) {
      throw new NotFoundException('Template not found');
    }

    return { listing: this.toListingResponse(listing) };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async getApprovedProfile(userId: string) {
    const profile = await this.developerProfileModel
      .findOne({ userId: new Types.ObjectId(userId) });

    if (!profile) {
      throw new NotFoundException(
        'Developer profile not found. Please apply first.',
      );
    }

    if (profile.status !== 'approved') {
      throw new ForbiddenException(
        'Your developer account is not yet approved',
      );
    }

    return profile;
  }

  private async getProfileForUser(userId: string) {
    const profile = await this.developerProfileModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .lean();

    if (!profile) {
      throw new NotFoundException('Developer profile not found');
    }

    return profile;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toProfileResponse(profile: any) {
    return {
      id: profile._id?.toString(),
      userId:
        typeof profile.userId === 'object' && profile.userId?.firstName
          ? profile.userId
          : profile.userId?.toString(),
      displayName: profile.displayName,
      bio: profile.bio,
      website: profile.website,
      githubUsername: profile.githubUsername,
      avatar: profile.avatar,
      status: profile.status,
      earnings: profile.earnings,
      bankDetails: profile.bankDetails,
      templatesCount: profile.templatesCount,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toListingResponse(listing: any) {
    return {
      id: listing._id?.toString(),
      templateSlug: listing.templateSlug,
      developerId:
        typeof listing.developerId === 'object' && listing.developerId?.displayName
          ? listing.developerId
          : listing.developerId?.toString(),
      name: listing.name,
      description: listing.description,
      longDescription: listing.longDescription,
      thumbnail: listing.thumbnail,
      screenshots: listing.screenshots,
      demoStoreUrl: listing.demoStoreUrl,
      version: listing.version,
      pricing: listing.pricing,
      stats: listing.stats,
      status: listing.status,
      rejectionReason: listing.rejectionReason,
      bundleUrl: listing.bundleUrl,
      githubRepo: listing.githubRepo,
      attributeSchema: listing.attributeSchema,
      categories: listing.categories,
      tags: listing.tags,
      sdkVersion: listing.sdkVersion,
      publishedAt: listing.publishedAt,
      versionHistory: listing.versionHistory,
      lastBuildAt: listing.lastBuildAt,
      lastBuildError: listing.lastBuildError,
      createdAt: listing.createdAt,
      updatedAt: listing.updatedAt,
    };
  }
}
