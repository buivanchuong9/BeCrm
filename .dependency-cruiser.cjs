/**
 * Architecture guardrails (Phase 1.5 of docs/backend-refactor-plan.md).
 *
 * These rules encode the target dependency direction (Presentation -> Application
 * -> Domain, Infrastructure implements contracts) without assuming every module
 * already has presentation/application/domain/infrastructure subfolders — most
 * still don't (see plan §4, Tier B modules stay flat on purpose). Rules that
 * target folders which don't exist yet (domain/, application/) are intentionally
 * inert today and activate automatically as Tier A modules gain that structure
 * in later phases, so this config does not need to be rewritten each phase.
 *
 * Known pre-existing violations are listed as explicit `pathNot` exceptions with
 * a comment and a pointer to the phase that owns fixing them - NOT as a relaxed
 * severity, so the rule stays enforced for every other file, including new code.
 */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      comment: 'Circular dependencies make module boundaries meaningless and break DI initialization order.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-presentation-imports-repository',
      comment:
        'Controllers must call application services, not repositories, directly. ' +
        'Known debt: identity/{auth,me,users}.controller.ts inject UsersRepository - ' +
        'tracked for Phase 3 (docs/backend-refactor-plan.md §2 item 2), excluded here ' +
        'so the rule stays enforced for every other controller in the meantime.',
      severity: 'error',
      from: {
        path: '\\.controller\\.ts$',
        pathNot: '^src/modules/identity/(auth|me|users)\\.controller\\.ts$',
      },
      to: { path: '\\.repository\\.ts$' },
    },
    {
      name: 'no-domain-imports-infrastructure',
      comment:
        'Domain code (entities, value objects, policies, domain services) must stay framework- ' +
        'and ORM-independent. Inert today (no module has a domain/ folder yet); activates as ' +
        'Tier A modules are split (plan §4/§14 Phase 5).',
      severity: 'error',
      from: { path: '/domain/' },
      to: { path: '(/infrastructure/|\\.repository\\.ts$|@prisma/client|@prisma-client|@nestjs/(common|core|platform-express)|^express$)' },
    },
    {
      name: 'no-application-imports-presentation',
      comment:
        'Application use cases/services must not depend on HTTP controllers - that is the actual ' +
        'inversion this rule guards against (business logic depending on how it is invoked over ' +
        'HTTP). It deliberately does NOT forbid importing presentation/responses/*.dto.ts: response ' +
        'DTOs are plain data-shape declarations (class + @ApiProperty, no framework request/response ' +
        'object, no HTTP verbs), and application-layer mappers constructing a typed return value is ' +
        'the established pattern in this codebase (e.g. patients/patient-response.mapper.ts -> ' +
        'PatientResponseDto) - narrowing to /presentation/controllers/ found and fixed a false ' +
        'positive from notifications/application/mappers/notification.mapper.ts importing its own ' +
        "module's response DTO during the notifications extraction.",
      severity: 'error',
      from: { path: '(/application/|\\.service\\.ts$)' },
      to: { path: '(/presentation/controllers/|\\.controller\\.ts$)' },
    },
    {
      name: 'no-cross-module-private-import',
      comment:
        'A module may only depend on another module\'s public surface - its module.ts- exported ' +
        'providers, its dto/ contracts, or its root-level files (already the consistent pattern ' +
        'across every existing cross-module import in this codebase, verified against each target ' +
        'module\'s `exports:` array). It may not reach into another module\'s internal presentation/, ' +
        'domain/, application/use-cases/ or policies/ folders. ' +
        'pathExcludes below are for the narrow set of application/use-cases/ files a module ' +
        'deliberately exports as its cross-module public API (verified against the owning module\'s ' +
        'own `exports:` array in its *.module.ts) - the same category of published surface as a Tier ' +
        'B module\'s exported *.repository.ts, not a backdoor into unexported internals. First case: ' +
        'notifications/application/use-cases/publish-notifications.use-case.ts, exported by ' +
        'NotificationsModule specifically so other modules never touch NotificationsRepository or the ' +
        'Notification table directly (care-plans\' run-automation cross-context write).',
      severity: 'error',
      from: { path: '^src/modules/([^/]+)/' },
      to: {
        path: '^src/modules/(?!$1/)([^/]+)/(presentation/|domain/|application/use-cases/|policies/)',
        pathNot: [
          '^src/modules/notifications/application/use-cases/publish-notifications\\.use-case\\.ts$',
        ],
      },
    },
    {
      name: 'no-core-imports-modules',
      comment:
        'core/ holds application-wide concerns and must not depend on business modules - ' +
        'otherwise it is not actually core. Verified zero existing violations.',
      severity: 'error',
      from: { path: '^src/core/' },
      to: { path: '^src/modules/' },
    },
  ],
  options: {
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: { exportsFields: ['exports'], conditionNames: ['import', 'require', 'node', 'default'] },
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '^(dist|node_modules)' },
  },
};
