package com.flowlite.service;

import lombok.extern.slf4j.Slf4j;
import org.owasp.html.HtmlPolicyBuilder;
import org.owasp.html.PolicyFactory;
import org.springframework.stereotype.Service;

/**
 * Input sanitizer using OWASP Java HTML Sanitizer.
 * Strips all HTML tags and dangerous content from user inputs
 * to prevent XSS attacks.
 */
@Service
@Slf4j
public class InputSanitizer {

    // Allow NO HTML tags — strips everything
    private static final PolicyFactory STRICT_POLICY = new HtmlPolicyBuilder().toFactory();

    // Allow basic formatting only (bold, italic, lists)
    private static final PolicyFactory BASIC_FORMATTING_POLICY = new HtmlPolicyBuilder()
            .allowElements("b", "i", "em", "strong", "ul", "ol", "li", "p", "br")
            .toFactory();

    /**
     * Sanitize input by stripping ALL HTML tags.
     * Use for: titles, names, usernames, short text fields.
     */
    public String sanitizeStrict(String input) {
        if (input == null) {
            return null;
        }
        String sanitized = STRICT_POLICY.sanitize(input);
        if (!sanitized.equals(input)) {
            log.warn("Input was sanitized (contained HTML): original length={}, sanitized length={}", 
                     input.length(), sanitized.length());
        }
        return sanitized;
    }

    /**
     * Sanitize input allowing basic formatting tags.
     * Use for: descriptions, comments, rich-text fields.
     */
    public String sanitizeBasicFormatting(String input) {
        if (input == null) {
            return null;
        }
        return BASIC_FORMATTING_POLICY.sanitize(input);
    }

    /**
     * Check if input contains potentially dangerous content.
     */
    public boolean containsDangerousContent(String input) {
        if (input == null) {
            return false;
        }
        String sanitized = STRICT_POLICY.sanitize(input);
        return !sanitized.equals(input);
    }
}
