package com.sterling.ewallet.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class UpdateProfileRequest {

    private static final int MAX_AVATAR_LENGTH = 700_000;

    @Size(max = 120)
    private String fullName;

    @Email
    private String email;

    @Pattern(regexp = "^[+0-9 ()-]{6,20}$", message = "Invalid phone format")
    private String phone;

    private String avatar;

    public UpdateProfileRequest() {
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getAvatar() {
        return avatar;
    }

    public void setAvatar(String avatar) {
        if (avatar != null && avatar.length() > MAX_AVATAR_LENGTH) {
            throw new IllegalArgumentException("Avatar image is too large (max ~512 KB)");
        }
        this.avatar = avatar;
    }
}
