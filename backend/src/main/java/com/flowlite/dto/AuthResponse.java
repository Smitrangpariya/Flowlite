package com.flowlite.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.flowlite.entity.Role;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class AuthResponse {
    /**
     * Token is used internally by AuthController to set the HttpOnly cookie,
     * but is NEVER serialized to the JSON response body (XSS prevention).
     */
    @JsonIgnore
    private String token;

    private String username;
    private String firstName;
    private String lastName;
    private String email;
    private Role role;
    private Long userId;
    private Long organizationId;
    private String organizationName;
    private String jobTitle;

    public AuthResponse(String token, String username, String firstName, String lastName,
                        String email, Role role, Long userId,
                        Long organizationId, String organizationName,
                        String jobTitle) {
        this.token = token;
        this.username = username;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.role = role;
        this.userId = userId;
        this.organizationId = organizationId;
        this.organizationName = organizationName;
        this.jobTitle = jobTitle;
    }
}
