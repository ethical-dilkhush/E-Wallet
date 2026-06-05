package com.sterling.ewallet.transaction.client;

import com.sterling.ewallet.common.dto.ApiResponse;
import com.sterling.ewallet.common.dto.UserDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "user-service", path = "/api/users")
public interface UserClient {

    @GetMapping("/{id}")
    ApiResponse<UserDto> getUser(@PathVariable("id") String id);
}
