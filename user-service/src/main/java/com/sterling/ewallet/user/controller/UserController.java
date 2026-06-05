package com.sterling.ewallet.user.controller;

import com.sterling.ewallet.common.dto.ApiResponse;
import com.sterling.ewallet.common.dto.UserDto;
import com.sterling.ewallet.user.dto.UserRegistrationRequest;
import com.sterling.ewallet.user.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserDto>> register(@Valid @RequestBody UserRegistrationRequest request) {
        UserDto user = userService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("User registered successfully", user));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<UserDto>>> search(@RequestParam("q") String query) {
        // Username autocomplete inherently surfaces other users, so only expose
        // safe public fields (never email/phone).
        List<UserDto> results = userService.searchByUsername(query).stream()
                .map(UserController::publicView)
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(results));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserDto>> getById(
            @PathVariable String id,
            @RequestHeader(value = "X-User-Id", required = false) String callerId) {
        UserDto user = userService.getById(id);
        // Full profile only to the owner; everyone else gets the public view.
        if (callerId != null && callerId.equals(id)) {
            return ResponseEntity.ok(ApiResponse.ok(user));
        }
        return ResponseEntity.ok(ApiResponse.ok(publicView(user)));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserDto>> me(@RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(ApiResponse.ok(userService.getById(userId)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<UserDto>> deactivate(
            @PathVariable String id,
            @RequestHeader("X-User-Id") String callerId) {
        if (!id.equals(callerId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("You can only deactivate your own account"));
        }
        return ResponseEntity.ok(ApiResponse.ok("User deactivated", userService.deactivate(id)));
    }

    private static UserDto publicView(UserDto u) {
        UserDto v = new UserDto();
        v.setId(u.getId());
        v.setUsername(u.getUsername());
        v.setFullName(u.getFullName());
        v.setActive(u.isActive());
        return v;
    }
}
