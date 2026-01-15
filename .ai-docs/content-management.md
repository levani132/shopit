# Content Management System

## Overview

The platform has a content management system for static pages that can be managed by admins.

## Content Types

### 1. FAQ (Frequently Asked Questions)

**Schema**: `Faq` in `libs/api/database/src/lib/schemas/content.schema.ts`

Fields:
- `questionKa`, `questionEn`: Question in Georgian and English
- `answerKa`, `answerEn`: Answer in Georgian and English  
- `category`: `general`, `sellers`, `buyers`, `couriers`, `payments`
- `order`: Sort order (lower = first)
- `isActive`: Whether to show on public FAQ page

**Endpoints**:
- `GET /api/v1/content/faq` - Public, returns active FAQs
- `GET /api/v1/content/admin/faq` - Admin, returns all FAQs
- `POST /api/v1/content/admin/faq` - Create FAQ
- `PUT /api/v1/content/admin/faq/:id` - Update FAQ
- `DELETE /api/v1/content/admin/faq/:id` - Delete FAQ
- `POST /api/v1/content/admin/faq/seed` - Seed initial FAQs

### 2. About Us

**Schema**: `AboutContent`

Fields:
- `missionKa`, `missionEn`: Mission statement
- `storyKa`, `storyEn`: Company story
- `teamMembers`: Array of team members (optional)

**Endpoints**:
- `GET /api/v1/content/about` - Public
- `PUT /api/v1/content/admin/about` - Admin update

### 3. Contact Information

**Schema**: `ContactContent`

Fields:
- `email`: Contact email
- `phone`: Phone number
- `address`: Physical address
- `workingHours`: Business hours
- `socialLinks`: { facebook, instagram, linkedin }

**Endpoints**:
- `GET /api/v1/content/contact` - Public
- `PUT /api/v1/content/admin/contact` - Admin update
- `POST /api/v1/content/contact/submit` - Submit contact form

### 4. Contact Form Submissions

**Schema**: `ContactSubmission`

Fields:
- `name`, `email`, `subject`, `message`
- `status`: `pending`, `read`, `replied`, `archived`
- `adminNotes`: Admin notes

**Endpoints**:
- `GET /api/v1/content/admin/contact/submissions` - Get all submissions
- `PUT /api/v1/content/admin/contact/submissions/:id` - Update status

### 5. Terms of Service

**Schema**: `TermsContent`

Fields:
- `contentKa`, `contentEn`: Full terms content
- `lastUpdated`: Auto-updated on save

Supports placeholders that are replaced on frontend:
- `{commissionPercent}` - Site commission (from settings)
- `{courierPercent}` - Courier earnings percentage
- `{minWithdrawal}` - Minimum withdrawal amount

**Endpoints**:
- `GET /api/v1/content/terms` - Public
- `PUT /api/v1/content/admin/terms` - Admin update

### 6. Privacy Policy

**Schema**: `PrivacyContent`

Same structure as Terms.

**Endpoints**:
- `GET /api/v1/content/privacy` - Public
- `PUT /api/v1/content/admin/privacy` - Admin update

## Frontend Pages

| Page | Path | Description |
|------|------|-------------|
| Pricing | `/[locale]/pricing` | Free platform + commission info |
| FAQ | `/[locale]/faq` | Filterable FAQ list |
| About | `/[locale]/about` | Mission, story, values |
| Contact | `/[locale]/contact` | Contact form + info |
| Terms | `/[locale]/terms` | Terms of Service |
| Privacy | `/[locale]/privacy` | Privacy Policy |

## Admin Dashboard

**Path**: `/[locale]/dashboard/admin/content`

Tabs for managing:
- FAQ (CRUD + seed)
- About Us content
- Contact info + social links
- Terms of Service
- Privacy Policy

## Public Settings Endpoint

**Path**: `GET /api/v1/admin/settings/public`

Returns non-sensitive settings for pricing page:
- `siteCommissionRate`
- `courierEarningsPercentage`
- `minimumWithdrawalAmount`
- `platformName`
- `supportEmail`

This endpoint does NOT require authentication.

## Registration Terms Agreement

Both buyer and seller registration pages require users to agree to Terms of Service and Privacy Policy before registering. The checkbox is required - registration buttons are disabled until checked.

Files:
- `apps/web/src/components/register/steps/Step3Auth.tsx` (seller)
- `apps/web/src/app/[locale]/register/buyer/page.tsx` (buyer)

## Footer Links

The footer (`apps/web/src/components/layout/Footer.tsx`) links to:
- Features → `/#how-it-works` (anchor)
- Pricing → `/pricing`
- FAQ → `/faq`
- About Us → `/about`
- Contact → `/contact`
- Terms of Service → `/terms`
- Privacy Policy → `/privacy`

Blog link has been removed.

