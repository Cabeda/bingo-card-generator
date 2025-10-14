# Release Management and Automated CHANGELOG

This project uses [release-please](https://github.com/googleapis/release-please) to automate version management
and CHANGELOG generation based on conventional commits.

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
| `fix:` | Patch (0.1.0 → 0.1.1) | `fix: resolve PDF rendering issue` |
| `feat!:` or `fix!:` | Major (0.1.0 → 1.0.0) | `feat!: redesign card generation API` |
| `docs:`, `style:`, `refactor:`, `test:`, `chore:` | No version bump | `docs: update README` |

**Breaking Changes**: Add `!` after the type (e.g., `feat!:`) or add `BREAKING CHANGE:` in the commit body.

### CHANGELOG Sections

The CHANGELOG is organized into these sections based on commit types:

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

## Release Process

### Automated Release PR Creation

When conventional commits are pushed to the `main` branch:

1. The release-please GitHub Action runs automatically
2. It analyzes all commits since the last release
3. It determines the next version number based on commit types
4. It creates or updates a Release PR that:
   - Updates `CHANGELOG.md` with all changes grouped by type
   - Bumps the version in `package.json`
   - Creates a release commit

### Merging the Release PR

When maintainers merge the Release PR:

1. The release commit is added to main
2. A GitHub release is automatically created with:
   - The version tag (e.g., `v0.2.0`)
   - Release notes generated from the CHANGELOG
   - Links to the full CHANGELOG

### Manual Releases

If needed, maintainers can manually trigger releases by:

1. Merging conventional commits to main
2. Waiting for release-please to create the Release PR
3. Reviewing and merging the Release PR

## Configuration Files

### `.github/workflows/release-please.yml`

GitHub Actions workflow that runs release-please on pushes to main.

### `release-please-config.json`

Configuration for release-please including:

- Release type (Node.js)
- Package name
- CHANGELOG section mappings
- Hidden sections

### `.release-please-manifest.json`

Tracks the current version of the project. This file is automatically updated by release-please.

## Best Practices

### For Contributors

1. **Always use conventional commits** - This ensures your changes appear in the CHANGELOG
2. **Choose the correct type** - Use `feat:` for features, `fix:` for bugs, etc.
3. **Include a scope when relevant** - e.g., `feat(cards):`, `fix(game):`
4. **Write clear descriptions** - The commit message becomes the CHANGELOG entry
5. **Mark breaking changes** - Use `!` or `BREAKING CHANGE:` footer

### For Maintainers

1. **Review Release PRs carefully** - Check the generated CHANGELOG and version bump
2. **Edit Release PR if needed** - You can manually adjust the CHANGELOG before merging
3. **Merge Release PRs promptly** - This creates the GitHub release
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

### Release PR Not Created

If release-please doesn't create a PR:

1. Check that commits follow conventional commits format
2. Verify the workflow ran successfully in the Actions tab
3. Ensure commits include version-bumping types (`feat:`, `fix:`, etc.)

### Wrong Version Bump

If the version bump is incorrect:

1. Check the commit types used
2. Remember: `feat` = minor, `fix` = patch, `feat!` or `fix!` = major
3. You can manually edit the Release PR before merging

### CHANGELOG Issues

If the CHANGELOG format is wrong:

1. Check `release-please-config.json` for section mappings
2. Verify commit messages follow the conventional format
3. You can manually edit the Release PR's CHANGELOG before merging

## Additional Resources

- [Release Please Documentation](https://github.com/googleapis/release-please)
- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
