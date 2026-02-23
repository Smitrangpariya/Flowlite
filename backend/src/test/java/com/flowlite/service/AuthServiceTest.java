package com.flowlite.service;

import com.flowlite.config.JwtUtil;
import com.flowlite.dto.AuthResponse;
import com.flowlite.dto.LoginRequest;
import com.flowlite.dto.RegisterRequest;
import com.flowlite.entity.*;
import com.flowlite.repository.*;
import com.flowlite.validation.InputValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private OrganizationRepository organizationRepository;
    @Mock private TeamRepository teamRepository;
    @Mock private PasswordResetRepository passwordResetRepository;
    @Mock private EmailVerificationRepository emailVerificationRepository;
    @Mock private RevokedTokenRepository revokedTokenRepository;
    @Mock private LoginAttemptRepository loginAttemptRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtUtil jwtUtil;
    @Mock private AuthenticationManager authenticationManager;
    @Mock private InputValidator inputValidator;
    @Mock private EmailService emailService;

    @InjectMocks
    private AuthService authService;

    private RegisterRequest validRegisterRequest;
    private LoginRequest validLoginRequest;
    private User testUser;
    private Organization testOrg;

    @BeforeEach
    void setUp() {
        validRegisterRequest = new RegisterRequest();
        validRegisterRequest.setUsername("testuser");
        validRegisterRequest.setEmail("test@example.com");
        validRegisterRequest.setPassword("StrongPass1!");
        validRegisterRequest.setOrganizationName("Test Org");

        validLoginRequest = new LoginRequest();
        validLoginRequest.setUsername("testuser");
        validLoginRequest.setPassword("StrongPass1!");

        testOrg = new Organization();
        testOrg.setId(1L);
        testOrg.setName("Test Org");
        testOrg.setActive(true);

        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");
        testUser.setPassword("encoded");
        testUser.setRole(Role.ADMIN);
        testUser.setOrganization(testOrg);
        testUser.setActive(true);
        testUser.setEmailVerified(false);
    }

    // ==================== REGISTER TESTS ====================

    @Test
    @DisplayName("Register - success creates org, user as ADMIN, returns token")
    void register_success() {
        when(inputValidator.isValidEmail(anyString())).thenReturn(true);
        when(inputValidator.isValidUsername(anyString())).thenReturn(true);
        when(inputValidator.isStrongPassword(anyString())).thenReturn(true);
        when(inputValidator.sanitizeInput(anyString())).thenReturn("testuser");
        when(inputValidator.sanitizeOrganizationName(anyString())).thenReturn("Test Org");
        when(inputValidator.isValidOrganizationName(anyString())).thenReturn(true);
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(userRepository.existsByEmailIgnoreCase(anyString())).thenReturn(false);
        when(organizationRepository.existsByNameIgnoreCase(anyString())).thenReturn(false);
        when(organizationRepository.save(any(Organization.class))).thenReturn(testOrg);
        when(passwordEncoder.encode(anyString())).thenReturn("encoded");
        when(userRepository.save(any(User.class))).thenReturn(testUser);
        when(teamRepository.save(any(Team.class))).thenAnswer(inv -> {
            Team t = inv.getArgument(0);
            t.setId(1L);
            return t;
        });
        when(jwtUtil.generateToken(anyString(), anyString())).thenReturn("jwt-token");

        AuthResponse response = authService.register(validRegisterRequest);

        assertThat(response).isNotNull();
        assertThat(response.getToken()).isEqualTo("jwt-token");
        assertThat(response.getUsername()).isEqualTo("testuser");
        assertThat(response.getRole()).isEqualTo(Role.ADMIN);
        verify(organizationRepository).save(any(Organization.class));
        verify(userRepository, atLeast(1)).save(any(User.class));
    }

    @Test
    @DisplayName("Register - duplicate username throws exception")
    void register_duplicateUsername_throws() {
        when(inputValidator.isValidEmail(anyString())).thenReturn(true);
        when(inputValidator.isValidUsername(anyString())).thenReturn(true);
        when(inputValidator.isStrongPassword(anyString())).thenReturn(true);
        when(inputValidator.sanitizeInput(anyString())).thenReturn("testuser");
        when(inputValidator.sanitizeOrganizationName(anyString())).thenReturn("Test Org");
        when(inputValidator.isValidOrganizationName(anyString())).thenReturn(true);
        when(userRepository.existsByUsername("testuser")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(validRegisterRequest))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Username already exists");
    }

    @Test
    @DisplayName("Register - duplicate email throws exception")
    void register_duplicateEmail_throws() {
        when(inputValidator.isValidEmail(anyString())).thenReturn(true);
        when(inputValidator.isValidUsername(anyString())).thenReturn(true);
        when(inputValidator.isStrongPassword(anyString())).thenReturn(true);
        when(inputValidator.sanitizeInput(anyString())).thenReturn("testuser");
        when(inputValidator.sanitizeOrganizationName(anyString())).thenReturn("Test Org");
        when(inputValidator.isValidOrganizationName(anyString())).thenReturn(true);
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(userRepository.existsByEmailIgnoreCase(anyString())).thenReturn(true);

        assertThatThrownBy(() -> authService.register(validRegisterRequest))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Email already exists");
    }

    @Test
    @DisplayName("Register - invalid email throws exception")
    void register_invalidEmail_throws() {
        when(inputValidator.isValidEmail(anyString())).thenReturn(false);

        assertThatThrownBy(() -> authService.register(validRegisterRequest))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Invalid email format");
    }

    @Test
    @DisplayName("Register - weak password throws exception")
    void register_weakPassword_throws() {
        when(inputValidator.isValidEmail(anyString())).thenReturn(true);
        when(inputValidator.isValidUsername(anyString())).thenReturn(true);
        when(inputValidator.isStrongPassword(anyString())).thenReturn(false);

        assertThatThrownBy(() -> authService.register(validRegisterRequest))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Password too weak");
    }

    @Test
    @DisplayName("Register - duplicate org name throws exception")
    void register_duplicateOrgName_throws() {
        when(inputValidator.isValidEmail(anyString())).thenReturn(true);
        when(inputValidator.isValidUsername(anyString())).thenReturn(true);
        when(inputValidator.isStrongPassword(anyString())).thenReturn(true);
        when(inputValidator.sanitizeInput(anyString())).thenReturn("testuser");
        when(inputValidator.sanitizeOrganizationName(anyString())).thenReturn("Test Org");
        when(inputValidator.isValidOrganizationName(anyString())).thenReturn(true);
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(userRepository.existsByEmailIgnoreCase(anyString())).thenReturn(false);
        when(organizationRepository.existsByNameIgnoreCase("Test Org")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(validRegisterRequest))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Organization already exists");
    }

    // ==================== LOGIN TESTS ====================

    @Test
    @DisplayName("Login - success returns token and org info")
    void login_success() {
        Authentication auth = mock(Authentication.class);
        when(loginAttemptRepository.countFailedAttempts(anyString(), any(LocalDateTime.class))).thenReturn(0L);
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(auth);
        when(jwtUtil.generateToken("testuser", "ADMIN")).thenReturn("jwt-token");

        AuthResponse response = authService.login(validLoginRequest, "127.0.0.1");

        assertThat(response.getToken()).isEqualTo("jwt-token");
        assertThat(response.getUsername()).isEqualTo("testuser");
        assertThat(response.getOrganizationId()).isEqualTo(1L);
        assertThat(response.getOrganizationName()).isEqualTo("Test Org");
        verify(loginAttemptRepository).save(argThat(a -> Boolean.TRUE.equals(a.getSuccessful())));
    }

    @Test
    @DisplayName("Login - account locked after 5 failed attempts")
    void login_accountLocked_throws() {
        when(loginAttemptRepository.countFailedAttempts(anyString(), any(LocalDateTime.class))).thenReturn(5L);

        assertThatThrownBy(() -> authService.login(validLoginRequest, "127.0.0.1"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Too many failed login attempts");
    }

    @Test
    @DisplayName("Login - deactivated account throws exception")
    void login_deactivatedAccount_throws() {
        testUser.setActive(false);
        Authentication auth = mock(Authentication.class);
        when(loginAttemptRepository.countFailedAttempts(anyString(), any(LocalDateTime.class))).thenReturn(0L);
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(authenticationManager.authenticate(any())).thenReturn(auth);

        assertThatThrownBy(() -> authService.login(validLoginRequest, "127.0.0.1"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("deactivated");
    }

    @Test
    @DisplayName("Login - failed auth records failed attempt")
    void login_failedAuth_recordsAttempt() {
        when(loginAttemptRepository.countFailedAttempts(anyString(), any(LocalDateTime.class))).thenReturn(0L);
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(authenticationManager.authenticate(any())).thenThrow(new RuntimeException("Bad creds"));

        assertThatThrownBy(() -> authService.login(validLoginRequest, "127.0.0.1"))
                .isInstanceOf(RuntimeException.class);
        verify(loginAttemptRepository).save(argThat(a -> Boolean.FALSE.equals(a.getSuccessful())));
    }

    // ==================== LOGOUT TESTS ====================

    @Test
    @DisplayName("Logout - revokes token")
    void logout_revokesToken() {
        when(jwtUtil.extractExpiration(anyString())).thenReturn(new java.util.Date(System.currentTimeMillis() + 3600000));

        authService.logout("some-token");

        verify(revokedTokenRepository).save(argThat(t -> t.getToken().equals("some-token")));
    }

    @Test
    @DisplayName("isTokenRevoked - returns true for revoked token")
    void isTokenRevoked_true() {
        when(revokedTokenRepository.existsByToken("revoked-token")).thenReturn(true);
        assertThat(authService.isTokenRevoked("revoked-token")).isTrue();
    }
}
