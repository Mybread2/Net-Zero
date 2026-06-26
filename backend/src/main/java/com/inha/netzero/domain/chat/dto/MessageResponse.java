package com.inha.netzero.domain.chat.dto;

import java.time.Instant;

import com.inha.netzero.domain.chat.entity.ChatMessage;

/**
 * 메시지 응답(5.3/5.4/5.5). createdAt 이 송신 시각이며 ?after= 폴링 기준이 된다.
 */
public record MessageResponse(
        Long messageId,
        Long senderId,
        String content,
        Instant createdAt) {

    public static MessageResponse from(ChatMessage message) {
        return new MessageResponse(
                message.getId(),
                message.getSender().getId(),
                message.getContent(),
                message.getCreatedAt());
    }
}
