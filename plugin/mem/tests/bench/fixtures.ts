/**
 * wantan-mem Benchmark Fixtures — gold dataset for Path A suite.
 *
 * All observations are verified against the current CATEGORY_RULES and
 * NOISE_PATTERNS in facts.ts before inclusion. Expected category/importance
 * is noted for each, so failures are easy to diagnose.
 */

export interface GoldObs {
  type: string;
  agent: string;
  content: string;
  // expected extraction result
  expectedCategory: string;
  expectedImportance: number;
  isNoise?: boolean;
}

export interface GoldQuery {
  query: string;
  /** SubEM: ALL these terms must appear in at least one top-5 fact */
  goldTerms: string[];
  description: string;
}

// ---------------------------------------------------------------------------
// Suite A & E: 16 signal observations + 5 noise
// ---------------------------------------------------------------------------

/** Signal observations — each MUST produce exactly 1 fact. */
export const SIGNAL_OBSERVATIONS: GoldObs[] = [
  // Decisions (importance 10)
  {
    type: 'decision', agent: 'wantan',
    content: 'Decided to use PostgreSQL for the primary database instead of MySQL',
    expectedCategory: 'decision', expectedImportance: 10,
  },
  {
    type: 'decision', agent: 'wantan',
    content: 'Decided to use JWT tokens for API authentication over session cookies',
    expectedCategory: 'decision', expectedImportance: 10,
  },
  {
    type: 'decision', agent: 'wantan',
    content: 'Decided to deploy to production on AWS ECS for cost savings',
    expectedCategory: 'decision', expectedImportance: 10,
  },
  {
    type: 'decision', agent: 'wantan',
    content: 'Decided to use Prisma ORM as the database access layer',
    expectedCategory: 'decision', expectedImportance: 10,
  },
  {
    type: 'decision', agent: 'wantan',
    content: 'Decided to use React with TypeScript for frontend development',
    expectedCategory: 'decision', expectedImportance: 10,
  },

  // Routing constraints (importance 9)
  {
    type: 'decision', agent: 'wantan',
    content: 'Orchestrate not execute: delegate to Conan for all feature implementation',
    expectedCategory: 'preference', expectedImportance: 9,
  },
  {
    type: 'decision', agent: 'wantan',
    content: 'Route to Lelouch first for spec creation on all feature requests',
    expectedCategory: 'preference', expectedImportance: 9,
  },

  // Errors (importance 8)
  {
    type: 'error', agent: 'killua',
    content: 'Fixed bug: null pointer exception in user authentication flow at login',
    expectedCategory: 'error', expectedImportance: 8,
  },
  {
    type: 'error', agent: 'conan',
    content: 'Error: crash in payment processing module when handling refund requests',
    expectedCategory: 'error', expectedImportance: 8,
  },

  // Security (importance 8)
  {
    type: 'event', agent: 'itachi',
    content: 'CVE-2026-1234 vulnerability detected in express package version 4.18.0',
    expectedCategory: 'security', expectedImportance: 8,
  },

  // Architecture (importance 6)
  {
    type: 'tool_use', agent: 'conan',
    content: 'New endpoint added: POST /api/v1/users with email verification flow',
    expectedCategory: 'architecture', expectedImportance: 6,
  },
  {
    type: 'tool_use', agent: 'conan',
    content: 'New service added: payment processor with Stripe integration',
    expectedCategory: 'architecture', expectedImportance: 6,
  },
  {
    type: 'tool_use', agent: 'conan',
    content: 'Refactored authentication middleware to use stateless JWT verification',
    expectedCategory: 'architecture', expectedImportance: 6,
  },
  {
    type: 'tool_use', agent: 'shikamaru',
    content: 'Deployed to production: user management service version 2.1.0',
    expectedCategory: 'architecture', expectedImportance: 6,
  },

  // Research (importance 4)
  {
    type: 'tool_use', agent: 'wiz',
    content: 'Researched caching strategies comparison: Redis vs Memcached for session storage',
    expectedCategory: 'learned', expectedImportance: 4,
  },
  {
    type: 'tool_use', agent: 'wiz',
    content: 'WebSearch: Next.js app router performance with React 18 server components',
    expectedCategory: 'learned', expectedImportance: 4,
  },
];

/** Noise observations — MUST produce 0 facts (filtered by NOISE_PATTERNS). */
export const NOISE_OBSERVATIONS: GoldObs[] = [
  { type: 'tool_use', agent: 'wantan', content: 'Bash: ls -la src/', expectedCategory: '', expectedImportance: 0, isNoise: true },
  { type: 'tool_use', agent: 'wantan', content: 'Bash: git status', expectedCategory: '', expectedImportance: 0, isNoise: true },
  { type: 'tool_use', agent: 'wantan', content: 'Read: src/auth/login.ts', expectedCategory: '', expectedImportance: 0, isNoise: true },
  { type: 'tool_use', agent: 'wantan', content: 'Grep: TODO', expectedCategory: '', expectedImportance: 0, isNoise: true },
  { type: 'tool_use', agent: 'wantan', content: 'Glob: **/*.ts', expectedCategory: '', expectedImportance: 0, isNoise: true },
];

export const ALL_OBSERVATIONS = [...SIGNAL_OBSERVATIONS, ...NOISE_OBSERVATIONS];

// ---------------------------------------------------------------------------
// Suite A: Retrieval queries with SubEM gold terms
// ---------------------------------------------------------------------------

