package com.inha.netzero.domain.chat.controller;

import java.security.Principal;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import com.inha.netzero.domain.chat.dto.ChatSendRequest;
import com.inha.netzero.domain.chat.dto.MessageResponse;
import com.inha.netzero.domain.chat.service.ChatService;

/**
 * STOMP 실시간 송수신(5.5). SEND /app/chat.send 로 받은 메시지를 저장한 뒤
 * /topic/rooms/{roomId} 구독자에게 브로드캐스트한다.
 * Principal(userId)은 StompAuthChannelInterceptor 가 CONNECT 시 심어준다.
 */
@Controller
public class ChatStompController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    public ChatStompController(ChatService chatService, SimpMessagingTemplate messagingTemplate) {
        this.chatService = chatService;
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/chat.send")
    public void send(ChatSendRequest request, Principal principal) {
        Long userId = Long.valueOf(principal.getName());
        MessageResponse message = chatService.sendMessage(userId, request.roomId(), request.content());
        messagingTemplate.convertAndSend("/topic/rooms/" + request.roomId(), message);
    }
}
