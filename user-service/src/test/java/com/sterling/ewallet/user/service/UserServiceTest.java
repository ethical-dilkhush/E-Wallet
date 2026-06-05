package com.sterling.ewallet.user.service;

import com.sterling.ewallet.common.dto.UserDto;
import com.sterling.ewallet.user.dto.UserCredentialsRequest;
import com.sterling.ewallet.user.dto.UserCredentialsResponse;
import com.sterling.ewallet.user.dto.UserRegistrationRequest;
import com.sterling.ewallet.user.entity.UserEntity;
import com.sterling.ewallet.user.exception.UserAlreadyExistsException;
import com.sterling.ewallet.user.exception.UserNotFoundException;
import com.sterling.ewallet.user.messaging.UserEventPublisher;
import com.sterling.ewallet.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private UserEventPublisher userEventPublisher;

    @InjectMocks
    private UserService userService;

    private UserRegistrationRequest validRequest;

    @BeforeEach
    void setUp() {
        validRequest = new UserRegistrationRequest();
        validRequest.setUsername("alice");
        validRequest.setEmail("alice@example.com");
        validRequest.setPassword("password123");
        validRequest.setFullName("Alice Smith");
        validRequest.setPhone("+1 555 0100");
    }

    @Test
    void register_persistsUser_andPublishesEvent() {
        when(userRepository.existsByUsername("alice")).thenReturn(false);
        when(userRepository.existsByEmail("alice@example.com")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed-pass");
        when(userRepository.save(any(UserEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        UserDto result = userService.register(validRequest);

        assertThat(result.getId()).startsWith("USR-");
        assertThat(result.getUsername()).isEqualTo("alice");
        assertThat(result.isActive()).isTrue();
        verify(userEventPublisher).publishUserRegistered(any());
    }

    @Test
    void register_throws_whenUsernameTaken() {
        when(userRepository.existsByUsername("alice")).thenReturn(true);
        assertThatThrownBy(() -> userService.register(validRequest))
                .isInstanceOf(UserAlreadyExistsException.class)
                .hasMessageContaining("Username");
        verify(userEventPublisher, never()).publishUserRegistered(any());
    }

    @Test
    void verifyCredentials_succeeds_whenPasswordMatches() {
        UserEntity entity = new UserEntity();
        entity.setId("USR-01TESTUSER0000000000001");
        entity.setUsername("alice");
        entity.setEmail("alice@example.com");
        entity.setPasswordHash("hashed");
        entity.setActive(true);
        entity.setRoles(Set.of(UserEntity.Role.USER));
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(entity));
        when(passwordEncoder.matches("password123", "hashed")).thenReturn(true);

        UserCredentialsRequest req = new UserCredentialsRequest();
        req.setUsername("alice");
        req.setPassword("password123");
        UserCredentialsResponse resp = userService.verifyCredentials(req);

        assertThat(resp.getUserId()).isEqualTo("USR-01TESTUSER0000000000001");
        assertThat(resp.getRoles()).contains("USER");
        assertThat(resp.isActive()).isTrue();
    }

    @Test
    void verifyCredentials_throws_whenPasswordInvalid() {
        UserEntity entity = new UserEntity();
        entity.setUsername("alice");
        entity.setPasswordHash("hashed");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(entity));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(false);

        UserCredentialsRequest req = new UserCredentialsRequest();
        req.setUsername("alice");
        req.setPassword("wrong");
        assertThatThrownBy(() -> userService.verifyCredentials(req))
                .isInstanceOf(UserNotFoundException.class);
    }
}
