package com.inha.netzero.domain.chat.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.inha.netzero.domain.chat.dto.ChatRoomCreateRequest;
import com.inha.netzero.domain.chat.dto.ChatRoomResponse;
import com.inha.netzero.domain.chat.dto.MessageResponse;
import com.inha.netzero.domain.chat.dto.MessageSendRequest;
import com.inha.netzero.domain.chat.dto.RoomIdResponse;
import com.inha.netzero.domain.chat.service.ChatService;
import com.inha.netzero.global.response.ApiResponse;
import com.inha.netzero.global.response.PageResponse;
import com.inha.netzero.global.security.CurrentUserId;

import jakarta.validation.Valid;

/**
 * 1:1 채팅 REST(5.1~5.4). 실시간 송수신은 STOMP(5.5, ChatStompController) 권장,
 * 본 REST 전송(5.4)+조회 폴링(5.3 ?after=) 은 WebSocket 불가 환경의 폴백 경로다.
 */
@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    /** 5.1 대화방 목록. */
    @GetMapping("/rooms")
    public ApiResponse<List<ChatRoomResponse>> getRooms(@CurrentUserId Long userId) {
        return ApiResponse.success(chatService.getRooms(userId));
    }

    /** 5.2 대화방 생성/조회(idempotent). */
    @PostMapping("/rooms")
    public ApiResponse<RoomIdResponse> createRoom(@CurrentUserId Long userId,
                                                  @Valid @RequestBody ChatRoomCreateRequest request) {
        return ApiResponse.success(chatService.createOrGetRoom(userId, request.targetUserId()));
    }

    /** 5.3 메시지 조회(페이징/폴링). */
    @GetMapping("/rooms/{roomId}/messages")
    public ApiResponse<PageResponse<MessageResponse>> getMessages(
            @CurrentUserId Long userId,
            @PathVariable Long roomId,
            @RequestParam(required = false) Long after,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.success(chatService.getMessages(userId, roomId, after, page, size));
    }

    /** 5.4 메시지 전송(REST 폴백). */
    @PostMapping("/rooms/{roomId}/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<MessageResponse> sendMessage(
            @CurrentUserId Long userId,
            @PathVariable Long roomId,
            @Valid @RequestBody MessageSendRequest request) {
        return ApiResponse.success(chatService.sendMessage(userId, roomId, request.content()));
    }
}
