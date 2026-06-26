package com.inha.netzero.domain.user.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.inha.netzero.domain.user.dto.GhostModeRequest;
import com.inha.netzero.domain.user.dto.GhostModeResponse;
import com.inha.netzero.domain.user.dto.LocationResponse;
import com.inha.netzero.domain.user.dto.LocationUpdateRequest;
import com.inha.netzero.domain.user.dto.UserMeResponse;
import com.inha.netzero.domain.user.dto.UserProfileResponse;
import com.inha.netzero.domain.user.dto.UserUpdateRequest;
import com.inha.netzero.domain.user.service.UserService;
import com.inha.netzero.global.response.ApiResponse;
import com.inha.netzero.global.security.CurrentUserId;

import jakarta.validation.Valid;

/**
 * 사용자/온보딩/위치 API(api-spec §2). 모든 엔드포인트 인증 필요.
 * 본인 식별은 @CurrentUserId 로 주입된 userId 를 사용한다.
 */
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    /** 2.1 본인 전체 정보. */
    @GetMapping("/me")
    public ApiResponse<UserMeResponse> getMe(@CurrentUserId Long userId) {
        return ApiResponse.success(userService.getMe(userId));
    }

    /** 2.2 온보딩/프로필 수정. */
    @PatchMapping("/me")
    public ApiResponse<UserMeResponse> updateMe(@CurrentUserId Long userId,
                                                @Valid @RequestBody UserUpdateRequest request) {
        return ApiResponse.success(userService.updateProfile(userId, request));
    }

    /** 2.3 위치 갱신. */
    @PatchMapping("/me/location")
    public ApiResponse<LocationResponse> updateLocation(@CurrentUserId Long userId,
                                                        @Valid @RequestBody LocationUpdateRequest request) {
        return ApiResponse.success(userService.updateLocation(userId, request));
    }

    /** 2.4 고스트모드 토글. */
    @PatchMapping("/me/ghost-mode")
    public ApiResponse<GhostModeResponse> updateGhostMode(@CurrentUserId Long userId,
                                                          @Valid @RequestBody GhostModeRequest request) {
        return ApiResponse.success(userService.updateGhostMode(userId, request));
    }

    /** 2.5 타인 공개 프로필. 인증은 필요하나 응답에 위치는 포함하지 않는다. */
    @GetMapping("/{id}")
    public ApiResponse<UserProfileResponse> getProfile(@CurrentUserId Long userId,
                                                       @PathVariable Long id) {
        return ApiResponse.success(userService.getPublicProfile(id));
    }
}
