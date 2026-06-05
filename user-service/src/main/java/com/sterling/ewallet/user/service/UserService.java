package com.sterling.ewallet.user.service;

import com.sterling.ewallet.common.dto.UserDto;
import com.sterling.ewallet.common.events.UserRegisteredEvent;
import com.sterling.ewallet.common.id.Ids;
import com.sterling.ewallet.user.dto.UserCredentialsRequest;
import com.sterling.ewallet.user.dto.UserCredentialsResponse;
import com.sterling.ewallet.user.dto.UserRegistrationRequest;
import com.sterling.ewallet.user.entity.UserEntity;
import com.sterling.ewallet.user.exception.UserAlreadyExistsException;
import com.sterling.ewallet.user.exception.UserNotFoundException;
import com.sterling.ewallet.user.messaging.UserEventPublisher;
import com.sterling.ewallet.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Set;

@Service
public class UserService {

    private static final Logger LOGGER = LoggerFactory.getLogger(UserService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserEventPublisher userEventPublisher;

    public UserService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       UserEventPublisher userEventPublisher) {
        this.userRepository = userRepository;
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
