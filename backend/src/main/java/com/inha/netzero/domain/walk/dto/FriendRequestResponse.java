package com.inha.netzero.domain.walk.dto;

import com.inha.netzero.domain.walk.entity.FriendRequestStatus;

/**
 * 4.1 친구 요청 생성 / 4.2~4.3 수락·거절 응답. { requestId, status }.
 */
public record FriendRequestResponse(

        Long requestId,
        FriendRequestStatus status
) {
}
