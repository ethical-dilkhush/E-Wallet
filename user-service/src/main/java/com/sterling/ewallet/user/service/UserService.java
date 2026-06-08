package com.sterling.ewallet.user.service;

import com.sterling.ewallet.common.dto.UserDto;
import com.sterling.ewallet.common.events.PasswordResetRequestedEvent;
import com.sterling.ewallet.common.events.UserRegisteredEvent;
import com.sterling.ewallet.common.id.Ids;
import com.sterling.ewallet.user.dto.ChangePasswordRequest;
import com.sterling.ewallet.user.dto.PasswordResetConfirmRequest;
import com.sterling.ewallet.user.dto.UpdateProfileRequest;
import com.sterling.ewallet.user.dto.UserCredentialsRequest;
import com.sterling.ewallet.user.dto.UserCredentialsResponse;
import com.sterling.ewallet.user.dto.UserRegistrationRequest;
import com.sterling.ewallet.user.entity.PasswordResetToken;
import com.sterling.ewallet.user.entity.UserEntity;
import com.sterling.ewallet.user.exception.UserAlreadyExistsException;
import com.sterling.ewallet.user.exception.UserNotFoundException;
import com.sterling.ewallet.user.messaging.UserEventPublisher;
import com.sterling.ewallet.user.repository.PasswordResetTokenRepository;
import com.sterling.ewallet.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class UserService {

    private static final Logger LOGGER = LoggerFactory.getLogger(UserService.class);
    private static final int RESET_TOKEN_TTL_MINUTES = 30;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserEventPublisher userEventPublisher;

    public UserService(UserRepository userRepository,
                       PasswordResetTokenRepository passwordResetTokenRepository,
                       PasswordEncoder passwordEncoder,
                       UserEventPublisher userEventPublisher) {
        this.userRepository = userRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.userEventPublisher = userEventPublisher;
    }

    @Transactional
    public UserDto register(UserRegistrationRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new UserAlreadyExistsException("Username already taken: " + request.getUsername());
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new UserAlreadyExistsException("Email already registered: " + request.getEmail());
        }
        if (request.getPhone() != null && !request.getPhone().isBlank()
                && userRepository.existsByPhone(request.getPhone())) {
            throw new UserAlreadyExistsException("Phone number already registered: " + request.getPhone());
        }

        UserEntity entity = new UserEntity();
        entity.setId(Ids.userId());
        entity.setUsername(request.getUsername());
        entity.setEmail(request.getEmail());
        entity.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        entity.setFullName(request.getFullName());
        entity.setPhone(request.getPhone());
        entity.setActive(true);
        entity.setRoles(Set.of(UserEntity.Role.USER));

        UserEntity saved = userRepository.save(entity);
        LOGGER.info("Registered new user id={} username={}", saved.getId(), saved.getUsername());

        userEventPublisher.publishUserRegistered(
                new UserRegisteredEvent(saved.getId(), saved.getUsername(), saved.getEmail()));

        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public UserDto getById(String id) {
        UserEntity entity = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + id));
        return toDto(entity);
    }

    @Transactional(readOnly = true)
    public List<UserDto> searchByUsername(String query) {
        if (query == null || query.isBlank()) {
            return List.of();
        }
        return userRepository
                .findTop8ByActiveTrueAndUsernameContainingIgnoreCaseOrderByUsernameAsc(query.trim())
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public UserCredentialsResponse verifyCredentials(UserCredentialsRequest request) {
        UserEntity user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new UserNotFoundException("Invalid username or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new UserNotFoundException("Invalid username or password");
        }
        return toCredentialsResponse(user);
    }

    @Transactional(readOnly = true)
    public UserCredentialsResponse findByUsername(String username) {
        UserEntity user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + username));
        return toCredentialsResponse(user);
    }

    @Transactional
    public UserDto updateProfile(String id, UpdateProfileRequest request) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + id));

        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
            userRepository.findByEmail(request.getEmail())
                    .filter(existing -> !existing.getId().equals(id))
                    .ifPresent(existing -> {
                        throw new UserAlreadyExistsException("Email already registered: " + request.getEmail());
                    });
            user.setEmail(request.getEmail());
        }

        if (request.getPhone() != null && !request.getPhone().equals(user.getPhone())) {
            if (!request.getPhone().isBlank()) {
                userRepository.findByPhone(request.getPhone())
                        .filter(existing -> !existing.getId().equals(id))
                        .ifPresent(existing -> {
                            throw new UserAlreadyExistsException("Phone number already registered: " + request.getPhone());
                        });
            }
            user.setPhone(request.getPhone());
        }

        if (request.getFullName() != null) {
            user.setFullName(request.getFullName());
        }

        if (request.getAvatar() != null) {
            user.setAvatar(request.getAvatar());
        }

        user.setUpdatedAt(Instant.now());
        UserEntity saved = userRepository.save(user);
        LOGGER.info("Updated profile for user id={}", saved.getId());
        return toDto(saved);
    }

    @Transactional
    public void changePassword(String id, ChangePasswordRequest request) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + id));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Current password is incorrect");
        }
        if (passwordEncoder.matches(request.getNewPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("New password must be different from the current password");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);
        LOGGER.info("Password changed for user id={}", id);
    }

    @Transactional
    public void requestPasswordReset(String email) {
        // Always behave the same whether or not the email exists, to avoid
        // leaking which addresses are registered. Only publish an email when
        // we actually find a matching active user.
        userRepository.findByEmail(email).ifPresent(user -> {
            if (!user.isActive()) {
                LOGGER.info("Skipping password reset for inactive user id={}", user.getId());
                return;
            }
            String token = generateToken();
            PasswordResetToken entity = new PasswordResetToken();
            entity.setId(UUID.randomUUID().toString());
            entity.setUserId(user.getId());
            entity.setTokenHash(sha256(token));
            entity.setExpiresAt(Instant.now().plus(RESET_TOKEN_TTL_MINUTES, ChronoUnit.MINUTES));
            entity.setUsed(false);
            passwordResetTokenRepository.save(entity);

            userEventPublisher.publishPasswordResetRequested(new PasswordResetRequestedEvent(
                    user.getEmail(), displayName(user), token, entity.getExpiresAt()));
            LOGGER.info("Issued password reset token for user id={}", user.getId());
        });
    }

    @Transactional
    public void resetPassword(PasswordResetConfirmRequest request) {
        PasswordResetToken token = passwordResetTokenRepository.findByTokenHash(sha256(request.getToken()))
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired reset link"));

        if (token.isUsed() || token.getExpiresAt().isBefore(Instant.now())) {
            throw new IllegalArgumentException("Invalid or expired reset link");
        }

        UserEntity user = userRepository.findById(token.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired reset link"));

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);

        token.setUsed(true);
        passwordResetTokenRepository.save(token);
        LOGGER.info("Password reset completed for user id={}", user.getId());
    }

    private static String displayName(UserEntity user) {
        if (user.getFullName() != null && !user.getFullName().isBlank()) {
            return user.getFullName();
        }
        return user.getUsername();
    }

    private static String generateToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 not available", ex);
        }
    }

    @Transactional
    public UserDto deactivate(String id) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + id));
        user.setActive(false);
        user.setUpdatedAt(Instant.now());
        return toDto(userRepository.save(user));
    }

    private UserDto toDto(UserEntity entity) {
        UserDto dto = new UserDto();
        dto.setId(entity.getId());
        dto.setUsername(entity.getUsername());
        dto.setEmail(entity.getEmail());
        dto.setFullName(entity.getFullName());
        dto.setPhone(entity.getPhone());
        dto.setAvatar(entity.getAvatar());
        dto.setActive(entity.isActive());
        return dto;
    }

    private UserCredentialsResponse toCredentialsResponse(UserEntity user) {
        return new UserCredentialsResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRoles().stream().map(Enum::name).toList(),
                user.isActive()
        );
    }
}
