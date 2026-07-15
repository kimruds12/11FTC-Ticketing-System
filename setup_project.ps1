# 11FTC Ticketing System Workspace Scaffolding Script
# Run this script using PowerShell: ./setup_project.ps1

# Dynamically add standard Node.js installation paths to environment if not already present
$StandardNodePaths = @(
    "C:\Program Files\nodejs",
    "C:\Program Files (x86)\nodejs",
    "$env:APPDATA\npm"
)
foreach ($Path in $StandardNodePaths) {
    if ((Test-Path $Path) -and ($env:Path -notlike "*$Path*")) {
        $env:Path = "$Path;$env:Path"
    }
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Error: NodeJS is not installed or not found in PATH. Please install NodeJS and try again."
    exit 1
}

Write-Host "🚀 Initializing Next.js 11FTC Ticketing System Workspace..." -ForegroundColor Green

# 1. Initialize Next.js app in current directory if no package.json is present
if (-not (Test-Path package.json)) {
    Write-Host "No package.json found. Creating new Next.js project..." -ForegroundColor Yellow
    # Running npx create-next-app with standard defaults
    npx -y create-next-app@latest ./ --typescript --eslint --tailwind --src-dir --app --import-alias "@/*" --use-npm
} else {
    Write-Host "package.json detected. Skipping Next.js initial bootstrap." -ForegroundColor Cyan
}

# 2. Install backend and database dependencies
Write-Host "Installing project dependencies..." -ForegroundColor Cyan
npm install @prisma/client googleapis google-auth-library recharts lucide-react bcryptjs jsonwebtoken date-fns
npm install --save-dev prisma typescript @types/node @types/react @types/bcryptjs @types/jsonwebtoken

# 3. Create folder layouts
Write-Host "Creating app directory structure..." -ForegroundColor Cyan
$Directories = @(
    "prisma",
    "src/app/dashboard",
    "src/app/tickets/new",
    "src/app/employees",
    "src/app/api/auth",
    "src/app/api/tickets",
    "src/app/api/employees",
    "src/app/api/sync",
    "src/components/ui",
    "src/lib",
    "src/styles"
)

foreach ($Dir in $Directories) {
    if (-not (Test-Path $Dir)) {
        New-Item -ItemType Directory -Path $Dir -Force | Out-Null
        Write-Host "  Created directory: $Dir" -ForegroundColor Gray
    }
}

# 4. Generate environment variable templates
Write-Host "Configuring .env environment files..." -ForegroundColor Cyan
$EnvContent = @"
# Database Connection String (PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ticketing_db?schema=public"

# JSON Web Token Private Secret
JWT_SECRET="generate_a_long_random_secret_string_here_11ftc"

# Google Sheets Configuration
GOOGLE_SPREADSHEET_ID="your_google_sheet_id_here"
GOOGLE_SHEET_NAME="Sheet1"
GOOGLE_SERVICE_ACCOUNT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
"@

Set-Content -Path .env.example -Value $EnvContent
if (-not (Test-Path .env)) {
    Set-Content -Path .env -Value $EnvContent
    Write-Host "  Created .env file" -ForegroundColor Gray
} else {
    Write-Host "  .env already exists. Skipping overwrite to protect local configuration." -ForegroundColor Yellow
}

# 5. Populate db.ts helper file
$DbFile = "src/lib/db.ts"
if (-not (Test-Path $DbFile)) {
    $PrismaHelper = @"
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
"@
    Set-Content -Path $DbFile -Value $PrismaHelper
    Write-Host "  Created database client wrapper: $DbFile" -ForegroundColor Gray
}

Write-Host "`n✅ Workspace scaffolding complete!" -ForegroundColor Green
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Configure your database settings inside .env"
Write-Host "2. Write your schema under prisma/schema.prisma"
Write-Host "3. Run 'npx prisma db push' to apply the schema mapping"
Write-Host "4. Execute 'npm run dev' to start the development web server"
