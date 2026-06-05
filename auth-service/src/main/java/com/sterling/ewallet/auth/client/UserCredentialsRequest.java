package com.sterling.ewallet.auth.client;

public class UserCredentialsRequest {

    private String username;
    private String password;

    public UserCredentialsRequest() {
    }

    public UserCredentialsRequest(String username, String password) {
        this.username = username;
        this.password = password;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
