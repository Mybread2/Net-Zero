package com.inha.netzero.domain.walk.repository;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.inha.netzero.domain.walk.entity.FriendRequest;
import com.inha.netzero.domain.walk.entity.FriendRequestStatus;

/**
 * 친구 요청 영속 계층. 상대 User 자체는 UserRepository 로 로드하고,
 * 여기서는 요청 행과 상대의 userId 추출만 담당한다.
 */
public interface FriendRequestRepository extends JpaRepository<FriendRequest, Long> {

    /**
     * 두 사용자 사이에 지정한 상태의 요청이 (방향 무관) 존재하는지.
     * 4.1 중복 요청/친구 확인(PENDING|ACCEPTED), 4.7 친구 관계 확인(ACCEPTED)에 사용.
     */
    @Query("""
            select (count(fr) > 0) from FriendRequest fr
            where ((fr.requester.id = :userA and fr.addressee.id = :userB)
                or (fr.requester.id = :userB and fr.addressee.id = :userA))
              and fr.status in :statuses
            """)
    boolean existsBetweenWithStatus(@Param("userA") Long userA,
                                    @Param("userB") Long userB,
                                    @Param("statuses") Collection<FriendRequestStatus> statuses);

    /** 4.4 보낸 요청: 본인이 requester 인 행(최신순). */
    List<FriendRequest> findByRequesterIdAndStatusOrderByCreatedAtDesc(Long requesterId, FriendRequestStatus status);

    /** 4.5 받은 요청: 본인이 addressee 인 행(최신순). */
    List<FriendRequest> findByAddresseeIdAndStatusOrderByCreatedAtDesc(Long addresseeId, FriendRequestStatus status);

    /**
     * 4.6 친구 목록: requester=본인 또는 addressee=본인 인 지정 상태 행에서 "상대"의 userId 를 추출.
     */
    @Query("""
            select case when fr.requester.id = :userId then fr.addressee.id else fr.requester.id end
            from FriendRequest fr
            where fr.status = :status
              and (fr.requester.id = :userId or fr.addressee.id = :userId)
            """)
    List<Long> findCounterpartIdsByStatus(@Param("userId") Long userId,
                                          @Param("status") FriendRequestStatus status);
}
