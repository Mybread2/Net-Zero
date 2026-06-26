package com.inha.netzero.domain.chat.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.inha.netzero.domain.chat.entity.ChatRoom;

public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {

    /**
     * 정규화 키(userA.id &lt; userB.id) 로 두 사용자 간 방을 조회한다.
     * 서비스에서 min/max 로 정규화한 뒤 호출해 idempotent 생성을 보장한다.
     */
    Optional<ChatRoom> findByUserAIdAndUserBId(Long userAId, Long userBId);

    /**
     * 본인이 참여(userA 또는 userB)한 방을 lastMessageAt 최신순으로 조회한다.
     * 아직 메시지가 없는 방(lastMessageAt == null)은 뒤로 보낸다.
     */
    @Query("select r from ChatRoom r "
            + "where r.userA.id = :userId or r.userB.id = :userId "
            + "order by r.lastMessageAt desc nulls last")
    List<ChatRoom> findRoomsByParticipant(@Param("userId") Long userId);
}
