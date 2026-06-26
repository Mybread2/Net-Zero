package com.inha.netzero.domain.chat.dto;

/**
 * STOMP 송신 프레임 body(5.5). SEND /app/chat.send { roomId, content }.
 * 검증은 ChatService.sendMessage 에서 공통 처리한다(REST/STOMP 동일 경로).
 */
public record ChatSendRequest(Long roomId, String content) {
}
