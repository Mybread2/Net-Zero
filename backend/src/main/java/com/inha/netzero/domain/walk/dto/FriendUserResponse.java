package com.inha.netzero.domain.walk.dto;

/**
 * 요청 목록 항목에 들어가는 상대 사용자 요약. { userId, nickname, profileImageUrl }.
 */
public record FriendUserResponse(

        Long userId,
        String nickname,
        String profileImageUrl
) {
}
