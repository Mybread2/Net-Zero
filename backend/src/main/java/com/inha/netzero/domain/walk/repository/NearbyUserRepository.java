package com.inha.netzero.domain.walk.repository;

import java.time.Instant;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.inha.netzero.domain.user.entity.User;

/**
 * 근처/지도 조회용 사용자 1차 후보 조회. 거리(Haversine) 계산은 DB 함수 차이를 피하려고
 * {@code WalkService} 의 Java 에서 수행하므로, 여기서는 반경과 무관한 필터만 DB 에서 거른다.
 * <p>UserRepository 와 같은 {@code User} 엔티티를 다루지만 walk 도메인 전용 커스텀 쿼리이므로 분리한다.
 */
public interface NearbyUserRepository extends JpaRepository<User, Long> {

    /**
     * 비고스트 + 좌표 보유 + 본인 제외 + 최근 활동(lastActiveAt &gt;= threshold) 후보를 조회한다.
     * threshold 만 바꿔 근처(24시간)와 지도(5분) 양쪽에서 재사용한다.
     */
    @Query("select u from User u "
            + "where u.ghostMode = false "
            + "and u.lat is not null and u.lng is not null "
            + "and u.id <> :me "
            + "and u.lastActiveAt >= :threshold")
    List<User> findActiveCandidates(@Param("me") Long me, @Param("threshold") Instant threshold);
}
