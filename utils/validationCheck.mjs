// validationCheck.mjs

import xss from "xss";
import validator from "validator";

// ===============================
// ✅ SANITIZER + SECURITY HELPERS
// ===============================

function isPlainObject(val) {
  return Object.prototype.toString.call(val) === "[object Object]";
}

function sanitizeString(str, options = {}) {
  if (typeof str !== "string") return str;
  let s = str.trim();
  s = s.replace(/\0/g, ""); // remove null bytes
  s = xss(s); // prevent XSS
  if (options.maxLength && s.length > options.maxLength) {
    s = s.slice(0, options.maxLength);
  }
  return s;
}

/**
 * Sanitize deeply any input object/array/string
 */
export function sanitizeObject(input, options = {}) {
  const { maxStringLength = 2000, allowedKeysRegex = null, removeEmpty = false } = options;

  if (typeof input === "string") return sanitizeString(input, { maxLength: maxStringLength });
  if (typeof input === "number" || typeof input === "boolean" || input === null) return input;

  if (Array.isArray(input)) {
    return input
      .map((item) => sanitizeObject(item, options))
      .filter((v) => !(removeEmpty && v === ""));
  }

  if (isPlainObject(input)) {
    const out = {};
    for (const [rawKey, rawVal] of Object.entries(input)) {
      if (rawKey.startsWith("$")) continue;
      if (rawKey.includes(".")) continue;
      if (["__proto__", "constructor", "prototype"].includes(rawKey)) continue;

      if (allowedKeysRegex && !allowedKeysRegex.test(rawKey)) continue;

      const safeKey = validator.whitelist(rawKey, "a-zA-Z0-9_\\-");
      if (!safeKey) continue;

      const cleanVal = sanitizeObject(rawVal, options);
      if (
        removeEmpty &&
        (cleanVal === "" || (Array.isArray(cleanVal) && cleanVal.length === 0))
      ) {
        continue;
      }
      out[safeKey] = cleanVal;
    }
    return out;
  }

  return input;
}

/**
 * Middleware: sanitize req.body/query/params
 */
