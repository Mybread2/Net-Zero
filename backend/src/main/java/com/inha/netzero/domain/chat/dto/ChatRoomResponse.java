package com.inha.netzero.domain.chat.dto;

import java.time.Instant;

/**
 * 대화방 목록 항목(5.1). lastMessageAt desc 로 정렬되어 내려간다.
 * lastMessage 는 마지막 메시지 미리보기(없으면 null).
 */
public record ChatRoomResponse(
        Long roomId,
        ChatPartnerResponse partner,
        String lastMessage,
        Instant lastMessageAt) {
}