export const GOLD_QUERIES: GoldQuery[] = [
  { query: 'PostgreSQL primary database',     goldTerms: ['postgresql', 'database'],    description: 'PostgreSQL decision' },
  { query: 'JWT authentication session',      goldTerms: ['jwt', 'authentication'],     description: 'Auth decision' },
  { query: 'AWS ECS production deploy',       goldTerms: ['aws', 'ecs'],                description: 'Deployment decision' },
  { query: 'payment refund crash error',      goldTerms: ['payment', 'refund'],         description: 'Payment crash' },
  { query: 'CVE express vulnerability',       goldTerms: ['cve', 'express'],            description: 'Security CVE' },
  { query: 'delegate Conan feature work',     goldTerms: ['conan', 'delegate'],         description: 'Routing constraint' },
  { query: 'Prisma ORM database access',      goldTerms: ['prisma', 'database'],        description: 'Prisma decision' },
  { query: 'Lelouch spec route feature',      goldTerms: ['lelouch', 'spec'],           description: 'Spec-first routing' },
];

// L1 index should contain these term sets (each set must ALL appear in index summary)
export const L1_GOLD_TERMS: string[][] = [
  ['postgresql'],
  ['jwt', 'authentication'],
  ['cve'],
  ['conan', 'delegate'],
  ['aws', 'ecs'],
];

// ---------------------------------------------------------------------------
// Suite C: Contradiction pairs (2 decisions per pair, newer supersedes older)
// ---------------------------------------------------------------------------

export interface ContradictionPair {
  olderContent: string;   // first inserted — should be superseded
  newerContent: string;   // second inserted — supersedes the older
  sharedTags: string[];   // ≥2 tags must overlap for supersession to trigger
  description: string;
}

export const CONTRADICTION_PAIRS: ContradictionPair[] = [
  {
    // Both yield tags ['auth', 'api']
    olderContent: 'Decided to use JWT tokens for API authentication over session cookies',
    newerContent: 'Decided to switch to session-based authentication for the API to improve security',
    sharedTags: ['auth', 'api'],
    description: 'JWT → session auth (auth + api tags)',
  },
  {
    // Both yield tags ['database', 'api']
    olderContent: 'Decided to use PostgreSQL database with REST API endpoints for all data access',
    newerContent: 'Decided to use MySQL database with GraphQL API for better query flexibility',
    sharedTags: ['database', 'api'],
    description: 'PostgreSQL/REST → MySQL/GraphQL (database + api tags)',
  },
];

// ---------------------------------------------------------------------------
// Suite D: Routing constraint observations (importance 9, must persist)
// ---------------------------------------------------------------------------

export const ROUTING_OBSERVATIONS: GoldObs[] = [
  {
    type: 'decision', agent: 'wantan',
    content: 'Orchestrate not execute: delegate to Conan for all feature implementation work',
    expectedCategory: 'preference', expectedImportance: 9,
  },
  {
    type: 'decision', agent: 'wantan',
    content: 'Route to Lelouch first for spec creation on all feature and build requests',
    expectedCategory: 'preference', expectedImportance: 9,
  },
  {
    type: 'decision', agent: 'wantan',
    content: 'Always delegate to Rohan before implementation for all UI design work',
    expectedCategory: 'preference', expectedImportance: 9,
  },
  {
    type: 'decision', agent: 'wantan',
    content: 'Route to Killua for all testing and quality assurance work before merge',
    expectedCategory: 'preference', expectedImportance: 9,
  },
  {
    type: 'decision', agent: 'wantan',
    content: 'Security scanning must delegate to Itachi before every production deployment',
    expectedCategory: 'preference', expectedImportance: 9,
  },
];

/** Low-importance filler observations to populate the DB for Suite D */
export const FILLER_OBSERVATIONS: GoldObs[] = [
  { type: 'tool_use', agent: 'wiz',    content: 'Researched component library options for the frontend build',       expectedCategory: 'learned', expectedImportance: 4 },
  { type: 'tool_use', agent: 'wiz',    content: 'Researched different CI pipeline patterns for the project setup',    expectedCategory: 'learned', expectedImportance: 4 },
  { type: 'tool_use', agent: 'wiz',    content: 'Researched database indexing strategies for performance tuning',      expectedCategory: 'learned', expectedImportance: 4 },
  { type: 'tool_use', agent: 'wiz',    content: 'WebSearch: React query vs SWR for data fetching comparison',         expectedCategory: 'learned', expectedImportance: 4 },
  { type: 'tool_use', agent: 'wiz',    content: 'WebSearch: TypeScript strict mode best practices for 2026',          expectedCategory: 'learned', expectedImportance: 4 },
  { type: 'tool_use', agent: 'wiz',    content: 'Researched error handling patterns in Node.js async applications',   expectedCategory: 'learned', expectedImportance: 4 },
  { type: 'tool_use', agent: 'wiz',    content: 'Researched logging best practices for distributed Node.js services', expectedCategory: 'learned', expectedImportance: 4 },
  { type: 'tool_use', agent: 'wiz',    content: 'WebSearch: SQLite vs PostgreSQL for local development environments',  expectedCategory: 'learned', expectedImportance: 4 },
  { type: 'tool_use', agent: 'wiz',    content: 'Researched mobile app state management with Redux and Zustand',      expectedCategory: 'learned', expectedImportance: 4 },
  { type: 'insight', agent: 'wantan',  content: 'Sprint planning review completed with team on module priorities',    expectedCategory: 'learned', expectedImportance: 3 },
];
