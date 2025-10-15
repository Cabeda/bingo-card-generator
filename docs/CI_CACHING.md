# CI Build Caching Strategy

This document explains the build caching strategy implemented in our GitHub Actions workflows to
optimize CI/CD pipeline performance.

## Overview

Build caching significantly reduces CI execution time by reusing previously computed results across
workflow runs. Our caching strategy targets three main areas:

1. **Bun Dependencies** - Package manager cache
2. **Next.js Build Cache** - Incremental build artifacts
3. **Coverage Reports** - Test coverage data

## Workflows with Caching

The following workflows have caching enabled:

- `test.yml` - Full caching (dependencies, Next.js, coverage)
- `deploy.yml` - Dependencies and Next.js caching
- `lint-autofix.yml` - Dependencies caching only
- `markdown-lint.yml` - Dependencies caching only
- `codeql.yml` - Dependencies caching only

## Cache Configurations

### 1. Bun Dependencies Cache

**Purpose**: Speed up package installation by caching Bun's global install cache.

**Configuration**:

```yaml
- name: Cache Bun dependencies
  uses: actions/cache@v4
  with:
    path: ~/.bun/install/cache
    key: ${{ runner.os }}-bun-${{ hashFiles('**/bun.lock') }}
    restore-keys: |
      ${{ runner.os }}-bun-
```

**Cache Key Strategy**:

- **Primary Key**: `{OS}-bun-{bun.lock hash}`
- **Restore Keys**: `{OS}-bun-` (fallback to any Bun cache for this OS)

**Invalidation**: Cache is invalidated when `bun.lock` changes (i.e., when dependencies are added,
removed, or updated).

**Expected Benefit**: 50-90% reduction in dependency installation time.

### 2. Next.js Build Cache

**Purpose**: Enable incremental builds by caching Next.js compilation artifacts.

**Configuration**:

```yaml
- name: Cache Next.js build
  uses: actions/cache@v4
  with:
    path: |
      .next/cache
    key: >-
      ${{ runner.os }}-nextjs-${{ hashFiles('**/bun.lock') }}-${{ hashFiles('**/*.ts',
      '**/*.tsx', '**/*.js', '**/*.jsx') }}
    restore-keys: |
      ${{ runner.os }}-nextjs-${{ hashFiles('**/bun.lock') }}-
      ${{ runner.os }}-nextjs-
```

**Cache Key Strategy**:

- **Primary Key**: `{OS}-nextjs-{bun.lock hash}-{source files hash}`  
- **Restore Keys**:
  1. `{OS}-nextjs-{bun.lock hash}-` (same dependencies, different code)
  2. `{OS}-nextjs-` (any Next.js cache for this OS)

**What's Cached**:

- TypeScript build information (`.tsbuildinfo`)
- ESLint cache
- Webpack cache
- SWC transform cache

**Invalidation**: Cache is invalidated when:

- Dependencies change (`bun.lock` modified)
- Source code changes (any `.ts`, `.tsx`, `.js`, `.jsx` file modified)

**Expected Benefit**: 30-70% reduction in build time for incremental builds.

### 3. Coverage Reports Cache

**Purpose**: Preserve test coverage data for debugging and potential upload to coverage services.

**Configuration**:

```yaml
- name: Cache coverage reports
  uses: actions/cache@v4
  with:
    path: coverage
    key: ${{ runner.os }}-coverage-${{ github.sha }}
    restore-keys: |
      ${{ runner.os }}-coverage-
```

**Cache Key Strategy**:

- **Primary Key**: `{OS}-coverage-{commit SHA}`
- **Restore Keys**: `{OS}-coverage-` (fallback to latest coverage for debugging)

**What's Cached**:

- `coverage/coverage-final.json` - Final coverage data
- `coverage/lcov.info` - LCOV format for Codecov
- `coverage/clover.xml` - Clover format
- `coverage/lcov-report/` - HTML coverage report

**Invalidation**: Each commit gets its own coverage cache (keyed by commit SHA).

