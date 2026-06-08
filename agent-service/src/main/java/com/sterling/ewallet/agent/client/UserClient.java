package com.sterling.ewallet.agent.client;

import com.sterling.ewallet.common.dto.ApiResponse;
import com.sterling.ewallet.common.dto.UserDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;

@FeignClient(name = "user-service")
public interface UserClient {

    @GetMapping("/api/users/me")
    ApiResponse<UserDto> me(@RequestHeader("X-User-Id") String userId);

    @GetMapping("/api/users/{id}")
    ApiResponse<UserDto> getById(@PathVariable("id") String id,
                                 @RequestHeader("X-User-Id") String callerId);
}
