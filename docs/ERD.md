# Database ERD

Source of truth: `prisma/schema.prisma` (39 tables + `SiteSetting`). All primary keys are UUIDs. Every directory record carries `isDemo` and `dataSourceId`. RLS is enabled on every table.

```mermaid
erDiagram
  Country ||--o{ Region : has
  Country ||--o{ City : has
  Region  ||--o{ City : contains
  Industry ||--o{ Industry : "parent of"

  DataSource ||--o{ Company : sources
  DataSource ||--o{ Artist : sources
  DataSource ||--o{ Gallery : sources
  DataSource ||--o{ Artwork : sources
  DataSource ||--o{ AcquisitionListing : sources

  Country ||--o{ Company : located
  Region  |o--o{ Company : located
  City    |o--o{ Company : located
  Industry ||--o{ Company : classifies
  Company ||--o{ CompanyTag : tagged
  Tag ||--o{ CompanyTag : tags
  Company ||--o{ CompanyMember : "managed by"
  User ||--o{ CompanyMember : manages
  Company ||--o{ CompanyClaim : "claimed via"
  User ||--o{ CompanyClaim : submits
  Company ||--o{ CompanyVerification : "verified via"

  Company |o--o{ AcquisitionListing : "for sale as"
  AcquisitionListing ||--|| AcquisitionFinancials : "PRIVATE"
  Industry ||--o{ AcquisitionListing : classifies

  User ||--o| Profile : has
  User ||--o{ UserRole : holds
  User |o--o| Artist : "is"
  Country ||--o{ Artist : based
  Artist ||--o{ Artwork : creates
  Gallery |o--o{ Artwork : shows
  Gallery ||--o{ GalleryArtist : represents
  Artist ||--o{ GalleryArtist : "represented by"
  Gallery ||--o{ GalleryMember : "operated by"
  Artwork ||--o{ ArtworkMedia : images
  MediaAsset ||--o{ ArtworkMedia : file
  Artwork ||--o{ ProvenanceEvent : history
  Collection ||--o{ CollectionItem : contains
  Artwork ||--o{ CollectionItem : "in"

  User ||--o{ Inquiry : sends
  Inquiry }o--o| Artwork : about
  Inquiry }o--o| AcquisitionListing : about
  Inquiry }o--o| Company : about
  User ||--o{ CollaborationRequest : sends
  CollaborationRequest }o--o| Artist : to
  CollaborationRequest }o--o| Gallery : to
  CollaborationRequest }o--o| Company : "to / from"

  AdPlacement ||--o{ Campaign : "booked as"
  User ||--o{ Campaign : advertises
  Company |o--o{ Campaign : promotes
  Campaign ||--o{ Advertisement : creatives
  Advertisement ||--o{ Impression : logs
  Advertisement ||--o{ Click : logs
  Campaign ||--o{ Invoice : billed
  User ||--o{ Subscription : has
  User ||--o{ Invoice : owes

  User ||--o{ ConsentRecord : gives
  User |o--o{ AuditLog : acts
  User |o--o{ ContentReport : reports
```

## Notable constraints & indexes
| Table | Constraint / index | Why |
|---|---|---|
| Company | `slug` unique; `(countryId, industryId, verificationStatus)`; `cityId`; `(isDemo, status)`; GIN trigram on `name` | Directory filters + fuzzy search |
| Artist | `slug` unique; GIN trigram on `name`; `(countryId, collaboration)` | Search + collaboration lists |
| Region / City | unique `(countryId, slug)` | Clean URLs per country |
| CompanyMember | unique `(companyId, userId)` | One membership per person |
| UserRole | unique `(userId, role)` | No duplicate grants |
| CompanyClaim | `(status, createdAt)` | Moderation queue order |
| Campaign | `(placementId, status, startsAt, endsAt)` | Live-ad lookup + capacity checks |
| Impression / Click | `(campaignId, createdAt)`, `(sessionHash, advertisementId, createdAt)` | Reporting + dedupe window |
| PaymentEvent | `eventId` unique | Idempotent webhooks |
| AcquisitionFinancials | separate table, 1:1 | Never selected by public queries |
| MediaAsset | unique `(bucket, path)`, `isPrivate` | Claim evidence in private bucket |

## Migration practice
Additive first → backfill → constrain. No destructive migration without a written plan. RLS is re-applied by hand in the migration for any new table (see `…_site_settings_and_newsletter`).