export function sanitizeMiddleware(options = {}) {
  return (req, res, next) => {
    try {
      if (req.body) req.body = sanitizeObject(req.body, options);
      if (req.query) {
        const cleanQuery = sanitizeObject(req.query, options);
        // ❌ সরাসরি assign না করে → প্রতিটা key overwrite করো
        for (const key of Object.keys(req.query)) {
          delete req.query[key];
        }
        Object.assign(req.query, cleanQuery);
      }

      if (req.params) {
        const cleanParams = sanitizeObject(req.params, options);
        for (const key of Object.keys(req.params)) {
          delete req.params[key];
        }
        Object.assign(req.params, cleanParams);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}


// ===============================
// 🔥 DANGEROUS / SUSPICIOUS CONTENT CHECKS
// ===============================

/**
 * containsDangerousContent
 *
 * Checks a string (or array/object of strings) for suspicious/dangerous patterns.
 *
 * options:
 *  - checkXSS: boolean (default true)         -> checks for <script>, onerror, onload, iframe, svg/on*, etc
 *  - checkJSCalls: boolean (default true)     -> checks for eval, document.cookie, window.location, new Function
 *  - checkNoSQL: boolean (default true)       -> checks for leading $ operators or object-like $gt patterns inside strings
 *  - checkSQL: boolean (default true)         -> checks for common SQL keywords (select, union, drop, insert, delete)
 *  - maxLength: number (default 5000)         -> if string longer than this, mark suspicious
 *  - customBlacklist: array of regex/strings  -> extra patterns to check
 *
 * Returns: { found: boolean, reasons: [string] }
 */
export function containsDangerousContent(input, options = {}) {
  const cfg = {
    checkXSS: true,
    checkJSCalls: true,
    checkNoSQL: true,
    checkSQL: true,
    maxLength: 5000,
    customBlacklist: [],
    ...options,
  };

  const reasons = [];

  function checkString(str) {
    if (typeof str !== "string") return;

    const s = str.trim();

    // 1) XSS-like patterns
    if (cfg.checkXSS) {
      const xssPatterns = [
        /<\s*script\b/i,
        /<\s*iframe\b/i,
        /on\w+\s*=/i, // onload=, onerror=, onclick= etc
        /javascript\s*:/i,
        /<\s*img\b[^>]*on\w+/i,
        /<\s*svg\b/i,
        /<\s*object\b/i,
        /<\s*embed\b/i,
        /<\/\s*script\s*>/i,
      ];
      for (const p of xssPatterns) {
        if (p.test(s)) {
          reasons.push("xss_pattern:" + p.toString());
          break;
        }
      }
    }

    // 2) Dangerous JS calls / DOM access
    if (cfg.checkJSCalls) {
      const jsPatterns = [
        /\beval\s*\(/i,
        /\bnew\s+Function\s*\(/i,
        /document\.cookie/i,
        /window\.location/i,
        /localStorage\.setItem/i,
        /sessionStorage\.setItem/i,
        /XMLHttpRequest/i,
        /fetch\s*\(/i,
      ];
      for (const p of jsPatterns) {
        if (p.test(s)) {
          reasons.push("js_call:" + p.toString());
          break;
        }
      }
    }

    // 3) NoSQL injection-ish patterns inside string value
    if (cfg.checkNoSQL) {
      // e.g. {"$gt":""} or $ne, $in, $where etc or keys starting with $
      if (/\$\w+/.test(s)) {
        reasons.push("nosql_operator_in_string");
      }
      // dotted keys ../ or ../../ patterns often used in traversal
      if (/\.\.\//.test(s) || /\.\.\\/.test(s)) {
        reasons.push("path_traversal_like");
      }
    }

    // 4) SQL injection-ish patterns
    if (cfg.checkSQL) {
      // Basic keyword detection (word boundaries)
      const sqlKeywords = /\b(select|union|insert|update|delete|drop|truncate|alter|create|exec|execute)\b/i;
      // often payloads include '--' or ';--' comments
      if (sqlKeywords.test(s) || /--|;--|;|\/\*/.test(s)) {
        // allow if it's just a short normal sentence that includes 'select' as a word? still flag
        reasons.push("sql_like_pattern");
      }
    }

    // 5) Excessive length
    if (cfg.maxLength && s.length > cfg.maxLength) {
      reasons.push("excessive_length");
    }

    // 6) custom blacklist checks
    if (Array.isArray(cfg.customBlacklist) && cfg.customBlacklist.length > 0) {
      for (const c of cfg.customBlacklist) {
        if (typeof c === "string" && s.includes(c)) {
          reasons.push("custom_blacklist_string:" + c);
        } else if (c instanceof RegExp && c.test(s)) {
          reasons.push("custom_blacklist_regex:" + c.toString());
        }
      }
    }
  }

  // Walk input (string / array / object)
  function walk(obj) {
    if (typeof obj === "string") return checkString(obj);
    if (Array.isArray(obj)) return obj.forEach(walk);
    if (isPlainObject(obj)) return Object.values(obj).forEach(walk);
    return;
  }

  walk(input);

  return {
    found: reasons.length > 0,
    reasons: Array.from(new Set(reasons)), // unique reasons
  };
}


/**
 * Quick check if an object looks safe for Mongo
 */
export function looksSafeForMongo(obj) {
  if (typeof obj === "string") {
        return true;
  }
  if (Array.isArray(obj)) return obj.every(looksSafeForMongo);
  if (isPlainObject(obj)) {
    for (const key of Object.keys(obj)) {
      if (key.startsWith("$") || key.includes("$") || key.includes(".")) return false;
      if (!looksSafeForMongo(obj[key])) return false;
    }
  }
  return true;
}

// ===============================
// ✅ VALIDATION HELPERS
// ===============================

// String check
export function isValidString(value, min = 1, max = 255) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  // Length check
  if (trimmed.length < min || trimmed.length > max) return false;
  // ❌ Disallowed patterns (XSS, SQL injection, quotes, etc.)
  const forbiddenPattern =
    /<script.*?>.*?<\/script>|<.*?>|['"`$;{}()[\]\\<>]|--|\/\*|\*\//gi;

  return !forbiddenPattern.test(trimmed);
}

/**
 * isSafeString
 *  - wrapper to check string validity + dangerous content
 *  - returns { safe: boolean, errors: [] }
 */
export function isSafeString(value, { min = 1, max = 255, ...dangerOptions } = {}) {
  const errors = [];

  if (!isValidString(value, min, max)) {
    errors.push("invalid_length_or_type");
  }

  const danger = containsDangerousContent(value, dangerOptions);
  if (danger.found) {
    errors.push(...danger.reasons);
  }

  return {
    safe: errors.length === 0,
    errors,
  };
}


// Number check
export function isValidNumber(
  value,
  min = Number.MIN_SAFE_INTEGER,
  max = Number.MAX_SAFE_INTEGER
) {
  if (typeof parseFloat(value) !== "number" || isNaN(parseFloat(value))) return false;
  return value >= min && value <= max;
}

// Email check
export function isValidEmail(value) {
  if (typeof value !== "string") return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(value.trim());
}

// URL check
export function isValidUrl(value) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

// MongoDB ObjectId check
export function isValidObjectId(id) {
  if (typeof id !== "string") return false;
  return /^[a-f\d]{24}$/i.test(id);
}

// File/Image check
export function isValidImage(
  file,
  allowedTypes = ["image/jpeg", "image/png", "image/webp"],
  maxSizeMB = 5
) {
  if (!file || !file.mimetype || !file.size) return false;
  if (!allowedTypes.includes(file.mimetype)) return false;
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

// Required field check
export function isRequired(value) {
  return value !== undefined && value !== null && value !== "";
}

// date check
export function isValidDate(value) {
  const date = new Date(value);
  return !isNaN(date.getTime());
}

// Centralized validation runner
export function runValidations(validations, data = {}) {
  const errors = {};

  for (const [field, rules] of Object.entries(validations)) {
    const value = data[field]; // get the value from input
    for (const [checkFn, errorMsg] of rules) {
      if (!checkFn) continue;
      // pass value to checkFn
      if (!checkFn(value) || !isRequired(value) ) {
        errors[field] = errorMsg;
        break; // stop on first error for that field
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

