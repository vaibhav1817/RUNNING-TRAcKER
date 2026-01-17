# Security Policy

## Supported Versions

The following versions of Running Tracker are currently being supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly:

1. **Do NOT open a public GitHub issue** for security vulnerabilities.
2. **Email the maintainer directly** or use GitHub's private vulnerability reporting feature.
3. Include as much detail as possible:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment**: You will receive a response within 48 hours.
- **Updates**: We will keep you informed of the progress toward a fix.
- **Resolution**: Once fixed, we will publicly acknowledge your contribution (unless you prefer to remain anonymous).

## Security Best Practices for Contributors

- **Never commit secrets** (API keys, passwords, tokens) to the repository.
- Always use environment variables (`.env`) for sensitive configuration.
- Ensure `.env` files are listed in `.gitignore`.
- Use strong, unique passwords for database and service accounts.

## Past Security Issues

| Date       | Issue                              | Status   |
| ---------- | ---------------------------------- | -------- |
| 2026-01-17 | MongoDB credentials exposed in code | ✅ Fixed |

---

Thank you for helping keep Running Tracker secure!
