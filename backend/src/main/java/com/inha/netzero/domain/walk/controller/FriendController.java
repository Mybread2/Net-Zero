package com.inha.netzero.domain.walk.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.inha.netzero.domain.walk.dto.FriendProfileResponse;
import com.inha.netzero.domain.walk.dto.FriendRequestCreateRequest;
import com.inha.netzero.domain.walk.dto.FriendRequestItemResponse;
import com.inha.netzero.domain.walk.dto.FriendRequestResponse;
import com.inha.netzero.domain.walk.dto.FriendResponse;
import com.inha.netzero.domain.walk.service.FriendService;
import com.inha.netzero.global.response.ApiResponse;
import com.inha.netzero.global.security.CurrentUserId;

import jakarta.validation.Valid;

/**
 * 친구 API(§4). 모두 인증 필요. 본인은 @CurrentUserId 로 주입한다.
 */
@RestController
@RequestMapping("/api/friends")
public class FriendController {

    private final FriendService friendService;

    public FriendController(FriendService friendService) {
        this.friendService = friendService;
    }

    /** 4.1 친구 요청 보내기. */
    @PostMapping("/requests")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<FriendRequestResponse> sendRequest(@CurrentUserId Long userId,
                                                          @Valid @RequestBody FriendRequestCreateRequest request) {
        return ApiResponse.success(friendService.sendRequest(userId, request.addresseeId()));
    }

    /** 4.2 친구 요청 수락. */
    @PostMapping("/requests/{id}/accept")
    public ApiResponse<FriendRequestResponse> accept(@CurrentUserId Long userId, @PathVariable Long id) {
        return ApiResponse.success(friendService.respond(userId, id, true));
    }

    /** 4.3 친구 요청 거절. */
    @PostMapping("/requests/{id}/reject")
    public ApiResponse<FriendRequestResponse> reject(@CurrentUserId Long userId, @PathVariable Long id) {
        return ApiResponse.success(friendService.respond(userId, id, false));
    }

    /** 4.4 보낸 요청 목록(PENDING). */
    @GetMapping("/requests/sent")
    public ApiResponse<List<FriendRequestItemResponse>> sent(@CurrentUserId Long userId) {
        return ApiResponse.success(friendService.getSentRequests(userId));
    }

    /** 4.5 받은 요청 목록(PENDING). */
    @GetMapping("/requests/received")
    public ApiResponse<List<FriendRequestItemResponse>> received(@CurrentUserId Long userId) {
        return ApiResponse.success(friendService.getReceivedRequests(userId));
    }

    /** 4.6 친구 목록(online 우선). */
    @GetMapping
    public ApiResponse<List<FriendResponse>> friends(@CurrentUserId Long userId) {
        return ApiResponse.success(friendService.getFriends(userId));
    }

    /** 4.7 친구 상세(친구 관계인 경우만). */
    @GetMapping("/{userId}")
    public ApiResponse<FriendProfileResponse> friendDetail(@CurrentUserId Long currentUserId,
                                                           @PathVariable Long userId) {
        return ApiResponse.success(friendService.getFriendProfile(currentUserId, userId));
    }
}
