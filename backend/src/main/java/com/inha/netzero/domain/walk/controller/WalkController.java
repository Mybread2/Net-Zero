package com.inha.netzero.domain.walk.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.inha.netzero.domain.walk.dto.MapUserResponse;
import com.inha.netzero.domain.walk.dto.NearbyUserResponse;
import com.inha.netzero.domain.walk.service.WalkService;
import com.inha.netzero.global.response.ApiResponse;
import com.inha.netzero.global.security.CurrentUserId;

/**
 * 산책 매칭(위치/근처) API. 본인은 @CurrentUserId 로 주입되며 모든 엔드포인트는 인증이 필요하다.
 */
@RestController
@RequestMapping("/api/walk")
public class WalkController {

    private final WalkService walkService;

    public WalkController(WalkService walkService) {
        this.walkService = walkService;
    }

    /** 3.1 근처 사람 목록 — 본인 좌표 기준 반경 내, 거리 오름차순. */
    @GetMapping("/nearby")
    public ApiResponse<List<NearbyUserResponse>> nearby(
            @CurrentUserId Long userId,
            @RequestParam(defaultValue = "2000") int radius) {
        return ApiResponse.success(walkService.findNearby(userId, radius));
    }

    /** 3.2 지도 실시간 핀 — 반경 내 online 사용자(좌표 포함). */
    @GetMapping("/map-users")
    public ApiResponse<List<MapUserResponse>> mapUsers(
            @CurrentUserId Long userId,
            @RequestParam(defaultValue = "2000") int radius) {
        return ApiResponse.success(walkService.findMapUsers(userId, radius));
    }
}
