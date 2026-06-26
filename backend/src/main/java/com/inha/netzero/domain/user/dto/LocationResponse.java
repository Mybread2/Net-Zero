package com.inha.netzero.domain.user.dto;

import java.time.Instant;

/**
 * 위치 갱신 응답(2.3). 저장된 좌표와 동시 갱신된 lastActiveAt.
 */
public record LocationResponse(
        Double lat,
        Double lng,
        Instant lastActiveAt) {
}
