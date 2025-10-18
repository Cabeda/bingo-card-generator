# Security Headers Configuration

This document describes the security headers implemented in the Bingo Card Generator application to protect against common web vulnerabilities.

## Overview

Security headers are configured in `next.config.ts` and are automatically applied to all routes in the application. These headers provide defense-in-depth protection against various attack vectors including XSS, clickjacking, and MIME type confusion.

## Implemented Security Headers

### 1. Content Security Policy (CSP)

**Purpose**: Prevents Cross-Site Scripting (XSS) attacks by controlling which resources can be loaded and executed.

**Implementation**:

```http
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self';
  connect-src 'self';
  worker-src 'self' blob:;
  manifest-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
```

**Directives Explained**:

| Directive | Value | Reason |
|-----------|-------|--------|
| `default-src` | `'self'` | Default policy: only load resources from same origin |
| `script-src` | `'self' 'unsafe-eval' 'unsafe-inline'` | Allows same-origin scripts, inline scripts (React), and eval (Next.js, jsPDF) |
| `style-src` | `'self' 'unsafe-inline'` | Allows same-origin and inline styles (React components) |
| `img-src` | `'self' blob: data:` | Allows same-origin images, blob URLs (PDF), and data URIs |
| `font-src` | `'self'` | Only self-hosted fonts (Geist fonts in `/app/fonts`) |
| `connect-src` | `'self'` | Restricts fetch/XHR/WebSocket to same origin |
| `worker-src` | `'self' blob:` | Allows service workers for PWA functionality |
| `manifest-src` | `'self'` | Allows PWA manifest from same origin |
| `object-src` | `'none'` | Blocks plugins like Flash and Java applets |
| `base-uri` | `'self'` | Prevents base tag injection attacks |
| `form-action` | `'self'` | Restricts form submission destinations |
| `frame-ancestors` | `'none'` | Prevents embedding in iframes (clickjacking protection) |
| `upgrade-insecure-requests` | - | Automatically upgrades HTTP requests to HTTPS |

### 2. X-Frame-Options

**Purpose**: Prevents clickjacking attacks by controlling whether the site can be embedded in iframes.

**Implementation**: `X-Frame-Options: DENY`

**Effect**: The application cannot be embedded in any iframe, frame, or object tag.

### 3. X-Content-Type-Options

**Purpose**: Prevents MIME type sniffing attacks.

**Implementation**: `X-Content-Type-Options: nosniff`

**Effect**: Browsers will not try to guess the content type and will strictly follow the `Content-Type` header.

### 4. Referrer-Policy

**Purpose**: Controls what referrer information is sent with requests.

**Implementation**: `Referrer-Policy: strict-origin-when-cross-origin`

**Effect**:
- Same-origin requests: Send full URL
- Cross-origin requests: Send only origin (not full path)
- Downgrade from HTTPS to HTTP: Send nothing

### 5. Permissions-Policy

**Purpose**: Controls which browser features and APIs can be used.

**Implementation**: `Permissions-Policy: camera=(), microphone=(), geolocation=()`

**Effect**: Disables access to:
- Camera
- Microphone
- Geolocation

These features are not needed by the application, so they are explicitly disabled.

## Limitations and Trade-offs

### Why 'unsafe-inline' and 'unsafe-eval'?

The CSP includes `'unsafe-inline'` and `'unsafe-eval'` which reduce security compared to a strict CSP:

**'unsafe-inline' for scripts and styles**:
- **Required by React**: React uses inline styles and inline event handlers
- **Required by Next.js**: Next.js hydration requires inline scripts
- **Required by Motion library**: Animation library uses inline styles
- **Impact**: Reduces protection against XSS attacks that inject inline scripts
- **Mitigation**: All user inputs are sanitized; React's auto-escaping provides additional protection

**'unsafe-eval' for scripts**:
- **Required by Next.js**: Dynamic imports and code splitting use eval-like functions
- **Required by jsPDF**: PDF generation library uses Function constructor
- **Impact**: Allows dynamic code execution
- **Mitigation**: No user input is passed to eval; all code execution is from trusted sources

### Future Improvements

To further strengthen security, consider these future enhancements:

1. **Nonce-based CSP**: Use cryptographic nonces for inline scripts/styles instead of 'unsafe-inline'
   - Requires Next.js configuration changes
   - Would eliminate 'unsafe-inline' from CSP

2. **Hash-based CSP**: Use SHA-256 hashes for specific inline scripts/styles
   - More complex to maintain
   - Would eliminate 'unsafe-inline' from CSP

3. **Subresource Integrity (SRI)**: Add integrity attributes to script and link tags
   - Verifies that fetched resources haven't been tampered with
   - Useful if any CDN resources are added in the future

4. **Report-URI / report-to**: Add CSP violation reporting
   - Monitor CSP violations in production
   - Helps identify attacks and misconfigurations

## Testing Security Headers

### Manual Testing

1. **Build and run the application**:
   ```bash
   bun run build
   bun run start
   ```

2. **Check headers** using browser DevTools:
   - Open Network tab
   - Load any page
   - Inspect response headers

3. **Verify CSP** with browser console:
   - CSP violations will appear in browser console
   - Test by trying to load external resources (should be blocked)

### Automated Testing

Use online tools to scan security headers:

- [Mozilla Observatory](https://observatory.mozilla.org/)
- [Security Headers](https://securityheaders.com/)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)

### Expected Results

- Mozilla Observatory: A or A+ rating
- Security Headers: A grade
- CSP Evaluator: Will flag 'unsafe-inline' and 'unsafe-eval' as warnings (expected)

## Compliance

These security headers help comply with:

- **OWASP Top 10**: Protection against A03:2021 – Injection
- **NIST Cybersecurity Framework**: Technical security controls
- **PCI DSS**: Web application security requirements
- **GDPR**: Security of processing (Article 32)

## References

- [MDN Web Docs - CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [Next.js Security Headers](https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy)
- [Content Security Policy Reference](https://content-security-policy.com/)

## Changelog

### 2025-10-17
- Initial CSP implementation
- Added X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy headers
- Documented all security headers and their purposes
