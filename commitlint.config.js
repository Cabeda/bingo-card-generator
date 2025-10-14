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
        'style',    // Code style changes (formatting, semicolons, etc.)
        'refactor', // Code refactoring without changing functionality
        'test',     // Adding or updating tests
        'chore',    // Maintenance tasks, dependency updates
        'perf',     // Performance improvements
        'ci',       // CI/CD changes
        'build',    // Build system or external dependencies
        'revert',   // Revert a previous commit
      ],
    ],
    'subject-case': [0], // Allow any case for the subject
  },
};
