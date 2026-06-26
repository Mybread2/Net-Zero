package com.inha.netzero.domain.walk.dto;

/**
 * 4.6 친구 목록 항목. { userId, nickname, profileImageUrl, online }.
 */
public record FriendResponse(

        Long userId,
        String nickname,
        String profileImageUrl,
        boolean online
) {
}
