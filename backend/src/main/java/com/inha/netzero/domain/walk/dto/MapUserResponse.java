package com.inha.netzero.domain.walk.dto;

/**
 * 지도 실시간 핀(3.2) 한 건. 지도 렌더용으로 좌표(lat/lng)를 포함한다.
 * online(최근 5분) 사용자만 노출되므로 online 은 항상 true 다.
 */
public record MapUserResponse(
        Long userId,
        String nickname,
        String profileImageUrl,
        double lat,
        double lng,
        boolean online
) {
}
