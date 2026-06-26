package com.inha.netzero.domain.chat.service;

import java.time.Instant;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.inha.netzero.domain.chat.dto.ChatPartnerResponse;
import com.inha.netzero.domain.chat.dto.ChatRoomResponse;
import com.inha.netzero.domain.chat.dto.MessageResponse;
import com.inha.netzero.domain.chat.dto.RoomIdResponse;
import com.inha.netzero.domain.chat.entity.ChatMessage;
import com.inha.netzero.domain.chat.entity.ChatRoom;
import com.inha.netzero.domain.chat.repository.ChatMessageRepository;
import com.inha.netzero.domain.chat.repository.ChatRoomRepository;
import com.inha.netzero.domain.user.entity.Dog;
import com.inha.netzero.domain.user.entity.User;
import com.inha.netzero.domain.user.repository.UserRepository;
import com.inha.netzero.global.exception.BusinessException;
import com.inha.netzero.global.exception.ErrorCode;
import com.inha.netzero.global.response.PageResponse;

/**
 * 1:1 채팅 비즈니스 로직. 방 생성/조회는 정규화 키(min,max)로 idempotent 하게 처리하고,
 * 메시지 전송은 REST(5.4)·STOMP(5.5) 가 공유한다(검증·room.touch 포함).
 */
@Service
@Transactional(readOnly = true)
public class ChatService {

    private final ChatRoomRepository chatRoomRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;

    public ChatService(ChatRoomRepository chatRoomRepository,
                       ChatMessageRepository chatMessageRepository,
                       UserRepository userRepository) {
        this.chatRoomRepository = chatRoomRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.userRepository = userRepository;
    }

    /** 5.1 본인 참여 방 목록(lastMessageAt desc). */
    public List<ChatRoomResponse> getRooms(Long userId) {
        return chatRoomRepository.findRoomsByParticipant(userId).stream()
                .map(room -> toRoomResponse(room, userId))
                .toList();
    }

    /** 5.2 대화방 생성/조회. 정규화 키로 있으면 반환, 없으면 생성(idempotent). */
    @Transactional
    public RoomIdResponse createOrGetRoom(Long userId, Long targetUserId) {
        if (targetUserId.equals(userId)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "본인에게는 대화방을 만들 수 없습니다.");
        }
        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "상대 사용자를 찾을 수 없습니다."));

        long aId = Math.min(userId, targetUserId);
        long bId = Math.max(userId, targetUserId);
        ChatRoom room = chatRoomRepository.findByUserAIdAndUserBId(aId, bId)
                .orElseGet(() -> {
                    User me = userRepository.findById(userId)
                            .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
                    User userA = aId == userId ? me : target;
                    User userB = bId == userId ? me : target;
                    return chatRoomRepository.save(new ChatRoom(userA, userB));
                });
        return new RoomIdResponse(room.getId());
    }

    /** 5.3 메시지 조회. 방 참여자만 접근 가능. after 지정 시 그 id 이후만(폴링). */
    public PageResponse<MessageResponse> getMessages(Long userId, Long roomId, Long after, int page, int size) {
        getRoomForParticipant(roomId, userId);
        Pageable pageable = PageRequest.of(page, size);
        Page<ChatMessage> messages = (after != null)
                ? chatMessageRepository.findByRoomIdAndIdGreaterThanOrderByIdAsc(roomId, after, pageable)
                : chatMessageRepository.findByRoomIdOrderByIdDesc(roomId, pageable);
        return PageResponse.of(messages.map(MessageResponse::from));
    }

    /** 5.4/5.5 메시지 전송. 저장 후 방 정렬 기준(lastMessageAt) 갱신. */
    @Transactional
    public MessageResponse sendMessage(Long userId, Long roomId, String content) {
        if (content == null || content.isBlank()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "메시지 내용이 비어 있습니다.");
        }
        ChatRoom room = getRoomForParticipant(roomId, userId);
        User sender = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));

        ChatMessage saved = chatMessageRepository.save(new ChatMessage(room, sender, content));
        room.touch(Instant.now());
        return MessageResponse.from(saved);
    }

    private ChatRoomResponse toRoomResponse(ChatRoom room, Long userId) {
        User partner = partnerOf(room, userId);
        String lastMessage = chatMessageRepository.findFirstByRoomIdOrderByIdDesc(room.getId())
                .map(ChatMessage::getContent)
                .orElse(null);
        ChatPartnerResponse partnerResponse = new ChatPartnerResponse(
                partner.getId(), partner.getNickname(), profileImageUrl(partner));
        return new ChatRoomResponse(room.getId(), partnerResponse, lastMessage, room.getLastMessageAt());
    }

    private ChatRoom getRoomForParticipant(Long roomId, Long userId) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "대화방을 찾을 수 없습니다."));
        if (!isParticipant(room, userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "대화방 참여자만 접근할 수 있습니다.");
        }
        return room;
    }

    private boolean isParticipant(ChatRoom room, Long userId) {
        return room.getUserA().getId().equals(userId) || room.getUserB().getId().equals(userId);
    }

    private User partnerOf(ChatRoom room, Long userId) {
        return room.getUserA().getId().equals(userId) ? room.getUserB() : room.getUserA();
    }

    /** profileImageUrl 폴백: 사용자 이미지 → 없으면 첫 강아지 이미지. */
    private String profileImageUrl(User user) {
        if (user.getProfileImageUrl() != null) {
            return user.getProfileImageUrl();
        }
        return user.getDogs().stream()
                .findFirst()
                .map(Dog::getImageUrl)
                .orElse(null);
    }
}
