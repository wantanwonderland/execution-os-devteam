# Security Rules

- Never hardcode secrets, API keys, or credentials in source code
- Use environment variables or a secrets manager for sensitive values
- Validate and sanitize all user input before processing
- Use parameterized queries for all database operations — no string concatenation
- Do not log PII (personally identifiable information) or sensitive data
- Apply the principle of least privilege for all access controls
- Keep dependencies up to date and audit for known vulnerabilities
- Use HTTPS for all external communication
- Escape output to prevent XSS in frontend code
- Never commit .env files or secret configuration to version control
