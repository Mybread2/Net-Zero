package com.inha.netzero.domain.chat.dto;

import jakarta.validation.constraints.NotNull;

/**
 * 대화방 생성/조회 요청(5.2). 두 사용자 간 방은 idempotent 하게 한 개만 존재한다.
 */
public record ChatRoomCreateRequest(@NotNull Long targetUserId) {
}
