package com.inha.netzero.domain.user.dto;

import jakarta.validation.constraints.NotNull;

/**
 * 고스트모드 토글 요청(2.4).
 */
public record GhostModeRequest(
        @NotNull Boolean enabled) {
}
