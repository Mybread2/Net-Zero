package com.inha.netzero.domain.user.dto;

import java.time.Instant;
import java.util.List;

import com.inha.netzero.domain.user.entity.Dog;
import com.inha.netzero.domain.user.entity.User;

/**
 * 타인 공개 프로필 응답(2.5). 위치(lat/lng)는 포함하지 않으며,
 * 고스트모드 사용자라도 프로필 자체는 노출한다. online 은 최근 5분 활동 여부.
 */
public record UserProfileResponse(
        Long userId,
        String nickname,
        String profileImageUrl,
        List<DogResponse> dogs,
        boolean online) {

    private static final long ONLINE_WINDOW_SECONDS = 300L;

    public static UserProfileResponse from(User user) {
        List<DogResponse> dogs = user.getDogs().stream().map(DogResponse::from).toList();
        return new UserProfileResponse(
                user.getId(),
                user.getNickname(),
                resolveProfileImageUrl(user),
                dogs,
                isOnline(user));
    }

    private static boolean isOnline(User user) {
        Instant lastActiveAt = user.getLastActiveAt();
        return lastActiveAt != null
                && lastActiveAt.isAfter(Instant.now().minusSeconds(ONLINE_WINDOW_SECONDS));
    }

    /** 사용자 이미지가 없으면 첫 강아지 이미지로 폴백. */
    private static String resolveProfileImageUrl(User user) {
        if (user.getProfileImageUrl() != null) {
            return user.getProfileImageUrl();
        }
        List<Dog> dogs = user.getDogs();
        return dogs.isEmpty() ? null : dogs.get(0).getImageUrl();
    }
}
