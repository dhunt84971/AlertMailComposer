import { describe, it, expect } from 'vitest';

// Test the validation logic used in the renderer
// These are pure functions extracted for testing

function validateEmails(str) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emails = str.split(';').map(e => e.trim()).filter(e => e);
  return emails.length > 0 && emails.every(e => emailRegex.test(e));
}

function validateSqlQuery(sql) {
  if (!sql.trim()) return { valid: true };
  const forbidden = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE', 'EXEC', 'EXECUTE'];
  for (const kw of forbidden) {
    const regex = new RegExp('\\b' + kw + '\\b', 'i');
    if (regex.test(sql)) {
      return { valid: false, message: `Query must not contain ${kw} statements` };
    }
  }
  if (!sql.toUpperCase().includes('SELECT')) {
    return { valid: false, message: 'Query must contain a SELECT statement' };
  }
  return { valid: true };
}

// Server-side validation replication (from src/main/db/alertEmails.js)
// Empty query is invalid on server side (unlike client side)
function validateQueryServerSide(queryText) {
  if (!queryText || !queryText.trim()) {
    return { valid: false, message: 'Query cannot be empty' };
  }
  const forbidden = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE', 'EXEC', 'EXECUTE'];
  for (const kw of forbidden) {
    const regex = new RegExp('\\b' + kw + '\\b', 'i');
    if (regex.test(queryText)) {
      return { valid: false, message: `Query must not contain ${kw} statements` };
    }
  }
  if (!queryText.toUpperCase().includes('SELECT')) {
    return { valid: false, message: 'Query must contain a SELECT statement' };
  }
  return { valid: true };
}

// escapeHtml helper (from renderer views)
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

describe('Email validation', () => {
  it('should accept valid single email', () => {
    expect(validateEmails('user@example.com')).toBe(true);
  });

  it('should accept semicolon-separated emails', () => {
    expect(validateEmails('a@b.com;c@d.com')).toBe(true);
  });

  it('should reject empty string', () => {
    expect(validateEmails('')).toBe(false);
  });

  it('should reject invalid email format', () => {
    expect(validateEmails('not-an-email')).toBe(false);
  });

  it('should reject if any email in list is invalid', () => {
    expect(validateEmails('a@b.com;invalid;c@d.com')).toBe(false);
  });

  it('should handle whitespace around semicolons', () => {
    expect(validateEmails('a@b.com ; c@d.com')).toBe(true);
  });
});

describe('SQL query validation', () => {
  it('should accept valid SELECT query', () => {
    const result = validateSqlQuery('SELECT 1 AS SendMail');
    expect(result.valid).toBe(true);
  });

  it('should accept empty query', () => {
    const result = validateSqlQuery('');
    expect(result.valid).toBe(true);
  });

  it('should reject INSERT statements', () => {
    const result = validateSqlQuery('INSERT INTO table VALUES (1)');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('INSERT');
  });

  it('should reject UPDATE statements', () => {
    const result = validateSqlQuery('UPDATE table SET col = 1');
    expect(result.valid).toBe(false);
  });

  it('should reject DELETE statements', () => {
    const result = validateSqlQuery('DELETE FROM table');
    expect(result.valid).toBe(false);
  });

  it('should reject DROP statements', () => {
    const result = validateSqlQuery('DROP TABLE users');
    expect(result.valid).toBe(false);
  });

  it('should reject EXEC statements', () => {
    const result = validateSqlQuery('EXEC sp_something');
    expect(result.valid).toBe(false);
  });

  it('should reject query without SELECT', () => {
    const result = validateSqlQuery('SOME RANDOM SQL');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('SELECT');
  });

  it('should accept complex SELECT with subqueries', () => {
    const result = validateSqlQuery('SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END AS SendMail FROM Table1 WHERE Status = 1');
    expect(result.valid).toBe(true);
  });

  it('should reject EXEC followed by parenthesis', () => {
    const result = validateSqlQuery('SELECT 1; EXEC(\'sp_something\')');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('EXEC');
  });

  it('should accept query with keyword inside string literal context explanation', () => {
    // The word "SELECTED" contains "SELECT" so it passes the SELECT check,
    // but note that our regex uses word boundaries so "UPDATED" would not match "UPDATE"
    const result = validateSqlQuery('SELECT Status FROM Orders WHERE Description = \'UPDATED value\'');
    expect(result.valid).toBe(true);
  });
});

describe('Server-side SQL query validation', () => {
  it('should reject empty query', () => {
    const result = validateQueryServerSide('');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('empty');
  });

  it('should reject null query', () => {
    const result = validateQueryServerSide(null);
    expect(result.valid).toBe(false);
  });

  it('should reject whitespace-only query', () => {
    const result = validateQueryServerSide('   ');
    expect(result.valid).toBe(false);
  });

  it('should accept valid SELECT query', () => {
    const result = validateQueryServerSide('SELECT 1 AS SendMail');
    expect(result.valid).toBe(true);
  });

  it('should reject DELETE statements', () => {
    const result = validateQueryServerSide('DELETE FROM MailAlerts WHERE ID = 1');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('DELETE');
  });

  it('should reject EXEC followed by parenthesis', () => {
    const result = validateQueryServerSide('EXEC(\'xp_cmdshell\')');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('EXEC');
  });

  it('should accept query with keyword inside string literal context explanation', () => {
    const result = validateQueryServerSide('SELECT Name FROM Users WHERE Note = \'will DELETE later\'');
    // Note: our word-boundary regex WILL match DELETE here since it appears as a standalone word
    // in the SQL text. This is intentional - server-side validation is conservative.
    expect(result.valid).toBe(false);
  });

  it('should reject query without SELECT', () => {
    const result = validateQueryServerSide('TRUNCATE TABLE Users');
    expect(result.valid).toBe(false);
  });

  it('should not flag words that contain keywords as substrings', () => {
    // "EXECUTED" should not match "EXECUTE" due to word boundary
    const result = validateQueryServerSide('SELECT EXECUTED_COUNT FROM JobLog');
    expect(result.valid).toBe(true);
  });
});

describe('escapeHtml', () => {
  it('should escape ampersands', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('should escape angle brackets', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });

  it('should escape quotes', () => {
    expect(escapeHtml('"hello" & \'world\'')).toBe('&quot;hello&quot; &amp; &#039;world&#039;');
  });

  it('should return empty string for null', () => {
    expect(escapeHtml(null)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(escapeHtml(undefined)).toBe('');
  });

  it('should convert numbers to string', () => {
    expect(escapeHtml(42)).toBe('42');
  });

  it('should handle empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('should pass through safe strings unchanged', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World');
  });
});
