# Project TODO

## Database & Backend
- [x] Design and implement full database schema (leads, campaigns, sequences, engagement events, salesforce tasks, sending domains, rollout milestones, integration configs)
- [x] Implement lead CRUD API procedures (create, read, update, bulk create, bulk update)
- [x] Implement campaign CRUD API procedures (create, read, update, enroll leads)
- [x] Implement sequence step management API (create, update, delete, list)
- [x] Implement engagement tracking API (record events, list events, get stats)
- [x] Implement Salesforce task management API (create, update, list)
- [x] Implement sending domain management API (create, update, list)
- [x] Implement rollout milestone tracking API (create, update, list)
- [x] Implement integration config API (upsert, list)
- [x] Implement lead segmentation via manual and bulk update (existing_customer, new_local, new_national)
- [x] Implement Scott's Directories mock search (frontend simulation with Alberta data)
- [x] Implement LinkedIn mock search (frontend simulation with Alberta data)

## Frontend - Layout & Navigation
- [x] Dashboard layout with collapsible sidebar navigation
- [x] Global theming - elegant refined light design with Inter font
- [x] Responsive design across all pages

## Frontend - Lead Sourcing Dashboard
- [x] Scott's Directories search interface with filters (Alberta, municipalities, GCs, home builders)
- [x] LinkedIn search interface for contact identification
- [x] Import workflow to pull contacts into the system
- [x] Audience segment selection (municipalities, general contractors, home builders)
- [x] Select all / individual selection and bulk import

## Frontend - Lead Management Table
- [x] Compact database-like table view with filtering
- [x] Status updates (new, contacted, qualified, warm, archived)
- [x] Bulk actions: mark as contacted, archive, set segment
- [x] Search capabilities
- [x] Segment and status badge display with color coding

## Frontend - Contact Verification & Segmentation
- [x] Classification into three buckets: Existing Customers, New Local, New National
- [x] Segment assignment via individual and bulk actions
- [x] Clear visual distinction between segments (color-coded badges)

## Frontend - Campaign Builder
- [x] Create outreach campaigns with name, track, description, sending domain
- [x] Three distinct tracks: "Existing Customers", "New Local", "New National"
- [x] Per-track messaging templates with multi-step sequences
- [x] Campaign activation/pause controls
- [x] Template editor with personalization variables (firstName, lastName, company, jobTitle)
- [x] Sequence step builder with delay configuration

## Frontend - Engagement Tracking Dashboard
- [x] Email open rates, click rates, reply rates, bounce rates display
- [x] Engagement funnel visualization (sent → opened → clicked → replied)
- [x] Recent activity feed with event type icons
- [x] KPI cards for all engagement metrics

## Frontend - Salesforce Integration
- [x] Configuration panel for Salesforce API credentials
- [x] Auto-sync settings (warm leads, hot leads, call tasks)
- [x] Call Task queue display with status badges
- [x] Connection status indicator

## Frontend - Domain Reputation Protection
- [x] Isolated sending domain configuration (separate from fenceline.ca)
- [x] Domain health monitoring (SPF/DKIM/DMARC verification status)
- [x] Warm-up progress tracking with day counter
- [x] Primary domain protection notice (fenceline.ca never used for outreach)
- [x] Validation preventing fenceline.ca from being added as sending domain

## Frontend - Pilot & Rollout Tracking Dashboard
- [x] Milestone progress: POC → Staged Beta → Full Alberta Rollout
- [x] Phase progress cards with completion percentage
- [x] Phase transition controls (Start / Complete buttons)
- [x] Milestone creation with phase, title, description, target date
- [x] Per-milestone engagement stats display (leads processed, emails sent, open rate, warm leads)

## Web Scraping - Internet Lead Sourcing
- [x] Add "Web Search" tab to Lead Sourcing page
- [x] Customizable search criteria filters (people needing fencing, fence rentals, construction fencing, temporary fencing, etc.)
- [x] Backend API endpoint using LLM to parse web search results into structured contacts
- [x] Region and industry filters for web scraping
- [x] Import scraped contacts into lead database with source tracking
- [x] Predefined search templates (fence installation, temp fence rentals, construction projects, municipal projects)

## LinkedIn Real Scraping
- [x] Build real LinkedIn scraping backend using Google site:linkedin.com search
- [x] Extract structured contact data from LinkedIn profile search results via LLM
- [x] Replace mock LinkedIn tab with real scraping functionality
- [x] Support job title, company, and region filters for LinkedIn search

## Expanded Service Lines & Tender Search
- [x] Update search criteria to include all Fenceline services (temp fencing, portable toilets, waste bins, walkways, handwash stations, full site services)
- [x] Add tender/bid search feature for active Alberta construction projects needing site services
- [x] Keep LinkedIn tab as search tool, added "Find Role" and "Search Name" options
- [x] Focus results on email + specific source page URL (projects page, tender page, procurement page)
- [x] Source links now point to specific pages where service need was found (not homepages)

## Refocus on Fencing Only
- [x] Update Find page filters to focus on fencing needs (remove toilets, bins, walkways, handwash)
- [x] Update backend LLM prompts to search for companies needing fencing specifically
- [x] Update email templates to focus on fencing messaging
- [x] Keep other services as future expansion option (not in current search)

## Next Steps Features
- [x] Add Known Patterns database (save/edit company email patterns on Find page)
- [x] Add CSV Import tab to Find page (drag & drop Sales Navigator exports)
- [x] Add Scott's Directories API connector slot in Settings
- [x] Wire up Campaigns page with working New Campaign form and campaign management
- [x] Wire up Tracking page with real database-driven engagement stats
- [x] Wire up Settings page with working connector API key forms and domain management
- [x] Add working sender profile creation on Templates page

## Demo Gap Fixes
- [x] Tracking page: Add Hot Leads table with Follow Up buttons, intent badges, connected to engagement events (opens, clicks, replies)
- [x] Settings page: Organize into proper sections (Domain Reputation, Contact Finding, Lead Sourcing, Email Verification, Outreach Sending, Tender Monitoring, CRM)
- [x] Settings page: Add Gmail API, separate MERX/APC cards, ZeroBounce in own section
- [x] Find page: Add separate Tenders & RFPs tab
- [x] Campaigns page: Add per-campaign metrics (sent/opened/replied/bounced/pace)

## POC Priority Features
- [x] Duplicate detection on lead import (check by email or name+company before creating)
- [x] CASL-compliant unsubscribe handling (opt-out link in templates, unsubscribe list, auto-respect)
- [x] Email preview before sending (show personalized email for each contact)
- [x] Activity log (timeline of all system actions — imports, sends, hot leads, campaign events)

## Email Sending Integration
- [x] Gmail API / SMTP email sending backend
- [x] Open tracking pixel endpoint
- [x] Click tracking link wrapper endpoint
- [x] Human-pace sending queue with randomized 3-8 minute delays
- [x] Reply detection and auto-pause on reply
- [x] Wire Campaigns page "Send" button to actually deliver emails (frontend)

## Next Steps - Phase 2
- [x] Enroll Leads button on each campaign (select leads from Segment to assign to campaign)
- [x] Sending schedule (Mon-Fri 8am-5pm MST only, no weekends/evenings)
- [x] Gmail App Password setup instructions in Settings page
