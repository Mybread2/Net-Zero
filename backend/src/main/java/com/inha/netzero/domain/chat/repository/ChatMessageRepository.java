package com.inha.netzero.domain.chat.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.inha.netzero.domain.chat.entity.ChatMessage;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    /** 방 메시지 최신순 페이징(after 미지정 시). */
    Page<ChatMessage> findByRoomIdOrderByIdDesc(Long roomId, Pageable pageable);

    /** after(메시지 id) 이후 메시지 오름차순(폴링 폴백용). */
    Page<ChatMessage> findByRoomIdAndIdGreaterThanOrderByIdAsc(Long roomId, Long after, Pageable pageable);

    /** 방 목록의 마지막 메시지 미리보기용. */
    Optional<ChatMessage> findFirstByRoomIdOrderByIdDesc(Long roomId);
}
