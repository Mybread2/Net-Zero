package com.inha.netzero.domain.walk.dto;

import java.time.Instant;

/**
 * 근처 사람 목록(3.1) 한 건. 본인 좌표 기준 거리(distanceMeters)를 포함하며 거리 오름차순으로 정렬된다.
 * profileImageUrl 은 사용자 이미지가 없으면 첫 강아지 이미지로 폴백한다.
 */
public record NearbyUserResponse(
        Long userId,
        String nickname,
        String profileImageUrl,
        Instant lastActiveAt,
        long distanceMeters,
        boolean online
) {
}
