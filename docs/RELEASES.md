# Release Management and Automated Versioning

This project uses [Bun's version management](https://bun.com/docs/cli/pm#version) to automate version bumps
and release creation based on conventional commits.

## How It Works

### Conventional Commits

All commits to this repository should follow the
[Conventional Commits](https://www.conventionalcommits.org/) specification:

```text
type(scope): brief description

Longer description if needed

Closes #123
```

### Commit Types and Versioning

Different commit types trigger different version bumps:

| Commit Type | Version Bump | Example |
|------------|--------------|---------|
| `feat:` | Minor (0.1.0 → 0.2.0) | `feat: add new card layout` |
| `fix:`, `perf:` | Patch (0.1.0 → 0.1.1) | `fix: resolve PDF rendering issue` |
<<<<<<< HEAD
| `refactor:`, `style:`, `test:`, `build:`, `ci:`, `chore:`, `docs:` | Patch (0.1.0 → 0.1.1) | `refactor: improve code` |
=======
| `refactor:`, `style:`, `test:`, `build:`, `ci:`, `chore:`, `docs:` | Patch (0.1.0 → 0.1.1) | `refactor: improve card generation logic` |
>>>>>>> 9ee60e97bfba1bcb2aae43bddd8a83a5b93af9bd
| `feat!:` or `fix!:` | Major (0.1.0 → 1.0.0) | `feat!: redesign card generation API` |

**Note**: All conventional commit types trigger a patch version bump to ensure all changes are tracked in releases.

**Breaking Changes**: Add `!` after the type (e.g., `feat!:`) or add `BREAKING CHANGE:` in the commit body.

### CHANGELOG Sections

The CHANGELOG should be maintained manually after each release and organized into these sections:

- **Features** - `feat:` commits
- **Bug Fixes** - `fix:` commits
- **Performance Improvements** - `perf:` commits
- **Documentation** - `docs:` commits
- **Styles** - `style:` commits
- **Code Refactoring** - `refactor:` commits
- **Tests** - `test:` commits
- **Build System** - `build:` commits
- **Continuous Integration** - `ci:` commits
- **Miscellaneous** - `chore:` commits

**Updating the CHANGELOG**: After each automated release, maintainers should:
<<<<<<< HEAD

=======
>>>>>>> 9ee60e97bfba1bcb2aae43bddd8a83a5b93af9bd
1. Review the GitHub release notes to see which commits were included
2. Update `CHANGELOG.md` with organized, user-friendly descriptions
3. Group changes by type and add any necessary context or migration notes
4. Commit the updated CHANGELOG to the main branch (this won't trigger a new release if using `docs:` commit type)

## Release Process

### Automated Release Creation

When conventional commits are pushed to the `main` branch:

1. The Release GitHub Action runs automatically
2. It analyzes all commits since the last release tag
3. It determines the next version number based on commit types
4. It runs `bun version` (patch, minor, or major) which:
   - Updates the version in `package.json`
   - Creates a git commit with message "vX.Y.Z"
   - Creates a git tag "vX.Y.Z"
5. The workflow pushes the commit and tag to the repository
6. A GitHub release is automatically created with:
   - The version tag (e.g., `v0.2.0`)
   - Release notes listing all commits since the last release
   - Link to the full changelog

### Manual Changelog Updates

While releases are automated, you should manually update `CHANGELOG.md`:

1. After a release is created, update `CHANGELOG.md` with organized notes
2. Group changes by type (Features, Bug Fixes, etc.)
3. Add any additional context or migration notes
4. Commit the changelog update to main

## Configuration Files

### `.github/workflows/release.yml`

GitHub Actions workflow that:
<<<<<<< HEAD

=======
>>>>>>> 9ee60e97bfba1bcb2aae43bddd8a83a5b93af9bd
- Analyzes commits for conventional commit types
- Determines the appropriate version bump (major/minor/patch)
- Uses `bun version` to update package.json and create git tags
- Creates a GitHub release with generated release notes

## Best Practices

### For Contributors

1. **Always use conventional commits** - This ensures proper version bumping and release notes
2. **Choose the correct type** - Use `feat:` for features, `fix:` for bugs, etc.
3. **Include a scope when relevant** - e.g., `feat(cards):`, `fix(game):`
4. **Write clear descriptions** - The commit message appears in the release notes
5. **Mark breaking changes** - Use `!` or `BREAKING CHANGE:` footer

### For Maintainers

1. **Review releases on GitHub** - Check the generated release notes and version bump
2. **Update CHANGELOG.md** - Manually organize and enhance the changelog after releases
3. **Monitor the Release workflow** - Check GitHub Actions if releases fail
4. **Use squash merging for PRs** - Ensure the squashed commit follows conventional commits

## Examples

### Feature Addition

```bash
git commit -m "feat(pdf): add quality mode selector

Allows users to choose between Fast, Balanced, and High Quality modes
for PDF generation with different speed/quality tradeoffs.

Closes #42"
```

This will:

- Trigger a minor version bump (e.g., 0.1.0 → 0.2.0)
- Appear under "Features" in the CHANGELOG

### Bug Fix

```bash
git commit -m "fix(game): prevent duplicate number draws

Adds validation to ensure the same number cannot be drawn twice
in a single game session.

Fixes #56"
```

This will:

- Trigger a patch version bump (e.g., 0.1.0 → 0.1.1)
- Appear under "Bug Fixes" in the CHANGELOG

### Breaking Change

```bash
git commit -m "feat!: change card format structure

BREAKING CHANGE: The .bingoCards format now uses JSON instead of
pipe-delimited format. Old files will need to be converted.

Migration guide: See docs/MIGRATION.md

Closes #78"
```

This will:

- Trigger a major version bump (e.g., 0.1.0 → 1.0.0)
- Appear under "Features" with a BREAKING CHANGE note in the CHANGELOG

### Non-versioning Changes

```bash
git commit -m "docs: update installation instructions"
```

This will:

- NOT trigger a version bump
- Appear under "Documentation" in the next release's CHANGELOG

## Troubleshooting

### Release Not Created

If a release is not created automatically:

1. Check that commits follow conventional commits format
2. Verify the workflow ran successfully in the Actions tab
3. Ensure commits include version-bumping types (`feat:`, `fix:`, etc.)
4. Check if there were any git push errors in the workflow logs

### Wrong Version Bump

If the version bump is incorrect:

1. Check the commit types used since the last release
2. Remember: `feat` = minor, `fix`/`perf`/etc = patch, `feat!` or `fix!` = major
3. The workflow analyzes all commits since the last tag
4. Breaking changes always trigger major version bumps

### Workflow Errors

If the Release workflow fails:

1. Check the workflow logs in the Actions tab
2. Verify that the GITHUB_TOKEN has write permissions
3. Ensure there are no merge conflicts
4. Check if the git configuration is correct in the workflow

## Additional Resources

- [Bun Version Management Documentation](https://bun.com/docs/cli/pm#version)
- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
