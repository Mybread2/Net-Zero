package com.inha.netzero.domain.user.dto;

import java.time.Instant;
import java.util.List;

import com.inha.netzero.domain.user.entity.Dog;
import com.inha.netzero.domain.user.entity.Gender;
import com.inha.netzero.domain.user.entity.User;

/**
 * 본인 전체 정보 응답(2.1 / 2.2). hasDog 가 false 이면 dogs 는 빈 배열.
 * profileImageUrl 은 사용자 이미지가 없으면 첫 강아지 이미지로 폴백한다.
 */
public record UserMeResponse(
        Long id,
        String email,
        String nickname,
        Gender gender,
        boolean hasDog,
        boolean ghostMode,
        String profileImageUrl,
        Instant lastActiveAt,
        List<DogResponse> dogs) {

    public static UserMeResponse from(User user) {
        List<DogResponse> dogs = user.isHasDog()
                ? user.getDogs().stream().map(DogResponse::from).toList()
                : List.of();
        return new UserMeResponse(
                user.getId(),
                user.getEmail(),
                user.getNickname(),
                user.getGender(),
                user.isHasDog(),
                user.isGhostMode(),
                resolveProfileImageUrl(user),
                user.getLastActiveAt(),
                dogs);
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
