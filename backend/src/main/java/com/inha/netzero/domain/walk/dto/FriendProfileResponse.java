package com.inha.netzero.domain.walk.dto;

import java.util.List;

/**
 * 4.7 친구 상세. §2.5 공개 프로필(닉네임·프로필이미지·강아지 요약) + online.
 */
public record FriendProfileResponse(

        Long userId,
        String nickname,
        String profileImageUrl,
        boolean online,
        List<FriendDogResponse> dogs
) {
}
