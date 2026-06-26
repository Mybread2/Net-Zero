package com.inha.netzero.domain.walk.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.inha.netzero.domain.user.entity.Dog;
import com.inha.netzero.domain.user.entity.User;
import com.inha.netzero.domain.walk.dto.MapUserResponse;
import com.inha.netzero.domain.walk.dto.NearbyUserResponse;
import com.inha.netzero.domain.walk.repository.NearbyUserRepository;
import com.inha.netzero.global.exception.BusinessException;
import com.inha.netzero.global.exception.ErrorCode;

/**
 * 산책 매칭(근처/지도) 조회. DB 에서는 반경과 무관한 1차 후보만 거르고,
 * 거리(Haversine)는 H2/Postgres 함수 차이를 피하려고 여기 Java 에서 계산해 반경 필터·정렬한다.
 */
@Service
public class WalkService {

    /** 근처 사람: 최근 24시간 활동. */
    private static final long NEARBY_WINDOW_SECONDS = 24 * 60 * 60;
    /** 지도/온라인: 최근 5분 활동. */
    private static final long ONLINE_WINDOW_SECONDS = 300;
    /** 지구 반지름(m). */
    private static final double EARTH_RADIUS_METERS = 6_371_000.0;

    private final NearbyUserRepository nearbyUserRepository;

    public WalkService(NearbyUserRepository nearbyUserRepository) {
        this.nearbyUserRepository = nearbyUserRepository;
    }

    /** 3.1 근처 사람: 반경 내 + 24시간 이내 활동 + 비고스트 + 본인 제외, 거리 오름차순. */
    @Transactional(readOnly = true)
    public List<NearbyUserResponse> findNearby(Long userId, int radiusMeters) {
        User me = loadMeWithLocation(userId);
        Instant threshold = Instant.now().minusSeconds(NEARBY_WINDOW_SECONDS);

        List<NearbyUserResponse> result = new ArrayList<>();
        for (User u : nearbyUserRepository.findActiveCandidates(userId, threshold)) {
            double distance = haversineMeters(me.getLat(), me.getLng(), u.getLat(), u.getLng());
            if (distance <= radiusMeters) {
                result.add(new NearbyUserResponse(
                        u.getId(),
                        u.getNickname(),
                        resolveProfileImageUrl(u),
                        u.getLastActiveAt(),
                        Math.round(distance),
                        isOnline(u)));
            }
        }
        result.sort(Comparator.comparingLong(NearbyUserResponse::distanceMeters));
        return result;
    }

    /** 3.2 지도 핀: 반경 내 + online(최근 5분) + 비고스트 + 본인 제외(좌표 포함). */
    @Transactional(readOnly = true)
    public List<MapUserResponse> findMapUsers(Long userId, int radiusMeters) {
        User me = loadMeWithLocation(userId);
        Instant threshold = Instant.now().minusSeconds(ONLINE_WINDOW_SECONDS);

        List<MapUserResponse> result = new ArrayList<>();
        for (User u : nearbyUserRepository.findActiveCandidates(userId, threshold)) {
            double distance = haversineMeters(me.getLat(), me.getLng(), u.getLat(), u.getLng());
            if (distance <= radiusMeters) {
                result.add(new MapUserResponse(
                        u.getId(),
                        u.getNickname(),
                        resolveProfileImageUrl(u),
                        u.getLat(),
                        u.getLng(),
                        isOnline(u)));
            }
        }
        return result;
    }

    /** 본인 엔티티 로드 + 좌표 검증. 좌표가 없으면 위치 갱신을 안내한다. */
    private User loadMeWithLocation(Long userId) {
        User me = nearbyUserRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "사용자를 찾을 수 없습니다."));
        if (me.getLat() == null || me.getLng() == null) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "위치를 먼저 갱신하세요");
        }
        return me;
    }

    /** 공통 규칙: lastActiveAt 이 최근 5분 이내면 online. */
    private boolean isOnline(User user) {
        Instant lastActiveAt = user.getLastActiveAt();
        return lastActiveAt != null
                && lastActiveAt.isAfter(Instant.now().minusSeconds(ONLINE_WINDOW_SECONDS));
    }

    /** 공통 규칙: 사용자 프로필 이미지가 없으면 첫 강아지 이미지로 폴백한다. */
    private String resolveProfileImageUrl(User user) {
        if (user.getProfileImageUrl() != null) {
            return user.getProfileImageUrl();
        }
        List<Dog> dogs = user.getDogs();
        if (dogs != null && !dogs.isEmpty()) {
            return dogs.get(0).getImageUrl();
        }
        return null;
    }

    /**
     * 두 좌표 사이의 거리(m)를 Haversine(구면 코사인 법칙)으로 계산한다.
     * 부동소수 오차로 acos 인자가 [-1, 1] 을 벗어나 NaN 이 되는 것을 막으려 범위를 클램프한다.
     */
    private double haversineMeters(double lat1, double lng1, double lat2, double lng2) {
        double rLat1 = Math.toRadians(lat1);
        double rLat2 = Math.toRadians(lat2);
        double rLng1 = Math.toRadians(lng1);
        double rLng2 = Math.toRadians(lng2);
        double cos = Math.sin(rLat1) * Math.sin(rLat2)
                + Math.cos(rLat1) * Math.cos(rLat2) * Math.cos(rLng2 - rLng1);
        cos = Math.max(-1.0, Math.min(1.0, cos));
        return EARTH_RADIUS_METERS * Math.acos(cos);
    }
}
