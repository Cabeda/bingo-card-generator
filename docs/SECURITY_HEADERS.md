# Security Headers Documentation

## Overview

This application implements comprehensive security headers to protect against common web vulnerabilities such as XSS (Cross-Site Scripting), clickjacking, MIME-sniffing, and other security threats.

## Implemented Security Headers

### 1. Content-Security-Policy (CSP)

Restricts the sources from which content can be loaded, helping prevent XSS attacks.

**Policy:**
```
default-src 'self'; 
script-src 'self' 'unsafe-eval' 'unsafe-inline'; 
style-src 'self' 'unsafe-inline'; 
img-src 'self' data: blob:; 
font-src 'self' data:; 
connect-src 'self'; 
frame-ancestors 'none'; 
base-uri 'self'; 
form-action 'self'
```

**Notes:**
- `'unsafe-eval'` is required for Next.js runtime
- `'unsafe-inline'` for styles is required for TailwindCSS
- `data:` and `blob:` for images support PDF generation and canvas operations

### 2. Strict-Transport-Security (HSTS)

Enforces HTTPS connections to prevent protocol downgrade attacks and cookie hijacking.

**Value:** `max-age=63072000; includeSubDomains; preload`

- **max-age:** 2 years (63072000 seconds)
- **includeSubDomains:** Applies to all subdomains
- **preload:** Eligible for browser preload lists

### 3. X-Frame-Options

Prevents clickjacking attacks by controlling whether the site can be embedded in frames.

**Value:** `DENY`

Completely prevents the page from being displayed in frames.

### 4. X-Content-Type-Options

Prevents MIME-sniffing attacks by ensuring browsers respect the declared Content-Type.

**Value:** `nosniff`

### 5. X-XSS-Protection

Enables the browser's XSS filtering mechanism.

**Value:** `1; mode=block`

- Enables XSS filter
- Blocks page rendering if an attack is detected

### 6. Referrer-Policy

Controls how much referrer information is shared with external requests.

**Value:** `strict-origin-when-cross-origin`

Sends full URL for same-origin requests, but only the origin for cross-origin HTTPS requests.

### 7. Permissions-Policy

Restricts access to browser features and APIs.

**Value:** `camera=(), microphone=(), geolocation=()`

Disables access to:
- Camera
- Microphone
- Geolocation

### 8. X-DNS-Prefetch-Control

Enables DNS prefetching for improved performance.

**Value:** `on`

## Configuration

Security headers are configured in `next.config.ts`:

```typescript
const securityHeaders = [
  // ... header definitions
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

## Verification

### During Development

Headers are automatically applied in both development and production modes.

To verify headers locally:

```bash
# Start the server
npm run dev

# Check headers
curl -I http://localhost:3000/en
```

### In Production

Headers are applied to all routes matching the pattern `/:path*`.

## Testing Tools

Use these online tools to verify security headers:

1. **Mozilla Observatory**: https://observatory.mozilla.org/
2. **Security Headers**: https://securityheaders.com/
3. **OWASP ZAP**: https://www.zaproxy.org/
4. **Lighthouse**: Built into Chrome DevTools

## Browser DevTools Verification

1. Open the application in a browser
2. Open DevTools (F12)
3. Navigate to the **Network** tab
4. Refresh the page
5. Click on the first request
6. Check the **Headers** section
7. Verify all security headers are present in the **Response Headers**

## Security Considerations

### Why `'unsafe-inline'` for Styles?

TailwindCSS and Next.js require inline styles for optimal performance and functionality. The CSP is configured to balance security with functionality.

### Why `'unsafe-eval'` for Scripts?

Next.js uses `eval()` in its runtime for features like Fast Refresh and server-side rendering. This is a known requirement for Next.js applications.

### Future Improvements

- Implement nonce-based CSP for inline scripts and styles
- Add report-uri for CSP violation reporting
- Implement rate limiting for API endpoints
- Add CSRF protection for form submissions
- Implement subresource integrity (SRI) for external resources

## Additional Security Measures

Beyond headers, the application implements:

1. **Input Validation**: All user inputs are validated before processing
2. **File Upload Validation**: Strict validation of uploaded `.bingoCards` files
3. **No External Dependencies at Runtime**: All resources served from same origin
4. **Secure Cookie Flags**: Session cookies (if any) use Secure and HttpOnly flags

## References

- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [Content Security Policy Guide](https://content-security-policy.com/)

## Support

If you discover a security vulnerability, please follow our [Security Policy](../SECURITY.md) to report it responsibly.
