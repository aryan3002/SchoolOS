module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation changes
        'style',    // Code style changes (formatting, etc.)
        'refactor', // Code refactoring
        'perf',     // Performance improvements
        'test',     // Adding or updating tests
        'build',    // Build system or external dependencies
        'ci',       // CI configuration changes
        'chore',    // Other changes that don't modify src or test files
        'revert',   // Reverting a previous commit
        'security', // Security improvements
        'wip',      // Work in progress (should not be in main branch)
      ],
    ],
    'scope-enum': [
      2,
      'always',
      [
        'api',           // Backend API changes
        'web',           // Web admin console
        'mobile',        // Mobile app
        'database',      // Database schema/migrations
        'auth',          // Authentication
        'ai',            // AI/LLM related
        'ui',            // Shared UI components
        'types',         // Shared types
        'config',        // Configuration
        'knowledge',     // Knowledge service
        'integrations',  // SIS/LMS integrations
        'deps',          // Dependencies
        'infra',         // Infrastructure
        'release',       // Release related
      ],
    ],
    'scope-empty': [2, 'never'],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [2, 'always', 200],
    'body-leading-blank': [2, 'always'],
    'footer-leading-blank': [2, 'always'],
  },
  helpUrl: 'https://github.com/your-org/schoolos/blob/main/CONTRIBUTING.md#commit-messages',
};
