workspace "11FTC Ticketing Management System" "C4 model for the IT ticketing, analytics, and Google Sheets synchronization system. Three ticket statuses: Open, Ongoing, Closed. Work is done first and recorded after." {

    !identifiers hierarchical

    model {
        employee = person "Employee (Requester)" "Staff member who reports an IT concern by walk-in, call, or chat. Does not log into the system."
        itStaff = person "IT Staff" "Solves concerns directly, then records them - usually as already Closed. Marks tickets Ongoing when work cannot be finished. Dashboard access pending OPEN-2. (SRS section 3.2)"
        itAdmin = person "IT Administrator" "Manages users, employees, lookup values, and sync configuration. Encodes and closes tickets. Reviews dashboards and audit history. (SRS section 3.1)"

        googleSheets = softwareSystem "Google Sheets - IT Tracker" "The IT team's existing spreadsheet, displayed newest-first. Sync appends to a hidden _raw tab; the visible tab is a QUERY view. A downstream mirror, not the system of record." {
            tags "External"
        }

        googleCloud = softwareSystem "Google Cloud Platform" "Hosts the Sheets API and issues service-account credentials created in the Google Cloud Console." {
            tags "External"
        }

        identity = softwareSystem "Identity Provider (Google Workspace SSO)" "Authenticates IT staff via OAuth 2.0 / OIDC using company accounts." {
            tags "External"
        }

        ticketing = softwareSystem "11FTC Ticketing Management System" "Records IT tickets, generates per-date ticket numbers, produces daily/weekly/monthly analytics, and mirrors data to Google Sheets." {

            spa = container "Web Application" "Ticket encoding forms, ticket queue, employee management, and the analytics dashboard." "Next.js / React / Tailwind CSS" {
                tags "Web Browser"
            }

            api = container "Application API" "Business logic: ticket lifecycle, ticket number generation, employee resolution, audit logging, analytics aggregation, and outbox writes." "REST API (Laravel or Node/NestJS)"

            worker = container "Sync Worker" "Drains the outbox and appends batched rows to the sheet's _raw tab. Locates existing rows by ticket_no rather than by position, because the visible sheet is ordered newest-first. Handles retries, backoff, and rate limiting." "Queue worker (Horizon / BullMQ)"

            db = container "Ticketing Database" "System of record. Tickets, employees, users, lookup tables, ticket sequences, audit log, and the sync outbox." "PostgreSQL 16" {
                tags "Database"
            }

            queue = container "Job Queue and Cache" "Holds sync jobs and caches dashboard aggregates." "Redis" {
                tags "Database"
            }

            # --- Components of the Application API ---
            api -> db "Reads from and writes to" "SQL/TCP"

            ticketController = component "Ticket Controller" "HTTP endpoints for creating, updating, assigning, and closing tickets." "Controller"
            employeeController = component "Employee Controller" "Endpoints for searching and creating employees inline from the ticket form." "Controller"
            analyticsController = component "Analytics Controller" "Endpoints serving daily, weekly, and monthly dashboard metrics." "Controller"

            ticketService = component "Ticket Service" "Orchestrates the ticket lifecycle inside a single database transaction." "Service"
            numberGenerator = component "Ticket Number Generator" "Allocates the next sequence using a locked TicketSequence row keyed by scope_key (date- or year-scoped, per config). Supports backdated encoding." "Service"
            employeeResolver = component "Employee Resolver" "Finds an existing employee by normalized name or creates a new one, preventing near-duplicates." "Service"
            auditLogger = component "Audit Logger" "Writes field-level before/after entries for every mutation." "Service"
            analyticsService = component "Analytics Service" "Runs grouped aggregate queries for the dashboard, including first-time fix rate and Ongoing ageing, and caches results." "Service"
            outboxWriter = component "Sync Outbox Writer" "Enqueues an outbox row in the same transaction as the ticket write." "Service"
            authGuard = component "Auth and RBAC Guard" "Validates the session and enforces the permission matrix in SRS section 3.3." "Middleware"
            repositories = component "Repositories" "Data access for Ticket, Employee, User, TicketSequence, AuditLog, and Outbox." "Repository / ORM"

            # component wiring
            ticketController -> authGuard "Passes through"
            employeeController -> authGuard "Passes through"
            analyticsController -> authGuard "Passes through"
            ticketController -> ticketService "Delegates to"
            employeeController -> employeeResolver "Delegates to"
            analyticsController -> analyticsService "Delegates to"
            ticketService -> numberGenerator "Requests next ticket number from"
            ticketService -> employeeResolver "Resolves requester via"
            ticketService -> auditLogger "Records changes via"
            ticketService -> outboxWriter "Queues sync event via"
            numberGenerator -> repositories "Locks and updates sequence via"
            employeeResolver -> repositories "Reads and writes via"
            auditLogger -> repositories "Writes via"
            outboxWriter -> repositories "Writes via"
            analyticsService -> repositories "Queries via"
            repositories -> db "Reads from and writes to" "SQL/TCP"
            authGuard -> identity "Verifies tokens against" "OIDC/HTTPS"
            outboxWriter -> queue "Dispatches sync job to" "Redis protocol"
        }

        # --- System-level relationships ---
        employee -> itStaff "Reports an IT concern to"
        itStaff -> ticketing "Encodes and updates tickets in"
        itAdmin -> ticketing "Assigns work and reviews dashboards in"
        ticketing -> googleSheets "Mirrors ticket rows to" "Sheets API v4 / HTTPS"
        ticketing -> googleCloud "Authenticates as a service account with" "OAuth 2.0 JWT / HTTPS"
        ticketing -> identity "Authenticates staff against" "OIDC / HTTPS"
        itStaff -> googleSheets "Reads the newest-first QUERY view in"

        # --- Container-level relationships ---
        itStaff -> ticketing.spa "Uses" "HTTPS"
        itAdmin -> ticketing.spa "Uses" "HTTPS"
        ticketing.spa -> ticketing.api "Calls" "JSON/HTTPS"
        ticketing.api -> ticketing.queue "Publishes sync jobs to" "Redis protocol"
        ticketing.api -> identity "Validates sessions against" "OIDC/HTTPS"
        ticketing.worker -> ticketing.queue "Consumes jobs from" "Redis protocol"
        ticketing.worker -> ticketing.db "Reads outbox and marks rows synced" "SQL/TCP"
        ticketing.worker -> googleSheets "Batch-appends to the _raw tab of" "Sheets API v4 / HTTPS"
        ticketing.worker -> googleCloud "Obtains access tokens from" "OAuth 2.0 JWT / HTTPS"

        production = deploymentEnvironment "Production" {
            deploymentNode "Vercel" "Edge-hosted frontend" "Vercel" {
                containerInstance ticketing.spa
            }
            deploymentNode "Cloud Provider VPC" "Private network" "AWS / GCP / Railway" {
                deploymentNode "App Server" "Autoscaled container" "Docker" {
                    containerInstance ticketing.api
                }
                deploymentNode "Worker Node" "Single long-running process" "Docker" {
                    containerInstance ticketing.worker
                }
                deploymentNode "Managed PostgreSQL" "Daily PITR backups" "PostgreSQL 16" {
                    containerInstance ticketing.db
                }
                deploymentNode "Managed Redis" "Job queue and cache" "Redis 7" {
                    containerInstance ticketing.queue
                }
            }
            deploymentNode "Google Cloud" "External" "GCP" {
                softwareSystemInstance googleSheets
            }
        }
    }

    views {
        systemContext ticketing "SystemContext" "Who uses the system and what it talks to." {
            include *
            autolayout lr
        }

        container ticketing "Containers" "Runtime building blocks." {
            include *
            autolayout lr
        }

        component ticketing.api "ApiComponents" "Inside the Application API." {
            include *
            autolayout tb
        }

        deployment ticketing production "ProductionDeployment" "Production topology." {
            include *
            autolayout lr
        }

        styles {
            element "Element" {
                shape roundedbox
                background #1f6feb
                color #ffffff
            }
            element "Person" {
                shape person
                background #0b3d91
                color #ffffff
            }
            element "Software System" {
                background #1f6feb
                color #ffffff
            }
            element "Container" {
                background #4c8dfa
                color #ffffff
            }
            element "Component" {
                background #7aa9f7
                color #000000
            }
            element "Database" {
                shape cylinder
            }
            element "Web Browser" {
                shape webbrowser
            }
            element "External" {
                background #8b949e
                color #ffffff
            }
        }

        theme default
    }
}