## Cache Behavior

### Cache Hit

When GitHub Actions finds a cache matching the key:

1. Cache is downloaded and extracted before the step runs
2. Dependencies/build artifacts are reused
3. Workflow execution time is significantly reduced

### Cache Miss

When no matching cache is found:

1. Workflow runs normally (full install/build)
2. At the end of the job, a new cache is created and uploaded
3. Future runs can use this cache

### Restore Keys

Restore keys provide fallback options when the primary key doesn't match:

- They're tried in order from most to least specific
- Partial matches help speed up rebuilds even when exact match isn't available
- Example: If source code changed but dependencies didn't, Next.js cache can still be partially reused

## Cache Limits

GitHub Actions has the following cache limits:

- **Maximum cache size**: 10 GB per repository
- **Retention period**: 7 days for unused caches
- **Maximum caches**: No strict limit, but least recently used caches are evicted when total size exceeds 10 GB

Our typical cache sizes:

- Bun dependencies: ~500 MB - 1 GB
- Next.js build cache: ~100-200 MB
- Coverage reports: ~1 MB

**Total per workflow run**: ~600 MB - 1.2 GB

## Monitoring Cache Performance

### Check Cache Usage

View cache usage in the GitHub Actions UI:

1. Go to repository → Actions → Caches
2. See all caches, their sizes, and last access time

### Check Workflow Logs

Cache hits/misses are logged in the workflow:

```text
Cache hit for key: Linux-bun-abc123...
Cache miss for key: Linux-nextjs-abc123..., will try restore keys
Cache restored from key: Linux-nextjs-abc123
```

### Measure Performance Improvement

Compare workflow execution times:

- **Before caching**: Check historical workflow runs
- **After caching**: New runs with cache hits
- Look for 30-50% overall time reduction

## Troubleshooting

### Cache Not Working

**Symptoms**: No cache hits, always building from scratch

**Possible Causes**:

1. **Cache key includes unstable values** - Check if hash functions are deterministic
2. **Cache expired** - Caches unused for 7 days are automatically deleted
3. **Different runner OS** - Caches are OS-specific

**Solutions**:

- Verify cache key generation in workflow logs
- Check "Caches" page in GitHub Actions to see what caches exist
- Ensure restore keys are properly configured

### Stale Cache Issues

**Symptoms**: Build fails with outdated artifacts

**Possible Causes**:

1. **Cache not invalidated** - Key didn't change when it should have
2. **Incorrect dependencies** - Cached dependencies don't match requirements

**Solutions**:

- Update cache key to include additional dependencies
- Manually delete problematic cache from GitHub UI
- Add versioning to cache keys if needed

### Cache Size Too Large

**Symptoms**: Warning about cache size, slow cache operations

**Solutions**:

1. Review what's being cached
2. Exclude unnecessary files
3. Split into multiple smaller caches if needed

## Best Practices

1. **Use specific cache keys**: Include relevant file hashes to ensure cache invalidation when needed
2. **Provide restore keys**: Fallback keys improve cache hit rate
3. **Cache early in workflow**: Place cache restore before dependency installation
4. **Monitor cache usage**: Regularly check cache sizes and hit rates
5. **Clean up stale caches**: Remove old caches if repository approaches 10 GB limit

## Future Improvements

Potential optimizations to consider:

1. **Separate dependency cache layers**: Cache production and dev dependencies separately
2. **Cache compiled node_modules**: Consider caching the entire node_modules if install time is still slow
3. **Artifact sharing**: Share build artifacts between jobs using `actions/upload-artifact`
4. **Self-hosted runners**: Use self-hosted runners with persistent caches for even better performance

## References

- [GitHub Actions Cache Documentation](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows)
- [Next.js Build Caching](https://nextjs.org/docs/messages/no-cache)
- [Bun Installation](https://bun.sh/docs/install/cache)
- [actions/cache Repository](https://github.com/actions/cache)

---

**Last Updated**: 2025-10-14  
**Maintained By**: DevOps Team
