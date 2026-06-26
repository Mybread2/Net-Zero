package com.inha.netzero.domain.walk.dto;

import jakarta.validation.constraints.NotNull;

/**
 * 4.1 친구 요청 보내기 요청 바디. 본인(userId)은 토큰에서 받으므로 상대 id 만 받는다.
 */
public record FriendRequestCreateRequest(

        @NotNull(message = "addresseeId 는 필수입니다.")
        Long addresseeId
) {
}
