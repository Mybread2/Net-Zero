package com.inha.netzero.domain.chat.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * 메시지 전송 요청(5.4 REST 폴백). content 는 비어 있을 수 없다.
 */
public record MessageSendRequest(@NotBlank String content) {
}
